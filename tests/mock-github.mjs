// In-memory stand-in for the slice of the GitHub REST API the admin uses: blobs, trees, commits,
// fast-forward-only ref updates, contents (JSON + raw), deployments, and GitHub App token minting.
import { createServer } from 'node:http'
import { createHash, createVerify } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const sha1 = (s) => createHash('sha1').update(s).digest('hex')
const blobSha = (buf) => createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex')

export async function startMockGitHub({ repo = 'owner/site', branch = 'main', appPublicKey, installationId = '42' } = {}) {
  const blobs = new Map() // sha -> Buffer
  const trees = new Map() // sha -> Map(path -> blobSha)
  const commits = new Map() // sha -> { tree, parents, message, author }
  const refs = { [branch]: null }
  const tokens = new Set(['static-test-token'])
  const deployed = new Set()

  const putBlob = (buf) => { const s = blobSha(buf); blobs.set(s, buf); return s }
  const putTree = (map) => { const s = sha1('tree' + JSON.stringify([...map].sort())); trees.set(s, map); return s }
  const putCommit = (c) => { const s = sha1('commit' + JSON.stringify(c) + Math.random()); commits.set(s, c); return s }

  // Seed with the repository's real content + images.
  const seed = new Map()
  for (const f of ['content/projects.json', 'content/site-content.json']) seed.set(f, putBlob(readFileSync(f)))
  for (const f of readdirSync('public/uploads', { recursive: true })) {
    const p = join('public/uploads', f).replace(/\\/g, '/')
    if (p.endsWith('.webp')) seed.set(p, putBlob(readFileSync(p)))
  }
  refs[branch] = putCommit({ tree: putTree(seed), parents: [], message: 'initial' })

  const treeAt = (ref) => {
    const c = commits.get(refs[ref] ? refs[ref] : ref)
    return c ? trees.get(c.tree) : null
  }

  /** Simulate someone else pushing a change (for conflict tests). */
  function pushDirect(files, message = 'external edit') {
    const map = new Map(treeAt(branch))
    for (const [p, content] of Object.entries(files)) {
      if (content === null) map.delete(p)
      else map.set(p, putBlob(Buffer.from(content)))
    }
    refs[branch] = putCommit({ tree: putTree(map), parents: [refs[branch]], message })
  }

  const server = createServer(async (req, res) => {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null
    const url = new URL(req.url, 'http://x')
    const send = (status, data, type = 'application/json') => {
      res.writeHead(status, { 'Content-Type': type })
      res.end(type === 'application/json' ? JSON.stringify(data) : data)
    }
    const auth = (req.headers.authorization || '').replace(/^Bearer /, '')

    // GitHub App: exchange a signed JWT for an installation token.
    const inst = url.pathname.match(/^\/app\/installations\/(\w+)\/access_tokens$/)
    if (inst && req.method === 'POST') {
      const [h, p, sig] = auth.split('.')
      const ok = appPublicKey && createVerify('RSA-SHA256').update(`${h}.${p}`).verify(appPublicKey, Buffer.from(sig || '', 'base64url'))
      const claims = ok ? JSON.parse(Buffer.from(p, 'base64url')) : null
      if (!ok || inst[1] !== installationId || claims.exp < Date.now() / 1000) return send(401, { message: 'Bad credentials' })
      const t = `inst-${Math.random().toString(36).slice(2)}`
      tokens.add(t)
      return send(201, { token: t, expires_at: new Date(Date.now() + 3600e3).toISOString() })
    }

    if (!tokens.has(auth)) return send(401, { message: 'Bad credentials' })
    const prefix = `/repos/${repo}`
    if (!url.pathname.startsWith(prefix)) return send(404, { message: 'Not Found' })
    const path = url.pathname.slice(prefix.length)
    let m

    if (req.method === 'GET' && (m = path.match(/^\/git\/ref\/heads\/(.+)$/))) {
      return refs[m[1]] ? send(200, { object: { sha: refs[m[1]] } }) : send(404, { message: 'Not Found' })
    }
    if (req.method === 'GET' && (m = path.match(/^\/git\/commits\/(\w+)$/))) {
      const c = commits.get(m[1])
      return c ? send(200, { sha: m[1], tree: { sha: c.tree }, parents: c.parents.map((sha) => ({ sha })), message: c.message, author: c.author }) : send(404, { message: 'Not Found' })
    }
    if (req.method === 'GET' && (m = path.match(/^\/contents\/(.+)$/))) {
      const tree = treeAt(url.searchParams.get('ref') || branch)
      const s = tree?.get(decodeURIComponent(m[1]))
      if (!s) return send(404, { message: 'Not Found' })
      if ((req.headers.accept || '').includes('raw')) return send(200, blobs.get(s), 'application/octet-stream')
      return send(200, { sha: s, content: blobs.get(s).toString('base64'), encoding: 'base64' })
    }
    if (req.method === 'GET' && (m = path.match(/^\/git\/blobs\/(\w+)$/))) {
      return blobs.has(m[1]) ? send(200, { content: blobs.get(m[1]).toString('base64'), encoding: 'base64' }) : send(404, { message: 'Not Found' })
    }
    if (req.method === 'POST' && path === '/git/blobs') return send(201, { sha: putBlob(Buffer.from(body.content, body.encoding)) })
    if (req.method === 'POST' && path === '/git/trees') {
      const map = new Map(trees.get(body.base_tree) || [])
      for (const e of body.tree) {
        if (e.sha === null) map.delete(e.path)
        else if (e.content !== undefined) map.set(e.path, putBlob(Buffer.from(e.content)))
        else if (blobs.has(e.sha)) map.set(e.path, e.sha)
        else return send(422, { message: `Invalid sha for ${e.path}` })
      }
      return send(201, { sha: putTree(map) })
    }
    if (req.method === 'POST' && path === '/git/commits') {
      if (!trees.has(body.tree)) return send(422, { message: 'Tree not found' })
      return send(201, { sha: putCommit({ tree: body.tree, parents: body.parents, message: body.message, author: body.author }) })
    }
    if (req.method === 'PATCH' && (m = path.match(/^\/git\/refs\/heads\/(.+)$/))) {
      const c = commits.get(body.sha)
      if (!c) return send(422, { message: 'Object does not exist' })
      if (!body.force && !c.parents.includes(refs[m[1]])) return send(422, { message: 'Update is not a fast forward' })
      refs[m[1]] = body.sha
      deployed.add(body.sha) // pretend Vercel deployed it
      return send(200, { object: { sha: body.sha } })
    }
    if (req.method === 'GET' && path === '/deployments') {
      const s = url.searchParams.get('sha')
      return send(200, deployed.has(s) ? [{ id: 1, environment: 'Production', sha: s }] : [])
    }
    if (req.method === 'GET' && path === '/deployments/1/statuses') return send(200, [{ state: 'success', environment_url: 'https://example.test' }])
    if (req.method === 'GET' && (m = path.match(/^\/commits\/(\w+)\/status$/))) return send(200, { state: 'pending', statuses: [] })
    if (req.method === 'GET' && (m = path.match(/^\/compare\/(\w+)\.\.\.(\w+)$/))) {
      if (m[1] === m[2]) return send(200, { status: 'identical' })
      const seen = new Set()
      const walk = (s) => { if (!s || seen.has(s)) return false; seen.add(s); return s === m[1] || (commits.get(s)?.parents || []).some(walk) }
      return send(200, { status: walk(m[2]) ? 'ahead' : 'diverged' })
    }
    return send(404, { message: `Mock: no route for ${req.method} ${path}` })
  })

  await new Promise((r) => server.listen(0, r))
  const api = `http://localhost:${server.address().port}`
  return {
    api,
    head: () => refs[branch],
    file: (p, ref = branch) => { const s = treeAt(ref)?.get(p); return s ? blobs.get(s) : null },
    files: (ref = branch) => [...treeAt(ref).keys()],
    commit: (sha) => commits.get(sha),
    pushDirect,
    close: () => new Promise((r) => server.close(r)),
  }
}
