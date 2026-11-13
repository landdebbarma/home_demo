// End-to-end acceptance test for the admin workflow (API level).
// Starts an isolated server on a temporary data directory, runs the full workflow,
// restarts the server and checks that everything persisted. Run: npm run test:e2e
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import sharp from 'sharp'

const PORT = 4399
const BASE = `http://localhost:${PORT}`
const DATA = mkdtempSync(join(tmpdir(), 'tca-e2e-'))
const ADMIN = { email: 'admin@example.test', password: 'e2e-test-password-123' }
let server
let cookie = ''

function start() {
  server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA, ADMIN_EMAIL: ADMIN.email, ADMIN_PASSWORD: ADMIN.password, SITE_URL: BASE },
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  return new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => String(d).includes('[server]') && resolve())
    server.on('exit', (c) => reject(new Error(`server exited (${c})`)))
  })
}
const stop = () => new Promise((r) => { server.removeAllListeners('exit'); server.on('exit', r); server.kill() })

async function call(method, path, { json, files, auth = true, headers = {} } = {}) {
  const h = { ...headers }
  if (auth && cookie) h.cookie = cookie
  let body
  if (json !== undefined) { h['content-type'] = 'application/json'; body = JSON.stringify(json) }
  if (files) { body = new FormData(); for (const f of files) body.append('files', f) }
  const res = await fetch(BASE + path, { method, headers: h, body })
  const set = res.headers.get('set-cookie')
  if (set) cookie = set.split(';')[0]
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data }
}

const image = async (name, color, w = 1800, h = 1200, format = 'jpeg') =>
  new File([await sharp({ create: { width: w, height: h, channels: 3, background: color } })[format]().toBuffer()], name, { type: `image/${format}` })

const steps = []
const step = async (name, fn) => { await fn(); steps.push(name); console.log(`  ✓ ${name}`) }

try {
  console.log('Starting isolated server…')
  await start()

  await step('admin APIs reject unauthenticated requests', async () => {
    assert.equal((await call('GET', '/api/admin/projects', { auth: false })).status, 401)
    assert.equal((await call('POST', '/api/admin/projects', { auth: false, json: { title: 'x' } })).status, 401)
    assert.equal((await call('DELETE', '/api/admin/projects/1', { auth: false })).status, 401)
  })

  await step('wrong password is refused', async () => {
    const r = await call('POST', '/api/admin/login', { json: { email: ADMIN.email, password: 'nope-nope-nope' } })
    assert.equal(r.status, 401)
    assert.equal(cookie, '')
  })

  await step('1. administrator logs in (HttpOnly, SameSite=Strict session cookie)', async () => {
    const res = await fetch(BASE + '/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ADMIN) })
    assert.equal(res.status, 200)
    const set = res.headers.get('set-cookie')
    assert.match(set, /HttpOnly/)
    assert.match(set, /SameSite=Strict/)
    cookie = set.split(';')[0]
    assert.equal((await call('GET', '/api/admin/me')).data.authed, true)
  })

  await step('cross-origin writes are rejected', async () => {
    const r = await call('POST', '/api/admin/projects', { json: { title: 'x' }, headers: { origin: 'https://evil.example' } })
    assert.equal(r.status, 403)
  })

  let id
  await step('2. administrator creates a new project (starts as draft)', async () => {
    const r = await call('POST', '/api/admin/projects', { json: { title: 'Lakeside Residence' } })
    assert.equal(r.status, 200)
    id = r.data.project.id
    assert.equal(r.data.project.status, 'draft')
    assert.equal(r.data.project.slug, 'lakeside-residence')
  })

  await step('publishing without a cover image is refused', async () => {
    assert.equal((await call('PUT', `/api/admin/projects/${id}`, { json: { status: 'published' } })).status, 422)
  })

  await step('non-image uploads are rejected', async () => {
    const r = await call('POST', `/api/admin/projects/${id}/cover`, { files: [new File(['<script>alert(1)</script>'], 'evil.jpg', { type: 'image/jpeg' })] })
    assert.equal(r.status, 415)
  })

  let coverId
  await step('3. administrator uploads a cover image (AVIF + WebP variants generated)', async () => {
    const r = await call('POST', `/api/admin/projects/${id}/cover`, { files: [await image('cover.jpg', '#b9a58c', 3000, 2000)] })
    assert.equal(r.status, 200)
    coverId = r.data.project.cover.id
    assert.deepEqual(r.data.project.cover.widths, [480, 960, 1600, 2400])
    const files = readdirSync(join(DATA, 'uploads', coverId)).sort()
    assert.ok(files.includes('2400.avif') && files.includes('480.webp') && files.includes('original.jpg'), files.join(','))
    assert.equal((await fetch(`${BASE}/uploads/${coverId}/960.avif`)).headers.get('content-type'), 'image/avif')
  })

  let gallery
  await step('4. administrator uploads multiple gallery images at once', async () => {
    const r = await call('POST', `/api/admin/projects/${id}/images`, {
      files: [await image('a.jpg', '#6b5646'), await image('b.png', '#dccfbc', 1200, 1500, 'png'), await image('c.webp', '#2a2420', 1600, 900, 'webp')],
    })
    assert.equal(r.status, 200)
    gallery = r.data.project.images
    assert.equal(gallery.length, 3)
  })

  await step('5–6. administrator reorders images and adds details, captions and alt text', async () => {
    const [a, b, c] = gallery
    const r = await call('PUT', `/api/admin/projects/${id}`, {
      json: {
        category: 'Residential Architecture', location: 'Bengaluru', year: '2025',
        summary: 'A calm family home organised around a courtyard.', body: 'Paragraph one.\n\nParagraph two.',
        coverAlt: 'Courtyard at dusk', featured: true, meta: [{ label: 'Area', value: '3,200 sq ft' }],
        images: [{ id: c.id, caption: 'Living room', alt: 'Dark living room' }, { id: a.id, caption: '', alt: 'Brown study' }, { id: b.id, caption: 'Stair', alt: 'Pale stair' }],
      },
    })
    assert.equal(r.status, 200)
    assert.deepEqual(r.data.project.images.map((i) => i.id), [c.id, a.id, b.id])
    assert.equal(r.data.project.images[0].caption, 'Living room')
    assert.equal(r.data.project.category, 'Residential Architecture')
  })

  await step('draft projects are not public', async () => {
    assert.equal((await call('GET', '/api/projects/lakeside-residence', { auth: false })).status, 404)
    assert.ok(!(await call('GET', '/api/site', { auth: false })).data.projects.some((p) => p.id === id))
  })

  await step('7. administrator publishes the project', async () => {
    assert.equal((await call('PUT', `/api/admin/projects/${id}`, { json: { status: 'published' } })).data.project.status, 'published')
  })

  await step('8. the project appears on the public Projects listing', async () => {
    const p = (await call('GET', '/api/site', { auth: false })).data.projects.find((x) => x.id === id)
    assert.ok(p, 'project missing from public list')
    assert.equal(p.cover.alt, 'Courtyard at dusk')
  })

  await step('9. visitors can open its detail page and see the ordered gallery', async () => {
    const r = await call('GET', '/api/projects/lakeside-residence', { auth: false })
    assert.equal(r.status, 200)
    assert.deepEqual(r.data.project.images.map((i) => i.alt), ['Dark living room', 'Brown study', 'Pale stair'])
    assert.ok((await call('GET', '/sitemap.xml', { auth: false })).data.includes('/projects/lakeside-residence'))
    if (existsSync('dist/index.html')) {
      const html = (await call('GET', '/projects/lakeside-residence', { auth: false })).data
      assert.match(html, /<title>Lakeside Residence — The Cornerstone Architect<\/title>/)
      assert.match(html, /og:image" content="[^"]+\/uploads\//)
    }
  })

  await step('10. edits to a published project appear publicly (URL stays stable)', async () => {
    await call('PUT', `/api/admin/projects/${id}`, { json: { title: 'Lakeside Residence II', summary: 'Updated summary.' } })
    const r = await call('GET', '/api/projects/lakeside-residence', { auth: false })
    assert.equal(r.data.project.title, 'Lakeside Residence II')
    assert.equal(r.data.project.summary, 'Updated summary.')
  })

  await step('replacing a gallery image swaps the file and removes the old one', async () => {
    const target = gallery[1]
    const r = await call('POST', `/api/admin/projects/${id}/images/${target.id}/replace`, { files: [await image('new.jpg', '#a39383')] })
    assert.equal(r.status, 200)
    const replaced = r.data.project.images.find((i) => i.id === target.id)
    assert.notEqual(replaced.media.id, target.media.id)
    assert.equal(replaced.alt, 'Pale stair', 'caption/alt survive a replace')
    assert.equal(replaced.caption, 'Stair')
    assert.ok(!existsSync(join(DATA, 'uploads', target.media.id)), 'old file not cleaned up')
  })

  await step('11. administrator deletes a gallery image (file removed, no orphan)', async () => {
    const victim = gallery[2]
    const r = await call('DELETE', `/api/admin/projects/${id}/images/${victim.id}`)
    assert.equal(r.data.project.images.length, 2)
    assert.ok(!existsSync(join(DATA, 'uploads', victim.media.id)))
    assert.equal((await call('GET', '/api/projects/lakeside-residence', { auth: false })).data.project.images.length, 2)
  })

  await step('unpublishing hides the project; republishing shows it', async () => {
    await call('PUT', `/api/admin/projects/${id}`, { json: { status: 'unpublished' } })
    assert.equal((await call('GET', '/api/projects/lakeside-residence', { auth: false })).status, 404)
    await call('PUT', `/api/admin/projects/${id}`, { json: { status: 'published' } })
    assert.equal((await call('GET', '/api/projects/lakeside-residence', { auth: false })).status, 200)
  })

  await step('website content edits are stored and served publicly', async () => {
    await call('PUT', '/api/admin/content/contact', { json: { phone: '+91 00000 00000' } })
    assert.equal((await call('GET', '/api/site', { auth: false })).data.content.contact.phone, '+91 00000 00000')
    assert.equal((await call('GET', '/api/site', { auth: false })).data.content.contact.email, 'ar.jeannejoseph@gmail.com', 'other fields untouched')
  })

  await step('admin text cannot break out of the inlined page data (no stored XSS)', async () => {
    const evil = '</script><script>window.pwned=1</script>'
    await call('PUT', '/api/admin/content/home', { json: { heroTitle: evil } })
    if (existsSync('dist/index.html')) {
      const html = (await call('GET', '/', { auth: false })).data
      assert.ok(html.includes('window.__SITE__='), 'site data not inlined')
      assert.ok(!html.includes(evil), 'raw </script> found in HTML')
    }
    assert.equal((await call('GET', '/api/site', { auth: false })).data.content.home.heroTitle, evil, 'text itself is preserved')
  })

  await step('responses are compressed', async () => {
    const res = await fetch(`${BASE}/api/site`, { headers: { 'accept-encoding': 'br' } })
    assert.equal(res.headers.get('content-encoding'), 'br')
  })

  await step('media in use cannot be deleted from the library', async () => {
    assert.equal((await call('DELETE', `/api/admin/media/${coverId}`)).status, 409)
  })

  await step('enquiries are validated and stored', async () => {
    assert.equal((await call('POST', '/api/enquiries', { auth: false, json: { name: '', email: 'bad', message: 'hi' } })).status, 422)
    assert.equal((await call('POST', '/api/enquiries', { auth: false, json: { name: 'Asha', email: 'asha@example.test', message: 'We would like to discuss our apartment.' } })).status, 200)
    assert.equal((await call('GET', '/api/admin/enquiries')).data.enquiries.length, 1)
  })

  // A second project, used to prove deletion and persistence independently.
  const keep = (await call('POST', '/api/admin/projects', { json: { title: 'Keeper' } })).data.project.id

  await step('14. all changes persist after a server restart (session included)', async () => {
    await stop()
    await start()
    assert.equal((await call('GET', '/api/admin/me')).data.authed, true)
    const r = await call('GET', '/api/projects/lakeside-residence', { auth: false })
    assert.equal(r.data.project.title, 'Lakeside Residence II')
    assert.equal(r.data.project.images.length, 2)
    assert.equal((await call('GET', `/api/admin/projects/${keep}`)).data.project.title, 'Keeper')
  })

  await step('12–13. administrator deletes the project; it disappears and its files are removed', async () => {
    const before = (await call('GET', `/api/admin/projects/${id}`)).data.project
    const files = [before.cover.id, ...before.images.map((i) => i.media.id)]
    assert.equal((await call('DELETE', `/api/admin/projects/${id}`)).status, 200)
    assert.equal((await call('GET', '/api/projects/lakeside-residence', { auth: false })).status, 404)
    assert.ok(!(await call('GET', '/api/site', { auth: false })).data.projects.some((p) => p.id === id))
    for (const f of files) assert.ok(!existsSync(join(DATA, 'uploads', f)), `orphaned file ${f}`)
  })

  await step('deletion persists after another restart', async () => {
    await stop()
    await start()
    assert.equal((await call('GET', '/api/projects/lakeside-residence', { auth: false })).status, 404)
  })

  await step('logout ends the session', async () => {
    await call('POST', '/api/admin/logout')
    cookie = cookie.replace(/=.*/, '=') // browser drops the cleared cookie
    assert.equal((await call('GET', '/api/admin/projects')).status, 401)
  })

  await step('login is rate limited after repeated failures', async () => {
    let last
    for (let i = 0; i < 6; i++) last = await call('POST', '/api/admin/login', { json: { email: ADMIN.email, password: `wrong-${i}-xxxxxx` } })
    assert.equal(last.status, 429)
    assert.equal((await call('POST', '/api/admin/login', { json: ADMIN })).status, 429, 'even the right password waits out the lockout')
  })

  console.log(`\nAll ${steps.length} checks passed.`)
} catch (e) {
  console.error('\n✗ FAILED:', e.message)
  process.exitCode = 1
} finally {
  await stop().catch(() => {})
  rmSync(DATA, { recursive: true, force: true })
}
