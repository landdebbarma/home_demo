// Minimal GitHub REST client for the content repository. Server-side only.
// Auth: a fine-grained token (GITHUB_TOKEN), or a GitHub App (GITHUB_APP_ID +
// GITHUB_PRIVATE_KEY + GITHUB_INSTALLATION_ID, or the GITHUB_APP_-prefixed names), whose short-lived
// installation tokens are minted and cached here.
import { createHash, createSign } from 'node:crypto'

const API = () => (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '')
const env = (...names) => names.map((n) => process.env[n]?.trim()).find(Boolean)
// GITHUB_REPO may be "owner/name", or just "name" with GITHUB_OWNER set separately.
const REPO = () => {
  const repo = env('GITHUB_REPO')
  const owner = env('GITHUB_OWNER')
  const r = repo && !repo.includes('/') && owner ? `${owner}/${repo}` : repo
  if (!r || !/^[\w.-]+\/[\w.-]+$/.test(r)) throw new GitHubError(500, 'GITHUB_REPO is not configured (set "owner/name", or GITHUB_OWNER + GITHUB_REPO).')
  return r
}
export const BRANCH = () => process.env.GITHUB_BRANCH || 'main'

export class GitHubError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

let cached = null // { token, expires }
async function token() {
  if (env('GITHUB_TOKEN')) return env('GITHUB_TOKEN')
  const appId = env('GITHUB_APP_ID')
  const rawKey = env('GITHUB_APP_PRIVATE_KEY', 'GITHUB_PRIVATE_KEY')
  const installation = env('GITHUB_APP_INSTALLATION_ID', 'GITHUB_INSTALLATION_ID')
  if (!appId || !rawKey || !installation) throw new GitHubError(500, 'GitHub credentials are not configured on the server (App ID, installation ID and private key).')
  if (cached && cached.expires - Date.now() > 5 * 60e3) return cached.token
  const now = Math.floor(Date.now() / 1000)
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iat: now - 60, exp: now + 540, iss: appId })}`
  // Env UIs often force the PEM onto one line: accept literal "\n" (and stray wrapping quotes). PKCS#1 or PKCS#8.
  const key = rawKey.replace(/^["']|["']$/g, '').replace(/\\r/g, '').replace(/\\n/g, '\n')
  let jwt
  try {
    jwt = `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(key, 'base64url')}`
  } catch {
    throw new GitHubError(500, 'The GitHub App private key could not be read. Paste the whole .pem, including the BEGIN/END lines, with line breaks written as \\n.')
  }
  const res = await fetch(`${API()}/app/installations/${installation}/access_tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/vnd.github+json', 'User-Agent': 'cornerstone-admin' },
  })
  if (!res.ok) throw new GitHubError(502, `GitHub App authentication failed (${res.status}).`)
  const data = await res.json()
  cached = { token: data.token, expires: Date.parse(data.expires_at) }
  return cached.token
}

/** Request against /repos/{owner}/{repo}{path}. Returns parsed JSON (or raw Response with { raw: true }). */
export async function gh(path, { method = 'GET', body, raw = false, accept = 'application/vnd.github+json' } = {}) {
  const res = await fetch(`${API()}/repos/${REPO()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await token()}`,
      Accept: accept,
      'User-Agent': 'cornerstone-admin',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (raw) return res
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new GitHubError(res.status, data?.message || `GitHub request failed (${res.status}).`)
  return data
}

/** Git's own blob id, so we know a file's SHA without another request. */
export const blobSha = (buf) => createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex')

/** Head commit of the content branch and its tree. */
export async function head() {
  const ref = await gh(`/git/ref/heads/${BRANCH()}`)
  const commit = await gh(`/git/commits/${ref.object.sha}`)
  return { commit: ref.object.sha, tree: commit.tree.sha }
}

/** JSON file at a given commit, with its blob SHA (null if missing). */
export async function readJson(path, ref) {
  const res = await gh(`/contents/${path}?ref=${ref}`, { raw: true })
  if (res.status === 404) return { sha: null, data: null }
  if (!res.ok) throw new GitHubError(res.status, `Could not read ${path} from GitHub (${res.status}).`)
  const meta = await res.json()
  // Files over 1 MB come back without inline content; fetch the blob instead.
  const content = meta.content ? meta.content : (await gh(`/git/blobs/${meta.sha}`)).content
  return { sha: meta.sha, data: JSON.parse(Buffer.from(content, 'base64').toString('utf8')) }
}

export const createBlob = async (buf) => (await gh('/git/blobs', { method: 'POST', body: { content: buf.toString('base64'), encoding: 'base64' } })).sha

/**
 * One atomic commit on top of `parent`. `files` maps path -> { content } | { sha } | null (delete).
 * The branch only moves if it still points at `parent` (no force), so concurrent saves can't clobber each other.
 */
export async function commitFiles({ parent, baseTree, files, message }) {
  const tree = Object.entries(files).map(([path, f]) =>
    f === null ? { path, mode: '100644', type: 'blob', sha: null } : { path, mode: '100644', type: 'blob', ...f },
  )
  const newTree = await gh('/git/trees', { method: 'POST', body: { base_tree: baseTree, tree } })
  const name = process.env.COMMIT_AUTHOR_NAME
  const email = process.env.COMMIT_AUTHOR_EMAIL
  const author = name && email ? { name, email, date: new Date().toISOString() } : undefined
  const commit = await gh('/git/commits', { method: 'POST', body: { message, tree: newTree.sha, parents: [parent], ...(author ? { author } : {}) } })
  try {
    await gh(`/git/refs/heads/${BRANCH()}`, { method: 'PATCH', body: { sha: commit.sha, force: false } })
  } catch (e) {
    if (e.status === 422 || e.status === 409) throw new GitHubError(409, 'The content changed on GitHub while saving. Nothing was saved — reload and try again.')
    throw e
  }
  return commit.sha
}

/** Vercel reports deployments to GitHub. Map them to: waiting | building | success | failure. */
export async function deploymentState(sha) {
  const deployments = await gh(`/deployments?sha=${sha}&per_page=10`)
  const prod = deployments.find((d) => /prod/i.test(d.environment)) || deployments[0]
  if (prod) {
    const [latest] = await gh(`/deployments/${prod.id}/statuses?per_page=1`)
    const s = latest?.state
    if (s === 'success') return { state: 'success', url: latest.environment_url || latest.target_url || null }
    if (s === 'failure' || s === 'error') return { state: 'failure', url: latest.target_url || null }
    return { state: 'building', url: latest?.target_url || null }
  }
  // Fallback: commit statuses posted by Vercel.
  const combined = await gh(`/commits/${sha}/status`)
  const vercel = combined.statuses?.find((s) => /vercel/i.test(s.context))
  if (!vercel) return { state: 'waiting', url: null }
  const map = { success: 'success', failure: 'failure', error: 'failure', pending: 'building' }
  return { state: map[vercel.state] || 'building', url: vercel.target_url || null }
}
