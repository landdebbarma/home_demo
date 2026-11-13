import sharp from 'sharp'
import { randomBytes } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { db, UPLOAD_DIR } from './db.js'

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const FORMATS = { jpeg: 'jpg', png: 'png', webp: 'webp', avif: 'avif', heif: 'heic', tiff: 'tif' }
const WIDTHS = [480, 960, 1600, 2400]

/** Validate an uploaded image buffer, keep the original, write responsive AVIF + WebP variants. */
export async function ingest(buffer, originalName, alt = '') {
  if (buffer.length > MAX_UPLOAD_BYTES) throw new HttpError(413, 'Image is larger than 25 MB.')
  let meta
  try {
    meta = await sharp(buffer, { limitInputPixels: 120e6 }).metadata()
  } catch {
    throw new HttpError(415, `"${originalName}" is not a readable image.`)
  }
  const ext = FORMATS[meta.format]
  if (!ext) throw new HttpError(415, `"${originalName}": ${meta.format} images are not supported. Use JPEG, PNG, WebP, AVIF, HEIC or TIFF.`)

  const id = randomBytes(10).toString('hex')
  const dir = join(UPLOAD_DIR, id)
  mkdirSync(dir, { recursive: true })
  try {
    writeFileSync(join(dir, `original.${ext}`), buffer)
    const base = sharp(buffer, { limitInputPixels: 120e6 }).rotate() // honour EXIF orientation
    const { width, height } = await base.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info)
    const widths = WIDTHS.filter((w) => w < width)
    if (width <= 2400) widths.push(width)
    else widths.push(2400)
    const unique = [...new Set(widths)].sort((a, b) => a - b)
    await Promise.all(
      unique.flatMap((w) => {
        const r = base.clone().resize({ width: w, withoutEnlargement: true })
        return [
          r.clone().webp({ quality: 80 }).toFile(join(dir, `${w}.webp`)),
          r.clone().avif({ quality: 52, effort: 3 }).toFile(join(dir, `${w}.avif`)),
        ]
      }),
    )
    db.prepare('INSERT INTO media (id, original_name, ext, width, height, widths, alt, created_at) VALUES (?,?,?,?,?,?,?,?)').run(
      id, originalName.slice(0, 200), ext, width, height, JSON.stringify(unique), alt.slice(0, 300), Date.now(),
    )
    return mediaRow(id)
  } catch (e) {
    rmSync(dir, { recursive: true, force: true })
    throw e
  }
}

export function mediaRow(id) {
  const m = db.prepare('SELECT * FROM media WHERE id = ?').get(id)
  return m ? { id: m.id, w: m.width, h: m.height, widths: JSON.parse(m.widths), alt: m.alt, name: m.original_name, createdAt: m.created_at } : null
}

export function isReferenced(id) {
  return Boolean(
    db.prepare('SELECT 1 FROM projects WHERE cover_media_id = ?').get(id) ||
      db.prepare('SELECT 1 FROM project_images WHERE media_id = ?').get(id) ||
      db.prepare('SELECT 1 FROM content WHERE instr(value, ?) > 0').get(id),
  )
}

/** Delete media rows + files that nothing references any more. Safe to call with any ids. */
export function collectGarbage(ids) {
  for (const id of new Set(ids.filter(Boolean))) {
    if (isReferenced(id)) continue
    db.prepare('DELETE FROM media WHERE id = ?').run(id)
    rmSync(join(UPLOAD_DIR, id), { recursive: true, force: true })
  }
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
