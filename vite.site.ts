// Build-time content + static output for Vercel, and the admin API in dev.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadEnv, type Plugin } from 'vite'

type Img = { path: string; widths: number[] } | null
type Project = { slug: string; title: string; summary: string; status: string; order: number; createdAt: number; updatedAt: number; cover: Img }
type Site = { home: { heroImage: Img }; finishing: { heroImage: Img } }

const DIR = process.env.CONTENT_DIR || 'content' // overridable so tests can build from a scratch copy
const FILES = ['projects.json', 'site-content.json'].map((f) => resolve(DIR, f))
const VIRTUAL = 'virtual:site-data'

function readContent() {
  const projects: Project[] = JSON.parse(readFileSync(FILES[0], 'utf8')).projects
  const content: Site = JSON.parse(readFileSync(FILES[1], 'utf8'))
  // Drafts and unpublished projects never reach the public bundle.
  const published = projects
    .filter((p) => p.status === 'published')
    .sort((a, b) => a.order - b.order || b.createdAt - a.createdAt)
  return { content, projects: published }
}

const PAGES: Record<string, [string, string]> = {
  '/': ['The Cornerstone Architect — Architecture & Interior Design, Bengaluru', 'Architecture and interior design studio in Bengaluru led by Ar. Jeanne Joseph. Homes shaped with care, from the plan to the finishing touch.'],
  '/about': ['About Ar. Jeanne Joseph — The Cornerstone Architect', 'Meet Ar. Jeanne Joseph, architect and interior designer, and the thinking behind The Cornerstone Architect.'],
  '/projects': ['Projects — The Cornerstone Architect', 'Selected architecture and interior design projects by The Cornerstone Architect, Bengaluru.'],
  '/the-finishing-touch': ['The Finishing Touch by Jeanne — Interior Finishing & Curation', 'A signature interior finishing and curation service: furniture, lighting, textiles, art and décor curated around your existing interiors.'],
  '/contact': ['Contact — The Cornerstone Architect', 'Start a conversation about your home. The Cornerstone Architect, Bengaluru, Karnataka.'],
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

function head(site: string, path: string, title: string, description: string, image: string, hero: Img, noindex = false) {
  const url = `${site}${path}`
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="The Cornerstone Architect">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ]
  if (hero) {
    const set = hero.widths.map((w) => `${hero.path}-${w}.webp ${w}w`).join(', ')
    tags.push(`<link rel="preload" as="image" type="image/webp" imagesrcset="${set}" imagesizes="100vw" fetchpriority="high">`)
  }
  return tags.join('\n    ')
}

export default function sitePlugin(): Plugin {
  let outDir = 'dist'
  return {
    name: 'cornerstone-site',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir)
    },
    resolveId: (id) => (id === VIRTUAL ? '\0' + VIRTUAL : null),
    load(id) {
      if (id !== '\0' + VIRTUAL) return null
      FILES.forEach((f) => this.addWatchFile(f))
      return `export default ${JSON.stringify(readContent())}`
    },

    configureServer(server) {
      // Content edits on disk (e.g. after `git pull`) refresh the page.
      server.watcher.add(FILES)
      server.watcher.on('change', (f) => {
        if (!FILES.includes(resolve(f))) return
        const mod = server.moduleGraph.getModuleById('\0' + VIRTUAL)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      })
      // Dev only: run the Vercel function in-process. Non-VITE_ env vars from .env reach it via process.env.
      for (const [k, v] of Object.entries(loadEnv(server.config.mode, process.cwd(), ''))) process.env[k] ??= v
      server.middlewares.use('/api/admin', async (req: IncomingMessage, res: ServerResponse) => {
        const { handle } = await server.ssrLoadModule('/api/admin.js')
        const url = `http://${req.headers.host}/api/admin${req.url}`
        const headers = new Headers(Object.entries(req.headers).flatMap(([k, v]) => (v === undefined ? [] : [[k, Array.isArray(v) ? v.join(', ') : v]])) as [string, string][])
        const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
        const request = new Request(url, { method: req.method, headers, body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined, duplex: 'half' } as RequestInit)
        const response: Response = await handle(request)
        res.statusCode = response.status
        response.headers.forEach((v, k) => k !== 'set-cookie' && res.setHeader(k, v))
        const cookies = response.headers.getSetCookie()
        if (cookies.length) res.setHeader('set-cookie', cookies)
        res.end(Buffer.from(await response.arrayBuffer()))
      })
    },

    // Static output: one HTML file per route (with its own meta tags), plus sitemap, robots, 404 and a build marker.
    closeBundle() {
      const site = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:5173')).replace(/\/$/, '')
      const template = readFileSync(join(outDir, 'index.html'), 'utf8')
      const { content, projects } = readContent()
      const og = `${site}/og-image.jpg`
      const write = (file: string, html: string) => {
        mkdirSync(dirname(join(outDir, file)), { recursive: true })
        writeFileSync(join(outDir, file), html)
      }
      const page = (path: string, title: string, desc: string, image = og, hero: Img = null, noindex = false) =>
        template.replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, head(site, path, title, desc, image, hero, noindex))

      const heroes: Record<string, Img> = { '/': content.home.heroImage, '/the-finishing-touch': content.finishing.heroImage }
      for (const [path, [title, desc]] of Object.entries(PAGES)) {
        write(path === '/' ? 'index.html' : `${path.slice(1)}/index.html`, page(path, title, desc, og, heroes[path] ?? null))
      }
      for (const p of projects) {
        const desc = p.summary.replace(/[[\]]/g, '').slice(0, 160) || PAGES['/projects'][1]
        const image = p.cover ? `${site}${p.cover.path}-${p.cover.widths.find((w) => w >= 1200) ?? p.cover.widths.at(-1)}.webp` : og
        write(`projects/${p.slug}/index.html`, page(`/projects/${p.slug}`, `${p.title} — The Cornerstone Architect`, desc, image, p.cover))
      }
      write('admin/index.html', page('/admin', 'Admin — The Cornerstone Architect', 'Studio admin.', og, null, true))
      write('404.html', page('/404', 'Page not found — The Cornerstone Architect', PAGES['/'][1], og, null, true))

      const urls = [...Object.keys(PAGES).map((p) => [p, null] as const), ...projects.map((p) => [`/projects/${p.slug}`, p.updatedAt] as const)]
      write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map(([p, t]) => `  <url><loc>${esc(site + p)}</loc>${t ? `<lastmod>${new Date(t).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`)
        .join('\n')}\n</urlset>\n`)
      write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`)
      // The admin compares this to the commit it just made to know when a change is actually live.
      write('version.json', JSON.stringify({ commit: process.env.VERCEL_GIT_COMMIT_SHA || null, builtAt: new Date().toISOString() }))
    },
  }
}
