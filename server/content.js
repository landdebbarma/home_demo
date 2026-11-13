// Content model + server-side validation. The browser sends whole documents; nothing is trusted:
// every field is rebuilt here from a whitelist with type and length limits.

export const PROJECTS_FILE = 'content/projects.json'
export const SITE_FILE = 'content/site-content.json'

export class ValidationError extends Error {
  status = 422
}
const fail = (msg) => {
  throw new ValidationError(msg)
}

const str = (v, max, label, { required = false } = {}) => {
  if (v === undefined || v === null) v = ''
  if (typeof v !== 'string') fail(`${label} must be text.`)
  v = v.trim()
  if (required && !v) fail(`${label} is required.`)
  if (v.length > max) fail(`${label} is too long (max ${max} characters).`)
  return v
}

const IMAGE_PATH = /^\/uploads\/(projects\/[a-z0-9-]{1,80}|site)\/[a-f0-9]{12}$/
/** { id, path, w, h, widths, alt, caption } — files live at public{path}-{width}.webp */
export function cleanImage(x, label) {
  if (x === null || x === undefined) return null
  if (typeof x !== 'object') fail(`${label}: invalid image.`)
  if (!/^[a-f0-9]{12}$/.test(x.id) || !IMAGE_PATH.test(x.path) || !x.path.endsWith(x.id)) fail(`${label}: invalid image reference.`)
  const int = (n, max) => Number.isInteger(n) && n > 0 && n <= max
  if (!int(x.w, 20000) || !int(x.h, 20000)) fail(`${label}: invalid image size.`)
  if (!Array.isArray(x.widths) || !x.widths.length || x.widths.length > 6 || !x.widths.every((w) => int(w, 2400))) fail(`${label}: invalid image widths.`)
  return {
    id: x.id, path: x.path, w: x.w, h: x.h, widths: [...new Set(x.widths)].sort((a, b) => a - b),
    alt: str(x.alt, 300, `${label} alt text`), caption: str(x.caption, 300, `${label} caption`),
  }
}
export const imageFiles = (img) => (img ? img.widths.map((w) => `public${img.path}-${w}.webp`) : [])

const STATUSES = ['draft', 'published', 'unpublished']
export function cleanProjects(doc) {
  if (!doc || !Array.isArray(doc.projects)) fail('Invalid projects document.')
  if (doc.projects.length > 200) fail('Too many projects.')
  const slugs = new Set()
  const ids = new Set()
  return {
    projects: doc.projects.map((p, i) => {
      const label = `Project ${i + 1}`
      if (!p || typeof p !== 'object') fail(`${label}: invalid.`)
      if (typeof p.id !== 'string' || !/^[a-z0-9]{8,24}$/.test(p.id) || ids.has(p.id)) fail(`${label}: invalid id.`)
      ids.add(p.id)
      const title = str(p.title, 160, `${label} title`, { required: true })
      const slug = str(p.slug, 80, `"${title}" web address`, { required: true })
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail(`"${title}": the web address may only use lowercase letters, numbers and dashes.`)
      if (slugs.has(slug)) fail(`Two projects use the web address "${slug}".`)
      slugs.add(slug)
      if (!STATUSES.includes(p.status)) fail(`"${title}": invalid status.`)
      const cover = cleanImage(p.cover, `"${title}" cover`)
      if (p.status === 'published' && !cover) fail(`"${title}": add a cover image before publishing.`)
      if (!Array.isArray(p.gallery) || p.gallery.length > 60) fail(`"${title}": invalid gallery (max 60 images).`)
      if (!Array.isArray(p.meta) || p.meta.length > 12) fail(`"${title}": invalid details.`)
      return {
        id: p.id, slug, title,
        category: str(p.category, 80, 'Category'), location: str(p.location, 120, 'Location'), year: str(p.year, 20, 'Year'),
        summary: str(p.summary, 1000, 'Short description'), body: str(p.body, 20000, 'Full description'),
        status: p.status, featured: Boolean(p.featured), order: Number.isInteger(p.order) ? p.order : 0,
        cover,
        gallery: p.gallery.map((g, j) => cleanImage(g, `"${title}" image ${j + 1}`)),
        meta: p.meta.map((m) => ({ label: str(m?.label, 60, 'Detail name'), value: str(m?.value, 200, 'Detail value') })).filter((m) => m.label || m.value),
        createdAt: Number.isFinite(p.createdAt) ? p.createdAt : Date.now(),
        updatedAt: Number.isFinite(p.updatedAt) ? p.updatedAt : Date.now(),
      }
    }),
  }
}

// Site content shape: 'text' | 'image' | [ { field: 'text' | 'image' } ] (lists)
const ITEM = { title: 'text', text: 'text' }
const SITE_SCHEMA = {
  contact: { email: 'text', phone: 'text', instagram: 'text', location: 'text' },
  home: { heroEyebrow: 'text', heroTitle: 'text', heroImage: 'image', introTitle: 'text', introText: 'text', introImage: 'image', philosophy: [ITEM], storyText: 'text', storyImage: 'image', finishingImage: 'image' },
  about: { role: 'text', portrait: 'image', intro: 'text', background: 'text', approach: 'text', values: [ITEM], imageA: 'image', imageB: 'image' },
  finishing: {
    heroImage: 'image', heroText: 'text', whatWeDo: 'text', whatImage: 'image',
    transformations: [{ label: 'text', before: 'image', after: 'image' }],
    detailsImage: 'image', experienceText: 'text', experienceImage: 'image', moodImage: 'image',
    holisticText: 'text', holisticImage: 'image', ctaImage: 'image',
  },
}

function cleanValue(type, v, label) {
  if (type === 'text') return str(v, 8000, label)
  if (type === 'image') return cleanImage(v, label)
  if (!Array.isArray(v) || v.length > 20) fail(`${label}: invalid list.`)
  return v.map((item, i) => Object.fromEntries(Object.entries(type[0]).map(([k, t]) => [k, cleanValue(t, item?.[k], `${label} item ${i + 1}`)])))
}

export function cleanSite(doc) {
  if (!doc || typeof doc !== 'object') fail('Invalid site content.')
  return Object.fromEntries(
    Object.entries(SITE_SCHEMA).map(([section, fields]) => [
      section,
      Object.fromEntries(Object.entries(fields).map(([k, t]) => [k, cleanValue(t, doc[section]?.[k], `${section}.${k}`)])),
    ]),
  )
}
export const contactValid = (site) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.contact.email)

/** Every image file path referenced by a projects or site document. */
export function referencedFiles(projectsDoc, siteDoc) {
  const out = new Set()
  const walk = (v) => {
    if (!v || typeof v !== 'object') return
    if (typeof v.path === 'string' && Array.isArray(v.widths)) return imageFiles(v).forEach((f) => out.add(f))
    Object.values(v).forEach(walk)
  }
  walk(projectsDoc)
  walk(siteDoc)
  return out
}
