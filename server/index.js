import { createServer } from 'node:http'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { brotliCompressSync, gzipSync, constants as zc } from 'node:zlib'
import { db, tx, UPLOAD_DIR } from './db.js'
import { collectGarbage, HttpError, ingest, isReferenced, mediaRow, MAX_UPLOAD_BYTES } from './media.js'
import { DEFAULTS, getContent, setContent } from './content.js'
import * as auth from './auth.js'
import { seedIfEmpty } from './seed.js'

const PORT = Number(process.env.PORT || 4310)
const SITE_URL = (process.env.SITE_URL || `http://localhost:${PORT}`).replace(/\/$/, '')
const DIST = resolve('dist')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml', '.woff2': 'font/woff2' }

// ---------- helpers ----------
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
}

/** Write a text body, brotli/gzip-compressed when the client accepts it. */
function end(res, status, headers, text, encoded) {
  const enc = res.encoding
  const buf = enc && text.length > 1024 ? (encoded?.(enc) ?? compress(Buffer.from(text), enc, 5)) : Buffer.from(text)
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers, Vary: 'Accept-Encoding', 'Content-Length': buf.length, ...(buf.length !== Buffer.byteLength(text) ? { 'Content-Encoding': enc } : {}) })
  res.end(buf)
}
const compress = (buf, enc, q) => (enc === 'br' ? brotliCompressSync(buf, { params: { [zc.BROTLI_PARAM_QUALITY]: q } }) : gzipSync(buf))

function send(res, status, body, headers = {}) {
  const json = typeof body !== 'string'
  end(res, status, { 'Content-Type': json ? 'application/json' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers }, json ? JSON.stringify(body) : body)
}

async function readBody(req, limit) {
  const chunks = []
  let size = 0
  for await (const c of req) {
    size += c.length
    if (size > limit) throw new HttpError(413, 'Request too large.')
    chunks.push(c)
  }
  return Buffer.concat(chunks)
}

async function readJson(req) {
  try {
    return JSON.parse((await readBody(req, 1e6)).toString() || '{}')
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(400, 'Invalid JSON.')
  }
}

const MAX_FILES = 30
async function readFiles(req) {
  const len = Number(req.headers['content-length'])
  if (!len) throw new HttpError(411, 'Content-Length required.')
  if (len > MAX_UPLOAD_BYTES * MAX_FILES) throw new HttpError(413, 'Upload too large.')
  if (!String(req.headers['content-type']).startsWith('multipart/form-data')) throw new HttpError(415, 'Expected multipart/form-data.')
  // Native multipart parsing via the WHATWG Request in Node's runtime.
  const form = await new Request('http://local/', { method: 'POST', headers: req.headers, body: Readable.toWeb(req), duplex: 'half' }).formData()
  const files = form.getAll('files').filter((f) => typeof f === 'object')
  if (!files.length) throw new HttpError(400, 'No files received.')
  if (files.length > MAX_FILES) throw new HttpError(413, `At most ${MAX_FILES} files per upload.`)
  for (const f of files) if (f.size > MAX_UPLOAD_BYTES) throw new HttpError(413, `"${f.name}" is larger than 25 MB.`)
  return files
}

const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const clientIp = (req) => (process.env.TRUST_PROXY === '1' && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || ''

function slugify(title, excludeId = 0) {
  const base = title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'project'
  let slug = base
  for (let i = 2; db.prepare('SELECT 1 FROM projects WHERE slug = ? AND id != ?').get(slug, excludeId); i++) slug = `${base}-${i}`
  return slug
}

// ---------- projections ----------
function mediaMapFor(obj) {
  const ids = [...new Set(JSON.stringify(obj).match(/\b[a-f0-9]{20}\b/g) || [])]
  return Object.fromEntries(ids.map((id) => [id, mediaRow(id)]).filter(([, m]) => m))
}

function projectOut(p, { full = false } = {}) {
  const cover = p.cover_media_id ? mediaRow(p.cover_media_id) : null
  const out = {
    id: p.id, slug: p.slug, title: p.title, category: p.category, location: p.location, year: p.year,
    summary: p.summary, status: p.status, featured: Boolean(p.featured), sort: p.sort,
    cover: cover && { ...cover, alt: p.cover_alt || cover.alt },
    updatedAt: p.updated_at,
  }
  if (!full) return out
  out.body = p.body
  out.meta = JSON.parse(p.meta)
  out.images = db
    .prepare('SELECT * FROM project_images WHERE project_id = ? ORDER BY position, id')
    .all(p.id)
    .map((i) => ({ id: i.id, caption: i.caption, alt: i.alt, media: mediaRow(i.media_id) }))
    .filter((i) => i.media)
  return out
}

const PUBLISHED_ORDER = "SELECT * FROM projects WHERE status = 'published' ORDER BY sort, created_at DESC"

// ---------- routes ----------
const routes = []
const route = (method, pattern, handler, { admin = false } = {}) =>
  routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), handler, admin })

// Public
function sitePayload() {
  const content = getContent()
  return { content, media: mediaMapFor(content), projects: db.prepare(PUBLISHED_ORDER).all().map((p) => projectOut(p)) }
}
route('GET', '/api/site', sitePayload)

route('GET', '/api/projects/:slug', (req, { slug }) => {
  const list = db.prepare(PUBLISHED_ORDER).all()
  const i = list.findIndex((p) => p.slug === slug)
  if (i < 0) throw new HttpError(404, 'Project not found.')
  const neighbour = (p) => p && { slug: p.slug, title: p.title, cover: projectOut(p).cover }
  return { project: projectOut(list[i], { full: true }), prev: neighbour(list[i - 1] || (list.length > 1 ? list.at(-1) : null)), next: neighbour(list[i + 1] || (list.length > 1 ? list[0] : null)) }
})

route('POST', '/api/enquiries', async (req, _p, res) => {
  const b = await readJson(req)
  if (b.website) return { ok: true } // honeypot: silently accept bots
  const e = { name: str(b.name, 120), email: str(b.email, 200), phone: str(b.phone, 40), project_type: str(b.projectType, 80), location: str(b.location, 120), message: str(b.message, 5000) }
  const errors = {}
  if (!e.name) errors.name = 'Please tell us your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)) errors.email = 'Please enter a valid email address.'
  if (e.message.length < 10) errors.message = 'Please write a few words about your project.'
  if (Object.keys(errors).length) return send(res, 422, { error: 'Please check the highlighted fields.', errors })
  // Only stored messages count, so someone correcting typos isn't locked out.
  if (!auth.rateLimit(`enq:${clientIp(req)}`, 5, 3600e3)) throw new HttpError(429, 'Too many enquiries from this connection. Please email us directly.')
  db.prepare('INSERT INTO enquiries (name, email, phone, project_type, location, message, created_at) VALUES (?,?,?,?,?,?,?)').run(e.name, e.email, e.phone, e.project_type, e.location, e.message, Date.now())
  return { ok: true }
})

// Auth
route('POST', '/api/admin/login', async (req, _p, res) => {
  const ip = clientIp(req)
  const wait = auth.loginBlockedFor(ip)
  if (wait) return send(res, 429, { error: `Too many failed attempts. Try again in ${Math.ceil(wait / 60)} minute(s).` }, { 'Retry-After': String(wait) })
  const { email, password } = await readJson(req)
  const admin = db.prepare('SELECT * FROM admin WHERE id = 1').get()
  const ok = admin && typeof password === 'string' && str(email, 200).toLowerCase() === admin.email && (await auth.verifyPassword(password, admin.pass_hash))
  if (!ok) {
    auth.recordLoginFailure(ip)
    if (!admin) return send(res, 503, { error: 'No admin account is configured on the server yet.' })
    return send(res, 401, { error: 'Email or password is incorrect.' })
  }
  auth.recordLoginSuccess(ip)
  send(res, 200, { ok: true }, { 'Set-Cookie': auth.createSession() })
})

route('POST', '/api/admin/logout', (req, _p, res) => {
  auth.destroySession(req)
  send(res, 200, { ok: true }, { 'Set-Cookie': auth.clearCookie })
})

route('GET', '/api/admin/me', (req) => ({ authed: auth.isAuthed(req), email: auth.isAuthed(req) ? db.prepare('SELECT email FROM admin').get()?.email : null }))

route('PUT', '/api/admin/account', async (req, _p, res) => {
  const b = await readJson(req)
  const admin = db.prepare('SELECT * FROM admin WHERE id = 1').get()
  if (!(await auth.verifyPassword(String(b.currentPassword || ''), admin.pass_hash))) throw new HttpError(403, 'Current password is incorrect.')
  const email = str(b.email, 200).toLowerCase() || admin.email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(422, 'Enter a valid email address.')
  let hash = admin.pass_hash
  if (b.newPassword) {
    if (String(b.newPassword).length < 10) throw new HttpError(422, 'New password must be at least 10 characters.')
    hash = await auth.hashPassword(String(b.newPassword))
  }
  db.prepare('UPDATE admin SET email = ?, pass_hash = ? WHERE id = 1').run(email, hash)
  if (b.newPassword) {
    auth.destroyAllSessions() // sign out every other device
    return send(res, 200, { ok: true, email }, { 'Set-Cookie': auth.createSession() })
  }
  return { ok: true, email }
}, { admin: true })

// Admin: overview
route('GET', '/api/admin/overview', () => {
  const counts = Object.fromEntries(db.prepare('SELECT status, COUNT(*) n FROM projects GROUP BY status').all().map((r) => [r.status, r.n]))
  return {
    counts: { published: counts.published || 0, draft: counts.draft || 0, unpublished: counts.unpublished || 0 },
    media: db.prepare('SELECT COUNT(*) n FROM media').get().n,
    unreadEnquiries: db.prepare('SELECT COUNT(*) n FROM enquiries WHERE read = 0').get().n,
    recent: db.prepare('SELECT * FROM projects ORDER BY updated_at DESC LIMIT 5').all().map((p) => projectOut(p)),
  }
}, { admin: true })

// Admin: projects
route('GET', '/api/admin/projects', () => ({
  projects: db.prepare('SELECT * FROM projects ORDER BY sort, created_at DESC').all().map((p) => projectOut(p)),
}), { admin: true })

route('POST', '/api/admin/projects', async (req) => {
  const b = await readJson(req)
  const title = str(b.title, 160)
  if (!title) throw new HttpError(422, 'A project title is required.')
  const now = Date.now()
  const sort = (db.prepare('SELECT MAX(sort) m FROM projects').get().m ?? -1) + 1
  const { lastInsertRowid } = db.prepare("INSERT INTO projects (slug, title, status, sort, created_at, updated_at) VALUES (?, ?, 'draft', ?, ?, ?)").run(slugify(title), title, sort, now, now)
  return { project: projectOut(db.prepare('SELECT * FROM projects WHERE id = ?').get(lastInsertRowid), { full: true }) }
}, { admin: true })

function getProject(id) {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(Number(id))
  if (!p) throw new HttpError(404, 'Project not found.')
  return p
}
const touch = (id) => db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(Date.now(), id)

route('GET', '/api/admin/projects/:id', (req, { id }) => ({ project: projectOut(getProject(id), { full: true }) }), { admin: true })

route('PUT', '/api/admin/projects/:id', async (req, { id }) => {
  const p = getProject(id)
  const b = await readJson(req)
  const title = 'title' in b ? str(b.title, 160) : p.title
  if (!title) throw new HttpError(422, 'A project title is required.')
  const status = 'status' in b ? b.status : p.status
  if (!['draft', 'published', 'unpublished'].includes(status)) throw new HttpError(422, 'Invalid status.')
  if (status === 'published' && !p.cover_media_id) throw new HttpError(422, 'Add a cover image before publishing.')
  let slug = p.slug
  if ('slug' in b && str(b.slug)) slug = slugify(str(b.slug, 80), p.id)
  else if (title !== p.title && p.status === 'draft') slug = slugify(title, p.id) // keep public URLs stable once published
  const meta = Array.isArray(b.meta) ? b.meta.slice(0, 12).map((m) => ({ label: str(m?.label, 60), value: str(m?.value, 200) })).filter((m) => m.label || m.value) : JSON.parse(p.meta)
  const pick = (k, max) => (k in b ? str(b[k], max) : p[k])
  tx(() => {
    db.prepare(
      `UPDATE projects SET title=?, slug=?, category=?, location=?, year=?, summary=?, body=?, status=?, featured=?, sort=?, cover_alt=?, meta=?, updated_at=? WHERE id=?`,
    ).run(
      title, slug, pick('category', 80), pick('location', 120), pick('year', 20), pick('summary', 1000), 'body' in b ? str(b.body, 20000) : p.body,
      status, 'featured' in b ? (b.featured ? 1 : 0) : p.featured, 'sort' in b && Number.isFinite(+b.sort) ? Math.trunc(+b.sort) : p.sort,
      'coverAlt' in b ? str(b.coverAlt, 300) : p.cover_alt, JSON.stringify(meta), Date.now(), p.id,
    )
    if (Array.isArray(b.images)) {
      const upd = db.prepare('UPDATE project_images SET position = ?, caption = ?, alt = ? WHERE id = ? AND project_id = ?')
      b.images.forEach((img, pos) => upd.run(pos, str(img?.caption, 300), str(img?.alt, 300), Number(img?.id), p.id))
    }
  })
  return { project: projectOut(getProject(id), { full: true }) }
}, { admin: true })

route('DELETE', '/api/admin/projects/:id', (req, { id }) => {
  const p = getProject(id)
  const mediaIds = [p.cover_media_id, ...db.prepare('SELECT media_id FROM project_images WHERE project_id = ?').all(p.id).map((r) => r.media_id)]
  db.prepare('DELETE FROM projects WHERE id = ?').run(p.id) // gallery rows cascade
  collectGarbage(mediaIds)
  return { ok: true }
}, { admin: true })

route('POST', '/api/admin/projects/:id/cover', async (req, { id }) => {
  const p = getProject(id)
  const [file] = await readFiles(req)
  const m = await ingest(Buffer.from(await file.arrayBuffer()), file.name)
  db.prepare('UPDATE projects SET cover_media_id = ? WHERE id = ?').run(m.id, p.id)
  touch(p.id)
  collectGarbage([p.cover_media_id])
  return { project: projectOut(getProject(id), { full: true }) }
}, { admin: true })

route('POST', '/api/admin/projects/:id/images', async (req, { id }) => {
  const p = getProject(id)
  const files = await readFiles(req)
  let pos = (db.prepare('SELECT MAX(position) m FROM project_images WHERE project_id = ?').get(p.id).m ?? -1) + 1
  const errors = []
  for (const f of files) {
    try {
      const m = await ingest(Buffer.from(await f.arrayBuffer()), f.name)
      db.prepare('INSERT INTO project_images (project_id, media_id, position) VALUES (?,?,?)').run(p.id, m.id, pos++)
    } catch (e) {
      if (!(e instanceof HttpError)) throw e
      errors.push(e.message)
    }
  }
  touch(p.id)
  return { project: projectOut(getProject(id), { full: true }), errors }
}, { admin: true })

function getImage(projectId, imageId) {
  const img = db.prepare('SELECT * FROM project_images WHERE id = ? AND project_id = ?').get(Number(imageId), Number(projectId))
  if (!img) throw new HttpError(404, 'Image not found.')
  return img
}

route('DELETE', '/api/admin/projects/:id/images/:imageId', (req, { id, imageId }) => {
  const img = getImage(id, imageId)
  db.prepare('DELETE FROM project_images WHERE id = ?').run(img.id)
  touch(img.project_id)
  collectGarbage([img.media_id])
  return { project: projectOut(getProject(id), { full: true }) }
}, { admin: true })

route('POST', '/api/admin/projects/:id/images/:imageId/replace', async (req, { id, imageId }) => {
  const img = getImage(id, imageId)
  const [file] = await readFiles(req)
  const m = await ingest(Buffer.from(await file.arrayBuffer()), file.name)
  db.prepare('UPDATE project_images SET media_id = ? WHERE id = ?').run(m.id, img.id)
  touch(img.project_id)
  collectGarbage([img.media_id])
  return { project: projectOut(getProject(id), { full: true }) }
}, { admin: true })

// Admin: media library
route('GET', '/api/admin/media', () => ({
  media: db.prepare('SELECT id FROM media ORDER BY created_at DESC').all().map((r) => ({ ...mediaRow(r.id), inUse: isReferenced(r.id) })),
}), { admin: true })

route('POST', '/api/admin/media', async (req) => {
  const files = await readFiles(req)
  const added = []
  const errors = []
  for (const f of files) {
    try {
      added.push(await ingest(Buffer.from(await f.arrayBuffer()), f.name))
    } catch (e) {
      if (!(e instanceof HttpError)) throw e
      errors.push(e.message)
    }
  }
  return { added, errors }
}, { admin: true })

route('PATCH', '/api/admin/media/:mid', async (req, { mid }) => {
  if (!mediaRow(mid)) throw new HttpError(404, 'Image not found.')
  const b = await readJson(req)
  db.prepare('UPDATE media SET alt = ? WHERE id = ?').run(str(b.alt, 300), mid)
  return { media: mediaRow(mid) }
}, { admin: true })

route('DELETE', '/api/admin/media/:mid', (req, { mid }) => {
  if (!mediaRow(mid)) throw new HttpError(404, 'Image not found.')
  if (isReferenced(mid)) throw new HttpError(409, 'This image is in use on the website. Remove it from the project or page first.')
  collectGarbage([mid])
  return { ok: true }
}, { admin: true })

// Admin: website content
route('GET', '/api/admin/content', () => {
  const content = getContent()
  return { content, media: mediaMapFor(content) }
}, { admin: true })

route('PUT', '/api/admin/content/:key', async (req, { key }) => {
  if (!DEFAULTS[key]) throw new HttpError(404, 'Unknown section.')
  const saved = setContent(key, await readJson(req))
  return { content: saved, media: mediaMapFor(saved) }
}, { admin: true })

// Admin: enquiries
route('GET', '/api/admin/enquiries', () => ({ enquiries: db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC').all() }), { admin: true })
route('PATCH', '/api/admin/enquiries/:eid', async (req, { eid }) => {
  const b = await readJson(req)
  db.prepare('UPDATE enquiries SET read = ? WHERE id = ?').run(b.read ? 1 : 0, Number(eid))
  return { ok: true }
}, { admin: true })
route('DELETE', '/api/admin/enquiries/:eid', (req, { eid }) => {
  db.prepare('DELETE FROM enquiries WHERE id = ?').run(Number(eid))
  return { ok: true }
}, { admin: true })

// ---------- SEO ----------
const PAGES = {
  '/': ['The Cornerstone Architect — Architecture & Interior Design, Bengaluru', 'Architecture and interior design studio in Bengaluru led by Ar. Jeanne Joseph. Homes shaped with care, from the plan to the finishing touch.'],
  '/about': ['About Ar. Jeanne Joseph — The Cornerstone Architect', 'Meet Ar. Jeanne Joseph, architect and interior designer, and the thinking behind The Cornerstone Architect.'],
  '/projects': ['Projects — The Cornerstone Architect', 'Selected architecture and interior design projects by The Cornerstone Architect, Bengaluru.'],
  '/the-finishing-touch': ['The Finishing Touch by Jeanne — Interior Finishing & Curation', 'A signature interior finishing and curation service: furniture, lighting, textiles, art and décor curated around your existing interiors.'],
  '/contact': ['Contact — The Cornerstone Architect', 'Start a conversation about your home. The Cornerstone Architect, Bengaluru, Karnataka.'],
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function seoFor(path) {
  let [title, description] = PAGES[path] || [null, null]
  let image = `${SITE_URL}/og-image.jpg`
  let status = title ? 200 : 404
  const m = path.match(/^\/projects\/([^/]+)$/)
  if (m) {
    const p = db.prepare("SELECT * FROM projects WHERE slug = ? AND status = 'published'").get(m[1])
    if (p) {
      title = `${p.title} — The Cornerstone Architect`
      description = p.summary.replace(/\[|\]/g, '').slice(0, 160) || PAGES['/projects'][1]
      if (p.cover_media_id) image = `${SITE_URL}/uploads/${p.cover_media_id}/${Math.min(1600, Math.max(...mediaRow(p.cover_media_id).widths))}.webp`
      status = 200
    }
  }
  if (path.startsWith('/admin')) return { status: 200, html: `<title>Admin — The Cornerstone Architect</title><meta name="robots" content="noindex, nofollow">` }
  if (!title) [title, description] = ['Page not found — The Cornerstone Architect', PAGES['/'][1]]
  const url = `${SITE_URL}${path === '/' ? '/' : path}`
  return {
    status,
    html: [
      `<title>${esc(title)}</title>`,
      `<meta name="description" content="${esc(description)}">`,
      `<link rel="canonical" href="${esc(url)}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="The Cornerstone Architect">`,
      `<meta property="og:title" content="${esc(title)}">`,
      `<meta property="og:description" content="${esc(description)}">`,
      `<meta property="og:url" content="${esc(url)}">`,
      `<meta property="og:image" content="${esc(image)}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
    ].join('\n    '),
  }
}

function sitemap() {
  const urls = [...Object.keys(PAGES).map((p) => [p, null]), ...db.prepare("SELECT slug, updated_at FROM projects WHERE status = 'published'").all().map((p) => [`/projects/${p.slug}`, p.updated_at])]
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(([p, t]) => `  <url><loc>${esc(SITE_URL + p)}</loc>${t ? `<lastmod>${new Date(t).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>\n`
}

// ---------- static ----------
const TEXT = /\.(js|css|svg|json|txt|xml|html)$/
const compressed = new Map() // `${file}:${mtime}:${enc}` -> Buffer (static files only)
function serveFile(res, file, cache) {
  const type = MIME[extname(file)] || 'application/octet-stream'
  const { size, mtimeMs } = statSync(file)
  if (res.encoding && TEXT.test(file) && size > 1024) {
    const key = `${file}:${mtimeMs}:${res.encoding}`
    if (!compressed.has(key)) compressed.set(key, compress(readFileSync(file), res.encoding, 11))
    const buf = compressed.get(key)
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': type, 'Content-Length': buf.length, 'Content-Encoding': res.encoding, Vary: 'Accept-Encoding', 'Cache-Control': cache })
    return res.end(buf)
  }
  res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': type, 'Content-Length': size, 'Cache-Control': cache })
  createReadStream(file).pipe(res)
}

let indexHtml = null
let indexMtime = 0
function serveApp(res, path) {
  const file = join(DIST, 'index.html')
  if (!existsSync(file)) return send(res, 503, 'Frontend not built. Run `npm run build`, or use `npm run dev` for development.')
  const mtime = statSync(file).mtimeMs
  if (mtime !== indexMtime) [indexHtml, indexMtime] = [readFileSync(file, 'utf8'), mtime] // picks up rebuilds without a restart
  const seo = seoFor(path)
  let head = seo.html
  if (!path.startsWith('/admin')) {
    // Ship the site data with the page (saves a round trip) and preload the hero image.
    const site = sitePayload()
    // Escaping "<" keeps admin-entered text such as "</script>" from breaking out of the tag.
    head += `\n    <script>window.__SITE__=${JSON.stringify(site).replace(/</g, '\\u003c')}</script>`
    const hero = heroFor(path, site)
    if (hero) {
      const set = (fmt) => hero.widths.map((w) => `/uploads/${hero.id}/${w}.${fmt} ${w}w`).join(', ')
      head += `\n    <link rel="preload" as="image" type="image/avif" imagesrcset="${set('avif')}" imagesizes="100vw" fetchpriority="high">`
    }
  }
  end(res, seo.status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }, indexHtml.replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, head))
}

function heroFor(path, site) {
  const id = path === '/' ? site.content.home.heroImage : path === '/the-finishing-touch' ? site.content.finishing.heroImage : null
  if (id) return site.media[id]
  const m = path.match(/^\/projects\/([^/]+)$/)
  return m ? site.projects.find((p) => p.slug === m[1])?.cover : null
}

// ---------- server ----------
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local')
  const path = decodeURIComponent(url.pathname)
  const ae = String(req.headers['accept-encoding'] || '')
  res.encoding = /\bbr\b/.test(ae) ? 'br' : /\bgzip\b/.test(ae) ? 'gzip' : null
  try {
    if (path.startsWith('/api/')) {
      const r = routes.find((r) => r.method === req.method && r.re.test(path))
      if (!r) throw new HttpError(404, 'Not found.')
      if (req.method !== 'GET') {
        // CSRF defence in depth (cookies are already SameSite=Strict): reject cross-origin writes.
        const origin = req.headers.origin
        if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, 'Cross-origin request rejected.')
      }
      if (r.admin && !auth.isAuthed(req)) throw new HttpError(401, 'Please sign in.')
      const result = await r.handler(req, r.re.exec(path).groups || {}, res)
      if (!res.headersSent && result !== undefined) send(res, 200, result)
      return
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed.')
    const up = path.match(/^\/uploads\/([a-f0-9]{20})\/(\d+)\.(webp|avif)$/)
    if (up) {
      const file = join(UPLOAD_DIR, up[1], `${up[2]}.${up[3]}`)
      if (!existsSync(file)) throw new HttpError(404, 'Not found.')
      return serveFile(res, file, 'public, max-age=31536000, immutable')
    }
    if (path === '/sitemap.xml') return send(res, 200, sitemap(), { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' })
    if (path === '/robots.txt') return send(res, 200, `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, { 'Cache-Control': 'public, max-age=86400' })
    const file = resolve(DIST, `.${path}`)
    if (file.startsWith(DIST) && path !== '/' && existsSync(file) && statSync(file).isFile()) {
      return serveFile(res, file, path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600')
    }
    return serveApp(res, path.replace(/\/+$/, '') || '/')
  } catch (e) {
    if (res.headersSent) return res.destroy()
    if (e instanceof HttpError) return send(res, e.status, { error: e.message })
    console.error(e)
    send(res, 500, { error: 'Something went wrong on the server.' })
  }
})

await auth.bootstrapAdmin()
await seedIfEmpty()
server.listen(PORT, () => console.log(`[server] http://localhost:${PORT}`))
