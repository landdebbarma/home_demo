// Upload pipeline: validate by decoding, generate responsive WebP, store as Git blobs.
// Blobs are not committed here — the next content save commits them together with the JSON.
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { createBlob } from './github.js'

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 // Vercel functions accept ~4.5 MB bodies; the admin downsizes before upload.
const WIDTHS = [480, 960, 1600, 2400]
const FORMATS = new Set(['jpeg', 'png', 'webp'])

export class ImageError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/** folder: "projects/<slug>" or "site". Returns { image, files: [{ path, sha }] }. */
export async function processUpload(buffer, name, folder) {
  if (!/^(projects\/[a-z0-9-]{1,80}|site)$/.test(folder)) throw new ImageError(400, 'Invalid upload folder.')
  if (buffer.length > MAX_UPLOAD_BYTES) throw new ImageError(413, `"${name}" is too large (max 4 MB after resizing).`)
  let meta
  try {
    meta = await sharp(buffer, { limitInputPixels: 60e6 }).metadata()
  } catch {
    throw new ImageError(415, `"${name}" is not a readable image.`)
  }
  if (!FORMATS.has(meta.format)) throw new ImageError(415, `"${name}": only JPEG, PNG and WebP images are supported.`)

  // Same picture uploaded twice -> same id -> same files (no duplicates in the repository).
  const id = createHash('sha256').update(buffer).digest('hex').slice(0, 12)
  const base = sharp(buffer, { limitInputPixels: 60e6 }).rotate()
  const { width, height } = (await base.clone().toBuffer({ resolveWithObject: true })).info
  const top = Math.min(width, 2400)
  const widths = [...new Set([...WIDTHS.filter((w) => w < top), top])]
  const path = `/uploads/${folder}/${id}`
  const files = await Promise.all(
    widths.map(async (w) => {
      const out = await base.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
      return { path: `public${path}-${w}.webp`, sha: await createBlob(out) }
    }),
  )
  return {
    image: { id, path, w: width, h: height, widths, alt: '', caption: '' },
    files,
  }
}
