import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, tx } from './db.js'
import { ingest } from './media.js'
import { setContent } from './content.js'

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), 'seed-assets')

/** First-run only: imports brochure imagery and creates clearly-labelled sample projects. */
export async function seedIfEmpty() {
  const empty = !db.prepare('SELECT 1 FROM media').get() && !db.prepare('SELECT 1 FROM projects').get() && !db.prepare('SELECT 1 FROM content').get()
  if (!empty) return
  console.log('[seed] Fresh database — importing brochure imagery and sample content…')

  const alt = {
    'living-room': 'Living room with a pale sofa, lit wall niches and two pendant lights',
    'samples-wall': 'Two women choosing material samples from a wall display',
    'curated-objects': 'Styled vase, framed art, table lamp, cushion and fabric swatches',
    'material-palette': 'Hands arranging tile, stone, timber and fabric samples on a floor plan',
    'mood-board': 'Mood board with a living room, material swatches, colour chips and furniture',
    'styling-shelves': 'A designer styling objects on open metal shelving',
    consultation: 'Hands arranging fabric and stone samples during a consultation',
    'ba1-before': 'Empty living room before styling',
    'ba1-after': 'The same living room after styling, with sofa, rug, lighting and plants',
    'ba2-before': 'Empty bedroom before styling',
    'ba2-after': 'The same bedroom after styling, with bed, side tables, lamps and artwork',
  }
  const m = {}
  for (const [name, text] of Object.entries(alt)) {
    m[name] = (await ingest(readFileSync(join(ASSETS, `${name}.jpg`)), `${name}.jpg`, text)).id
  }

  setContent('home', {
    heroImage: m['ba1-after'],
    introImage: m['material-palette'],
    storyImage: m['styling-shelves'],
    finishingImage: m.consultation,
  })
  setContent('about', { imageA: m['samples-wall'], imageB: m['curated-objects'] })
  setContent('finishing', {
    heroImage: m['living-room'],
    whatImage: m['samples-wall'],
    transformations: [
      { label: 'Living room', before: m['ba1-before'], after: m['ba1-after'] },
      { label: 'Bedroom', before: m['ba2-before'], after: m['ba2-after'] },
    ],
    detailsImage: m['curated-objects'],
    experienceImage: m['material-palette'],
    moodImage: m['mood-board'],
    holisticImage: m['styling-shelves'],
    ctaImage: m.consultation,
  })

  const note =
    '[Sample project — this entry exists to demonstrate the layout. Replace the title, text and images from the admin dashboard, or delete it.]'
  const samples = [
    { slug: 'sample-project-01', title: 'Sample Project 01', category: 'Residential Interior', cover: 'ba1-after', gallery: ['living-room', 'ba1-before', 'curated-objects', 'mood-board'] },
    { slug: 'sample-project-02', title: 'Sample Project 02', category: 'Interior Styling', cover: 'ba2-after', gallery: ['ba2-before', 'styling-shelves', 'material-palette'] },
    { slug: 'sample-project-03', title: 'Sample Project 03', category: 'Residential Interior', cover: 'living-room', gallery: ['mood-board', 'curated-objects', 'consultation'] },
  ]
  tx(() => {
    samples.forEach((s, i) => {
      const now = Date.now()
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO projects (slug, title, category, location, year, summary, body, status, featured, sort, cover_media_id, cover_alt, meta, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,'published',1,?,?,?,?,?,?)`,
        )
        .run(s.slug, s.title, s.category, 'Bengaluru', '', note, '[Project narrative — the brief, the site, the key design moves and the materials.]', i, m[s.cover], alt[s.cover], JSON.stringify([{ label: 'Scope', value: '[To be supplied]' }]), now, now)
      s.gallery.forEach((g, pos) =>
        db.prepare('INSERT INTO project_images (project_id, media_id, caption, alt, position) VALUES (?,?,?,?,?)').run(lastInsertRowid, m[g], '', alt[g], pos),
      )
    })
  })
  console.log('[seed] Done.')
}
