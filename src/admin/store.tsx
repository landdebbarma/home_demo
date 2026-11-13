import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, type Content, type Media, type Project } from '../lib/site'

type Base = { projects: string | null; site: string | null }
type Data = { projects: Project[]; site: Content; base: Base; head: string }
type PendingFile = { path: string; sha: string }
export type Deploy = { commit: string; message: string; state: 'deploying' | 'live' | 'failed' | 'unknown'; url: string | null; at: number }

type Store = {
  data: Data | null
  error: string | null
  /** Re-reads canonical content from GitHub; resolves to it (or null if loading failed). */
  load: () => Promise<Data | null>
  /** One commit. Throws ApiError (409 on conflicts); local edits are untouched on failure. */
  save: (change: { projects?: Project[]; site?: Content; message: string }) => Promise<{ projects: Project[]; site: Content }>
  upload: (file: File, folder: string, onProgress?: (pct: number) => void) => Promise<Media>
  imageUrl: (m: Media, w: number) => string
  deploys: Deploy[]
}
const Ctx = createContext<Store>(null!)
export const useAdmin = () => useContext(Ctx)

// Uploaded-but-uncommitted files (blob SHAs on GitHub). Kept in localStorage so a reload doesn't strand them.
const PENDING_KEY = 'tca-pending-files'
const readPending = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '{}') } catch { return {} }
}
const writePending = (p: Record<string, string>) => {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)) } catch { /* storage blocked */ }
}

const fetchContent = async (): Promise<Data> => {
  const r = await api<{ projects: { projects: Project[] }; site: Content; base: Base; head: string }>('/api/admin/content')
  return { projects: r.projects.projects, site: r.site, base: r.base, head: r.head }
}

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deploys, setDeploys] = useState<Deploy[]>([])
  const previews = useRef(new Map<string, string>()) // image id -> object URL of the uploaded (resized) file

  const load = useCallback(() => fetchContent().then(
    (next) => { setData(next); setError(null); return next },
    (e) => { setError(e instanceof Error ? e.message : 'Could not load content.'); return null },
  ), [])
  useEffect(() => {
    fetchContent().then(
      (next) => { setData(next); setError(null) },
      (e) => setError(e instanceof Error ? e.message : 'Could not load content.'),
    )
  }, [])

  const save = useCallback<Store['save']>(async ({ projects, site, message }) => {
    if (!data) throw new Error('Content not loaded yet.')
    const pending = readPending()
    const r = await api<{ commit: string; projects: { projects: Project[] }; site: Content; base: Base }>('/api/admin/commit', {
      method: 'POST',
      json: {
        message,
        base: data.base,
        ...(projects ? { projects: { projects } } : {}),
        ...(site ? { site } : {}),
        uploads: Object.entries(pending).map(([path, sha]) => ({ path, sha })),
      },
    })
    writePending({}) // committed (or no longer referenced, which the server ignores)
    setData({ projects: r.projects.projects, site: r.site, base: r.base, head: r.commit })
    setDeploys((d) => [{ commit: r.commit, message, state: 'deploying' as const, url: null, at: Date.now() }, ...d].slice(0, 6))
    return { projects: r.projects.projects, site: r.site }
  }, [data])

  const upload = useCallback<Store['upload']>(async (file, folder, onProgress) => {
    const blob = await resize(file)
    const fd = new FormData()
    fd.append('file', blob, file.name.replace(/\.\w+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.jpg'))
    fd.append('folder', folder)
    const r = await xhrUpload<{ image: Media; files: PendingFile[] }>('/api/admin/upload', fd, onProgress)
    writePending({ ...readPending(), ...Object.fromEntries(r.files.map((f) => [f.path, f.sha])) })
    previews.current.set(r.image.id, URL.createObjectURL(blob))
    return r.image
  }, [])

  /** Not-yet-committed images show from memory; committed ones come straight from GitHub (they may not be deployed yet). */
  const imageUrl = useCallback((m: Media, w: number) => previews.current.get(m.id) ?? `/api/admin/file?p=${encodeURIComponent(`public${m.path}-${w}.webp`)}`, [])

  useDeployPolling(deploys, setDeploys)

  const value = useMemo(() => ({ data, error, load, save, upload, imageUrl, deploys }), [data, error, load, save, upload, imageUrl, deploys])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Poll GitHub (Vercel's deployment status) and the live site's build marker until each save is live or failed. */
function useDeployPolling(deploys: Deploy[], set: (f: (d: Deploy[]) => Deploy[]) => void) {
  const active = deploys.filter((d) => d.state === 'deploying').map((d) => d.commit).join(',')
  const latest = useRef(deploys)
  useEffect(() => { latest.current = deploys })
  useEffect(() => {
    if (!active) return
    const update = (commit: string, patch: Partial<Deploy>) => set((list) => list.map((d) => (d.commit === commit ? { ...d, ...patch } : d)))
    const tick = async () => {
      for (const d of latest.current.filter((x) => x.state === 'deploying')) {
        if (Date.now() - d.at > 15 * 60e3) { update(d.commit, { state: 'unknown' }); continue }
        try {
          // Only call it live once the site itself serves a build containing this commit (the same one or a later one).
          const v = await fetch('/version.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
          const live = typeof v?.commit === 'string' && /^[a-f0-9]{40}$/.test(v.commit) ? v.commit : ''
          const s = await api<{ state: string; url: string | null; live: boolean }>(`/api/admin/deploy?sha=${d.commit}${live ? `&live=${live}` : ''}`)
          if (s.live) update(d.commit, { state: 'live', url: s.url })
          else if (s.state === 'failure') update(d.commit, { state: 'failed', url: s.url })
        } catch { /* transient; try again next tick */ }
      }
    }
    tick()
    const t = setInterval(tick, 6000)
    return () => clearInterval(t)
  }, [active, set]) // re-subscribe when the set of in-flight deploys changes
}

const MAX_SIDE = 2400
const TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const ACCEPT = TYPES.join(',')

/** Downscale in the browser (keeps uploads under the serverless body limit); the server re-validates and re-encodes. */
async function resize(file: File): Promise<Blob> {
  if (!TYPES.includes(file.type)) throw new Error(`"${file.name}" is not a JPEG, PNG or WebP image.`)
  if (file.size > 40 * 1024 * 1024) throw new Error(`"${file.name}" is larger than 40 MB.`)
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error(`"${file.name}" could not be read as an image.`)
  })
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  const encode = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q))
  for (const q of [0.9, 0.8, 0.7]) {
    let blob = await encode('image/webp', q)
    if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg', q) // browsers without WebP encoding
    if (blob && blob.size <= 3.8 * 1024 * 1024) return blob
  }
  throw new Error(`"${file.name}" is still too large after resizing.`)
}

function xhrUpload<T>(url: string, body: FormData, onProgress?: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      let data: { error?: string } = {}
      try { data = JSON.parse(xhr.responseText) } catch { /* non-JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T)
      else reject(new ApiError(xhr.status, data.error || `Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Network error during upload.'))
    xhr.send(body)
  })
}

/**
 * Three-way merge after a conflict: fields this editor changed (vs. what it started from) keep the editor's
 * value; everything else takes the latest saved value. Returns the fields that changed on both sides.
 */
export function merge3<T extends object>(mine: T, started: T, latest: T): { merged: T; both: string[] } {
  const merged = { ...latest }
  const both: string[] = []
  for (const k of Object.keys(mine) as (keyof T)[]) {
    const changedHere = JSON.stringify(mine[k]) !== JSON.stringify(started[k])
    if (!changedHere) continue
    merged[k] = mine[k]
    if (JSON.stringify(latest[k]) !== JSON.stringify(started[k])) both.push(String(k))
  }
  return { merged, both }
}

export const newId = () => [...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(16).padStart(2, '0')).join('')
export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
export function uniqueSlug(title: string, projects: Project[], selfId: string) {
  const base = slugify(title) || 'project'
  let slug = base
  for (let i = 2; projects.some((p) => p.slug === slug && p.id !== selfId); i++) slug = `${base}-${i}`
  return slug
}
