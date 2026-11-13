import { db } from './db.js'

/**
 * Default editable content. Image fields hold media ids (filled by the seed).
 * Text wrapped in [square brackets] is a placeholder: the site renders it visibly as "to be supplied".
 * Long text fields: paragraphs are separated by a blank line.
 */
export const DEFAULTS = {
  contact: {
    email: 'ar.jeannejoseph@gmail.com',
    phone: '+91 97899 36722',
    instagram: 'thecornerstonearchitect',
    location: 'Bengaluru, Karnataka, India',
  },
  home: {
    heroEyebrow: 'Architecture & Interior Design — Bengaluru',
    heroTitle: 'Homes built on a quiet, lasting foundation.',
    heroImage: null,
    introTitle: 'An architecture and interior practice, led by Ar. Jeanne Joseph.',
    introText:
      'The Cornerstone Architect shapes homes from the first line of the plan to the final finishing touch. Every project begins with how you live — the light you wake to, the rooms you gather in, the corners you retreat to — and is built outward from there.',
    introImage: null,
    philosophy: [
      { title: 'Space', text: 'Proportion, light and the way you move through a home are resolved first. A well-planned room needs very little to feel generous.' },
      { title: 'Material', text: 'Natural textures and honest finishes, chosen for how they feel and how they age, not only for how they photograph.' },
      { title: 'Function', text: 'Storage, routine and everyday use are drawn in early, so the home works as quietly as it looks.' },
      { title: 'Sensibility', text: 'Restraint over excess. Each element earns its place — the personality lives in the details.' },
    ],
    storyText:
      'Jeanne moves between architecture and interiors as one continuous conversation — about proportion, light and the personal details that make a space feel like yours.\n\n[A short personal note from Ar. Jeanne Joseph — to be supplied.]',
    storyImage: null,
    finishingImage: null,
  },
  about: {
    role: 'Architect & Interior Designer',
    portrait: null,
    intro: '[Personal introduction from Ar. Jeanne Joseph — a few paragraphs in her own voice: how she came to architecture, and what she cares about in a home.]',
    background: '[Professional background — education, practice history and experience. To be supplied by the studio.]',
    approach:
      'Architecture and interiors are not separate stages here. The same eye that resolves the plan carries through to the materials, the lighting and, finally, the furniture and objects that make a room lived-in.\n\nWe take the time to understand your space, your lifestyle and your personal taste before bringing the details together — so that what is built feels cohesive, warm and personal.',
    values: [
      { title: 'You first', text: 'Design begins with your lifestyle, your needs and how you live — not with a style.' },
      { title: 'Thoughtful selection', text: 'Every material, finish and piece is chosen with purpose.' },
      { title: 'Cohesive storytelling', text: 'A home should have flow, function and feeling, from room to room.' },
      { title: 'Relationship-driven', text: 'Guidance that helps you make confident decisions throughout the process.' },
    ],
    imageA: null,
    imageB: null,
  },
  finishing: {
    heroImage: null,
    heroText: 'Interior finishing & curation services. A signature service from The Cornerstone Architect.',
    whatWeDo:
      'A beautiful home is more than its fixed interiors. It is the furniture, lighting, textures, colours and personal details that bring a space together.\n\nWe curate these finishing elements around your existing interiors — from furniture and rugs to lighting, fabrics, art and décor, creating a home that feels cohesive, warm and personal.\n\nThrough personalised mood boards, thoughtful product research and guided showroom visits, we make the process of choosing the right pieces simple, enjoyable and uniquely yours.',
    whatImage: null,
    transformations: [
      { label: 'Living room', before: null, after: null },
      { label: 'Bedroom', before: null, after: null },
    ],
    detailsImage: null,
    experienceText:
      'The Finishing Touch is a guided design experience where every choice is made with intention. We take the time to understand your space, your lifestyle and your personal taste before bringing the details together.',
    experienceImage: null,
    moodImage: null,
    holisticText:
      'Our work doesn’t stop at curating the right pieces. We guide you in bringing them together with intention — placing, layering and styling each element where it belongs to create a space that feels harmonious, balanced and beautifully yours.',
    holisticImage: null,
    ctaImage: null,
  },
}

export function getContent() {
  const out = {}
  const rows = Object.fromEntries(db.prepare('SELECT key, value FROM content').all().map((r) => [r.key, JSON.parse(r.value)]))
  for (const [key, defaults] of Object.entries(DEFAULTS)) out[key] = { ...defaults, ...(rows[key] || {}) }
  return out
}

/** Only known keys/fields are stored; values keep the default's shape (string | null id | array). */
export function setContent(key, value) {
  const defaults = DEFAULTS[key]
  if (!defaults || typeof value !== 'object' || !value) return null
  const clean = {}
  for (const [field, def] of Object.entries(defaults)) {
    if (!(field in value)) continue
    const v = value[field]
    if (Array.isArray(def)) {
      if (!Array.isArray(v)) continue
      clean[field] = v.slice(0, 20).map((item) =>
        Object.fromEntries(Object.keys(def[0]).map((k) => [k, typeof item?.[k] === 'string' ? item[k].slice(0, 4000) : null])),
      )
    } else if (v === null || typeof v === 'string') {
      clean[field] = v === null ? null : v.slice(0, 8000)
    }
  }
  const merged = { ...(getContent()[key] || {}), ...clean }
  db.prepare('INSERT INTO content (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(merged))
  return merged
}
