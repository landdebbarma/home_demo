// End-to-end acceptance test for the Git-backed admin, against an in-memory GitHub mock.
// Covers: auth (GitHub App token minting included), uploads, atomic commits, conflict detection,
// image cleanup, publishing, deploy status, and that the public build only contains published work.
// Run: npm run test:e2e
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { generateKeyPairSync } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { startMockGitHub } from './mock-github.mjs'

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const gh = await startMockGitHub({ appPublicKey: publicKey.export({ type: 'spki', format: 'pem' }) })

const { hashPassword } = await import('../server/auth.js')
const PASSWORD = 'acceptance-test-password'
Object.assign(process.env, {
  GITHUB_API_URL: gh.api,
  // Mirrors the production Vercel setup: separate owner/repo, GITHUB_INSTALLATION_ID / GITHUB_PRIVATE_KEY,
  // and a PKCS#1 ("BEGIN RSA PRIVATE KEY") key pasted on one line with literal \n.
  GITHUB_OWNER: 'owner',
  GITHUB_REPO: 'site',
  GITHUB_APP_ID: '1234',
  GITHUB_INSTALLATION_ID: '42',
  GITHUB_PRIVATE_KEY: privateKey.export({ type: 'pkcs1', format: 'pem' }).trim().replace(/\n/g, '\\n'),
  ADMIN_EMAIL: 'admin@example.test',
  ADMIN_PASSWORD_HASH: await hashPassword(PASSWORD),
  SESSION_SECRET: 'x'.repeat(48),
})
delete process.env.GITHUB_TOKEN
const { handle } = await import('../api/admin.js')

let cookie = ''
async function call(method, route, { json, form, auth = true, headers = {} } = {}) {
  const h = new Headers({ host: 'localhost', ...headers })
  if (auth && cookie) h.set('cookie', cookie)
  let body
  if (json !== undefined) { h.set('content-type', 'application/json'); body = JSON.stringify(json) }
  if (form) body = form
  const res = await handle(new Request(`http://localhost/api/admin/${route}`, { method, headers: h, body }))
  const set = res.headers.get('set-cookie')
  if (set) cookie = set.split(';')[0]
  const type = res.headers.get('content-type') || ''
  return { status: res.status, data: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()), headers: res.headers }
}
const png = (color, w = 1800, h = 1200) => sharp({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer()
async function upload(buf, folder, name = 'photo.png', type = 'image/png') {
  const form = new FormData()
  form.append('file', new File([buf], name, { type }))
  form.append('folder', folder)
  return call('POST', 'upload', { form })
}
const repoJson = (p) => JSON.parse(gh.file(p).toString())

let n = 0
const step = async (name, fn) => { await fn(); n++; console.log(`  ✓ ${name}`) }
let content, base

try {
  await step('admin routes reject requests without a session', async () => {
    for (const [m, r] of [['GET', 'content'], ['POST', 'commit'], ['POST', 'upload'], ['GET', 'file?p=x'], ['GET', 'deploy?sha=x']]) {
      assert.equal((await call(m, r, { auth: false })).status, 401, `${m} ${r}`)
    }
  })

  await step('wrong password is refused; a forged cookie is refused', async () => {
    assert.equal((await call('POST', 'login', { json: { email: 'admin@example.test', password: 'nope' } })).status, 401)
    assert.equal((await call('GET', 'content', { headers: { cookie: 'tca_session=eyJleHAiOjk5OTk5OTk5OTk5OTl9.forged' }, auth: false })).status, 401)
  })

  await step('1. administrator logs in (HttpOnly, SameSite=Strict signed session)', async () => {
    const r = await call('POST', 'login', { json: { email: 'Admin@Example.test', password: PASSWORD } })
    assert.equal(r.status, 200)
    assert.match(r.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/)
    assert.equal((await call('GET', 'me')).data.authed, true)
  })

  await step('content is read from GitHub (GitHub App token minted server-side)', async () => {
    const r = await call('GET', 'content')
    assert.equal(r.status, 200, JSON.stringify(r.data))
    assert.equal(r.data.projects.projects.length, 3)
    assert.equal(r.data.head, gh.head())
    content = r.data
    base = r.data.base
  })

  await step('cross-origin writes are rejected', async () => {
    assert.equal((await call('POST', 'commit', { json: {}, headers: { origin: 'https://evil.example' } })).status, 403)
  })

  await step('non-images and unsupported formats are rejected', async () => {
    assert.equal((await upload(Buffer.from('<svg onload=alert(1)>'), 'projects/new-home', 'x.png')).status, 415)
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).gif().toBuffer()
    assert.equal((await upload(gif, 'projects/new-home', 'x.gif', 'image/gif')).status, 415)
    assert.equal((await upload(await png('#fff'), '../../etc')).status, 400)
  })

  let cover, g1, g2, g3, uploadedFiles = []
  await step('3–4. cover and multiple gallery images upload as WebP blobs — nothing committed yet', async () => {
    const headBefore = gh.head()
    const images = await Promise.all([png('#b9a58c', 3000, 2000), png('#6b5646'), png('#dccfbc', 1200, 1500), png('#2a2420')])
    const results = await Promise.all(images.map((b) => upload(b, 'projects/new-home')))
    for (const r of results) assert.equal(r.status, 200, JSON.stringify(r.data))
    ;[cover, g1, g2, g3] = results.map((r) => r.data.image)
    uploadedFiles = results.flatMap((r) => r.data.files)
    assert.deepEqual(cover.widths, [480, 960, 1600, 2400])
    assert.equal(cover.w, 3000)
    assert.match(cover.path, /^\/uploads\/projects\/new-home\/[a-f0-9]{12}$/)
    assert.equal(gh.head(), headBefore, 'upload must not commit')
  })

  await step('re-uploading the same picture yields the same id (no duplicates)', async () => {
    const again = await upload(await png('#6b5646'), 'projects/new-home')
    assert.equal(again.data.image.id, g1.id)
  })

  const pending = () => uploadedFiles
  const save = (body) => call('POST', 'commit', { json: { base, uploads: pending(), ...body } })
  const project = {
    id: 'a1b2c3d4e5f6', slug: 'new-home', title: 'New Home', category: 'Residential Architecture', location: 'Bengaluru', year: '2025',
    summary: 'A calm family home.', body: 'One.\n\nTwo.', status: 'draft', featured: false, order: 9,
    cover: { ...cover, alt: 'Courtyard at dusk' }, gallery: [g1, g2, g3], meta: [{ label: 'Area', value: '3,200 sq ft' }],
    createdAt: Date.now(), updatedAt: Date.now(),
  }
  let projects = content.projects.projects

  await step('2 & 6. creating the project commits JSON + all images in ONE commit', async () => {
    const before = gh.head()
    const r = await save({ message: 'Create draft "New Home"', projects: { projects: [...projects, project] } })
    assert.equal(r.status, 200, JSON.stringify(r.data))
    const c = gh.commit(gh.head())
    assert.deepEqual(c.parents, [before], 'exactly one new commit')
    assert.match(c.message, /Create draft "New Home"/)
    for (const f of uploadedFiles) assert.ok(gh.files().includes(f.path), `missing ${f.path}`)
    assert.equal(repoJson('content/projects.json').projects.find((p) => p.id === project.id).status, 'draft')
    base = r.data.base
    projects = r.data.projects.projects
  })

  await step('server-side validation rejects bad content (publish without cover, bad slug)', async () => {
    const noCover = { ...project, id: 'ffffffffffff', slug: 'x', cover: null, gallery: [], status: 'published' }
    assert.equal((await save({ projects: { projects: [...projects, noCover] } })).status, 422)
    assert.equal((await save({ projects: { projects: projects.map((p) => (p.id === project.id ? { ...p, slug: '../evil' } : p)) } })).status, 422)
  })

  await step('an image that was never uploaded cannot be referenced', async () => {
    const fake = { ...g1, id: 'abcdefabcdef', path: '/uploads/projects/new-home/abcdefabcdef' }
    const r = await call('POST', 'commit', { json: { base, uploads: [], projects: { projects: projects.map((p) => (p.id === project.id ? { ...p, gallery: [...p.gallery, fake] } : p)) } } })
    assert.equal(r.status, 422)
  })

  await step('5. reordering, captions and details are saved', async () => {
    const next = projects.map((p) => (p.id === project.id ? { ...p, gallery: [{ ...g3, caption: 'Living room' }, g1, g2], title: 'New Home II' } : p))
    const r = await save({ message: 'Update', projects: { projects: next } })
    assert.equal(r.status, 200, JSON.stringify(r.data))
    const saved = repoJson('content/projects.json').projects.find((p) => p.id === project.id)
    assert.deepEqual(saved.gallery.map((g) => g.id), [g3.id, g1.id, g2.id])
    assert.equal(saved.gallery[0].caption, 'Living room')
    assert.equal(saved.title, 'New Home II')
    base = r.data.base
    projects = r.data.projects.projects
  })

  await step('7. publishing changes the status in the repository', async () => {
    const r = await save({ message: 'Publish', projects: { projects: projects.map((p) => (p.id === project.id ? { ...p, status: 'published' } : p)) } })
    assert.equal(r.status, 200)
    assert.equal(repoJson('content/projects.json').projects.find((p) => p.id === project.id).status, 'published')
    base = r.data.base
    projects = r.data.projects.projects
  })

  await step('deploy status: reported from GitHub, and "live" only when the site serves a build containing the commit', async () => {
    const sha = gh.head()
    assert.equal((await call('GET', `deploy?sha=${sha}`)).data.state, 'success')
    assert.equal((await call('GET', `deploy?sha=${sha}`)).data.live, false, 'no live build reported yet')
    const older = gh.commit(sha).parents[0]
    assert.equal((await call('GET', `deploy?sha=${sha}&live=${older}`)).data.live, false, 'an older build does not contain it')
    assert.equal((await call('GET', `deploy?sha=${older}&live=${sha}`)).data.live, true, 'a newer build contains older commits')
  })

  await step('committed images can be previewed through the admin before deploy', async () => {
    const r = await call('GET', `file?p=${encodeURIComponent(`public${g1.path}-480.webp`)}`)
    assert.equal(r.status, 200)
    assert.equal(r.headers.get('content-type'), 'image/webp')
    assert.equal((await sharp(r.data).metadata()).format, 'webp')
    assert.equal((await call('GET', 'file?p=content/projects.json')).status, 400, 'only image paths are proxied')
  })

  await step('a stale save is refused (409) and does not overwrite the other edit', async () => {
    gh.pushDirect({ 'content/projects.json': JSON.stringify({ projects: projects.map((p) => (p.id === project.id ? { ...p, year: '2026' } : p)) }) })
    const headAfterExternal = gh.head()
    const r = await save({ message: 'Stale', projects: { projects: projects.map((p) => (p.id === project.id ? { ...p, location: 'Mysuru' } : p)) } })
    assert.equal(r.status, 409)
    assert.ok(r.data.current.base.projects, 'returns the latest version for recovery')
    assert.equal(gh.head(), headAfterExternal, 'branch untouched')
    assert.equal(repoJson('content/projects.json').projects.find((p) => p.id === project.id).year, '2026')
    base = r.data.current.base
    projects = r.data.current.projects.projects
  })

  await step('11. deleting a gallery image removes its files in the same commit', async () => {
    const r = await save({ message: 'Remove image', projects: { projects: projects.map((p) => (p.id === project.id ? { ...p, gallery: p.gallery.filter((g) => g.id !== g2.id) } : p)) } })
    assert.equal(r.status, 200, JSON.stringify(r.data))
    assert.ok(!gh.files().some((f) => f.includes(g2.id)), 'orphaned files left behind')
    base = r.data.base
    projects = r.data.projects.projects
  })

  await step('replacing the cover removes the old cover files', async () => {
    const nc = await upload(await png('#8c9a72'), 'projects/new-home')
    uploadedFiles = nc.data.files
    const r = await save({ message: 'Replace cover', projects: { projects: projects.map((p) => (p.id === project.id ? { ...p, cover: nc.data.image } : p)) } })
    assert.equal(r.status, 200)
    assert.ok(!gh.files().some((f) => f.includes(cover.id)))
    assert.ok(gh.files().some((f) => f.includes(nc.data.image.id)))
    base = r.data.base
    projects = r.data.projects.projects
  })

  await step('website content edits are validated and committed', async () => {
    const site = content.site
    assert.equal((await save({ site: { ...site, contact: { ...site.contact, email: 'not-an-email' } } })).status, 422)
    const r = await save({ message: 'Contact', site: { ...site, contact: { ...site.contact, phone: '+91 00000 00000' } } })
    assert.equal(r.status, 200, JSON.stringify(r.data))
    assert.equal(repoJson('content/site-content.json').contact.phone, '+91 00000 00000')
    base = r.data.base
  })

  await step('8–10. the public build contains published projects only', async () => {
    // Add a draft that must NOT ship.
    const draft = { ...project, id: 'dddddddddddd', slug: 'secret-draft', title: 'Secret Draft Project', status: 'draft', cover: null, gallery: [] }
    const r = await save({ message: 'Draft', projects: { projects: [...projects, draft] } })
    assert.equal(r.status, 200)
    base = r.data.base
    projects = r.data.projects.projects
    const tmp = mkdtempSync(join(tmpdir(), 'tca-build-'))
    try {
      mkdirSync(join(tmp, 'content'))
      for (const f of ['projects.json', 'site-content.json']) writeFileSync(join(tmp, 'content', f), gh.file(`content/${f}`))
      execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', join(tmp, 'dist'), '--emptyOutDir', '--logLevel', 'error'], { env: { ...process.env, CONTENT_DIR: join(tmp, 'content') }, stdio: 'pipe' })
      assert.ok(existsSync(join(tmp, 'dist/projects/new-home/index.html')), 'published project page missing')
      assert.match(readFileSync(join(tmp, 'dist/projects/new-home/index.html'), 'utf8'), /<title>New Home II — The Cornerstone Architect<\/title>/)
      assert.ok(!existsSync(join(tmp, 'dist/projects/secret-draft')), 'draft got a page')
      const js = readdirSync(join(tmp, 'dist/assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(tmp, 'dist/assets', f), 'utf8')).join('')
      assert.ok(js.includes('New Home II') && !js.includes('Secret Draft Project'), 'draft leaked into the public bundle')
      assert.ok(readFileSync(join(tmp, 'dist/sitemap.xml'), 'utf8').includes('/projects/new-home'))
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  await step('12–13. deleting the project removes its entry and every one of its files', async () => {
    const mine = projects.find((p) => p.id === project.id)
    const r = await save({ message: 'Delete', projects: { projects: projects.filter((p) => p.id !== project.id) } })
    assert.equal(r.status, 200)
    assert.ok(!repoJson('content/projects.json').projects.some((p) => p.id === project.id))
    for (const img of [mine.cover, ...mine.gallery]) assert.ok(!gh.files().some((f) => f.includes(img.id)), `orphan ${img.id}`)
    // Other projects' images are untouched.
    assert.ok(gh.files().filter((f) => f.startsWith('public/uploads/projects/sample-project-01/')).length > 0)
    base = r.data.base
  })

  await step('changing the password hash signs out existing sessions', async () => {
    const old = process.env.ADMIN_PASSWORD_HASH
    process.env.ADMIN_PASSWORD_HASH = await hashPassword('a-brand-new-password')
    assert.equal((await call('GET', 'content')).status, 401)
    process.env.ADMIN_PASSWORD_HASH = old
    assert.equal((await call('GET', 'content')).status, 200)
  })

  await step('logout clears the session cookie', async () => {
    const r = await call('POST', 'logout')
    assert.match(r.headers.get('set-cookie'), /Max-Age=0/)
    assert.equal((await call('GET', 'content')).status, 401)
  })

  await step('login is rate limited after repeated failures', async () => {
    let last
    for (let i = 0; i < 6; i++) last = await call('POST', 'login', { json: { email: 'admin@example.test', password: `wrong-${i}` }, headers: { 'x-real-ip': '203.0.113.9' } })
    assert.equal(last.status, 429)
  })

  console.log(`\nAll ${n} checks passed.`)
} catch (e) {
  console.error('\n✗ FAILED:', e.message)
  process.exitCode = 1
} finally {
  await gh.close()
}
