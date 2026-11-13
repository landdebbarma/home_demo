// Admin API — a single Vercel Function (Web Request/Response). vercel.json rewrites
// /api/admin/<route> to /api/admin?route=<route>. GitHub is the only store: every read comes
// from the content branch, every write is one atomic commit that Vercel then deploys.
import * as auth from '../server/auth.js'
import { BRANCH, blobSha, commitFiles, deploymentState, gh, GitHubError, head, readJson } from '../server/github.js'
import { cleanProjects, cleanSite, contactValid, PROJECTS_FILE, referencedFiles, SITE_FILE, ValidationError } from '../server/content.js'
import { ImageError, processUpload } from '../server/images.js'

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } })

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

async function body(request) {
  try {
    return await request.json()
  } catch {
    throw new HttpError(400, 'Invalid request body.')
  }
}

const clientIp = (r) => r.headers.get('x-real-ip') || (r.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local'

const routes = {
  // When unconfigured, say which variables are wrong (names and reasons only) so setup problems are diagnosable.
  'GET me': (req) => ({ authed: auth.isAuthed(req), configured: auth.configured(), ...(auth.configured() ? {} : { issues: auth.configIssues() }) }),

  'POST login': async (req) => {
    if (!auth.configured()) throw new HttpError(503, 'The admin account is not configured on the server (see README).')
    const ip = clientIp(req)
    const wait = auth.blockedFor(ip)
    if (wait) throw new HttpError(429, `Too many failed attempts. Try again in ${Math.ceil(wait / 60)} minute(s).`)
    const { email, password } = await body(req)
    if (!(await auth.checkCredentials(email, password))) {
      auth.recordFailure(ip)
      await new Promise((r) => setTimeout(r, 400))
      throw new HttpError(401, 'Email or password is incorrect.')
    }
    auth.recordSuccess(ip)
    return json(200, { ok: true }, { 'Set-Cookie': auth.sessionCookie() })
  },

  'POST logout': () => json(200, { ok: true }, { 'Set-Cookie': auth.clearCookie() }),

  /** Canonical content straight from GitHub, plus the blob SHAs used for conflict detection. */
  'GET content': async () => {
    const h = await head()
    const [p, s] = await Promise.all([readJson(PROJECTS_FILE, h.commit), readJson(SITE_FILE, h.commit)])
    return { projects: p.data ?? { projects: [] }, site: s.data, base: { projects: p.sha, site: s.sha }, head: h.commit, branch: BRANCH() }
  },

  /** One image per request (keeps under the function body limit). Creates blobs only — no commit. */
  'POST upload': async (req) => {
    const form = await req.formData().catch(() => {
      throw new HttpError(400, 'Expected a multipart upload.')
    })
    const file = form.get('file')
    if (!file || typeof file === 'string') throw new HttpError(400, 'No file received.')
    return processUpload(Buffer.from(await file.arrayBuffer()), file.name || 'image', String(form.get('folder') || ''))
  },

  /**
   * Save = one commit. Body: { message, base: { projects, site }, projects?, site?, uploads: [{ path, sha }] }
   * - rejects with 409 if a file being changed is no longer at the SHA the editor started from
   * - adds only uploaded files the new content references; deletes files nothing references any more
   */
  'POST commit': async (req) => {
    const b = await body(req)
    if (b.projects === undefined && b.site === undefined) throw new HttpError(400, 'Nothing to save.')
    const h = await head()
    const [curP, curS] = await Promise.all([readJson(PROJECTS_FILE, h.commit), readJson(SITE_FILE, h.commit)])
    const conflict = () => {
      throw new HttpError(409, 'Someone else changed this content since you opened it. Your edits are kept here — reload to see the latest version, then re-apply them.', {
        current: { projects: curP.data, site: curS.data, base: { projects: curP.sha, site: curS.sha }, head: h.commit },
      })
    }
    let nextP = curP.data ?? { projects: [] }
    let nextS = curS.data
    const files = {}
    if (b.projects !== undefined) {
      if ((b.base?.projects ?? null) !== curP.sha) conflict()
      nextP = cleanProjects(b.projects)
      files[PROJECTS_FILE] = { content: JSON.stringify(nextP, null, 2) + '\n' }
    }
    if (b.site !== undefined) {
      if ((b.base?.site ?? null) !== curS.sha) conflict()
      nextS = cleanSite(b.site)
      if (!contactValid(nextS)) throw new HttpError(422, 'Enter a valid contact email address.')
      files[SITE_FILE] = { content: JSON.stringify(nextS, null, 2) + '\n' }
    }

    const before = referencedFiles(curP.data, curS.data)
    const after = referencedFiles(nextP, nextS)
    const uploads = new Map(
      (Array.isArray(b.uploads) ? b.uploads : [])
        .filter((u) => typeof u?.path === 'string' && /^[a-f0-9]{40}$/.test(u?.sha))
        .map((u) => [u.path, u.sha]),
    )
    for (const f of after) {
      if (before.has(f)) continue
      if (!uploads.has(f)) throw new HttpError(422, 'An image in this change was never uploaded. Remove it and add it again.')
      files[f] = { sha: uploads.get(f) }
    }
    for (const f of before) if (!after.has(f)) files[f] = null

    const message = String(b.message || 'Update website content').slice(0, 200)
    const commit = await commitFiles({ parent: h.commit, baseTree: h.tree, files, message: `${message}\n\nVia the website admin.` })
    const sha = (f, cur) => (files[f] ? blobSha(Buffer.from(files[f].content)) : cur)
    return { commit, projects: nextP, site: nextS, base: { projects: sha(PROJECTS_FILE, curP.sha), site: sha(SITE_FILE, curS.sha) } }
  },

  /**
   * Deploy status of a saved commit. `live` is the commit the public site reports serving (version.json):
   * the save is live if that's the same commit or a later one that contains it.
   */
  'GET deploy': async (req) => {
    const q = new URL(req.url).searchParams
    const sha = q.get('sha') || ''
    const live = q.get('live') || ''
    if (!/^[a-f0-9]{40}$/.test(sha) || (live && !/^[a-f0-9]{40}$/.test(live))) throw new HttpError(400, 'Invalid commit.')
    const state = await deploymentState(sha)
    let included = live === sha
    if (live && !included) {
      const cmp = await gh(`/compare/${sha}...${live}`).catch(() => null)
      included = cmp?.status === 'ahead' || cmp?.status === 'identical'
    }
    return { ...state, live: included }
  },

  /** Committed images straight from GitHub, so the admin can show them before they're deployed. */
  'GET file': async (req) => {
    const p = new URL(req.url).searchParams.get('p') || ''
    if (!/^public\/uploads\/(projects\/[a-z0-9-]{1,80}|site)\/[a-f0-9]{12}-\d{2,4}\.webp$/.test(p)) throw new HttpError(400, 'Invalid file.')
    const res = await gh(`/contents/${p}?ref=${BRANCH()}`, { raw: true, accept: 'application/vnd.github.raw' })
    if (!res.ok) throw new HttpError(res.status === 404 ? 404 : 502, 'Image not found.')
    return new Response(res.body, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=3600' } })
  },
}

const PUBLIC = new Set(['GET me', 'POST login', 'POST logout'])

export async function handle(request) {
  const url = new URL(request.url)
  const route = url.searchParams.get('route') || url.pathname.replace(/^\/api\/admin\/?/, '')
  const key = `${request.method} ${route}`
  try {
    const fn = routes[key]
    if (!fn) throw new HttpError(404, 'Not found.')
    if (request.method !== 'GET') {
      // Defence in depth on top of SameSite=Strict cookies: refuse cross-origin writes.
      const origin = request.headers.get('origin')
      if (origin && new URL(origin).host !== (request.headers.get('x-forwarded-host') || request.headers.get('host'))) throw new HttpError(403, 'Cross-origin request rejected.')
    }
    if (!PUBLIC.has(key) && !auth.isAuthed(request)) throw new HttpError(401, 'Please sign in.')
    const result = await fn(request)
    return result instanceof Response ? result : json(200, result)
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.message, ...e.extra })
    if (e instanceof ValidationError || e instanceof ImageError) return json(e.status, { error: e.message })
    if (e instanceof GitHubError) {
      console.error('[github]', e.status, e.message)
      return json(e.status === 409 ? 409 : 502, { error: e.status === 409 ? e.message : `GitHub error: ${e.message}` })
    }
    console.error(e)
    return json(500, { error: 'Something went wrong on the server.' })
  }
}

export const GET = handle
export const POST = handle
