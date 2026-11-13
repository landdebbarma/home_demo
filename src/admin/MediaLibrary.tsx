import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type Media } from '../lib/site'
import { errText, PageTitle, Thumb, upload, useUi } from './Admin'
import { Uploader } from './ProjectEditor'

function useMedia() {
  const { toast } = useUi()
  const [list, setList] = useState<Media[] | null>(null)
  const load = useCallback(() => api<{ media: Media[] }>('/api/admin/media').then((r) => setList(r.media)).catch((e) => toast(errText(e), 'error')), [toast])
  useEffect(() => { load() }, [load])
  const add = async (files: File[], progress: (n: number) => void) => {
    const r = await upload<{ added: Media[]; errors: string[] }>('/api/admin/media', files, progress)
    if (r.errors.length) toast(`Some images were skipped: ${r.errors.join(' ')}`, 'error')
    else toast(`${r.added.length} image${r.added.length > 1 ? 's' : ''} uploaded.`)
    await load()
    return r.added
  }
  return { list, load, add }
}

export default function MediaLibrary() {
  const { toast, confirm } = useUi()
  const { list, load, add } = useMedia()

  async function saveAlt(m: Media, alt: string) {
    if (alt === m.alt) return
    try {
      await api(`/api/admin/media/${m.id}`, { method: 'PATCH', json: { alt } })
      toast('Alt text saved.')
      load()
    } catch (e) {
      toast(errText(e), 'error')
    }
  }

  async function remove(m: Media) {
    if (!(await confirm({ title: 'Delete this image?', body: `“${m.name}” will be permanently deleted from the library.`, action: 'Delete image' }))) return
    try {
      await api(`/api/admin/media/${m.id}`, { method: 'DELETE' })
      toast('Image deleted.')
      load()
    } catch (e) {
      toast(errText(e), 'error')
    }
  }

  return (
    <>
      <PageTitle>Media Library</PageTitle>
      <p className="mb-5 max-w-2xl text-sm text-ink-soft">
        All images on the website. Images uploaded here can be used on the Website Content pages. Every upload is automatically optimised into
        responsive WebP and AVIF versions. Images that are in use cannot be deleted until they are removed from their page or project.
      </p>
      <Uploader multiple label="Upload images" onFiles={async (f, p) => { await add(f, p) }} />
      {!list ? <p className="mt-6">Loading…</p> : (
        <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
          {list.map((m) => (
            <li key={m.id} className="grid content-start gap-2 rounded border border-ink/10 bg-white p-2.5">
              <Thumb media={m} className="aspect-[4/3] w-full rounded-sm" />
              <p className="truncate text-xs text-ink-soft" title={m.name}>{m.name} · {m.w}×{m.h}</p>
              <input aria-label={`Alt text for ${m.name}`} defaultValue={m.alt} onBlur={(e) => saveAlt(m, e.target.value)} placeholder="Alt text" className="ainput text-sm" />
              <div className="flex items-center justify-between">
                <span className={`text-[11px] uppercase tracking-wider ${m.inUse ? 'text-[#3F5230]' : 'text-ink-soft'}`}>{m.inUse ? 'In use' : 'Not used'}</span>
                <button type="button" className="abtn abtn-danger px-3 py-1 text-sm" disabled={m.inUse} title={m.inUse ? 'In use on the website' : undefined} onClick={() => remove(m)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/** Modal to pick an image from the library (or upload a new one). */
export function MediaPicker({ open, onPick, onClose }: { open: boolean; onPick: (m: Media) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const { list, add } = useMedia()
  useEffect(() => {
    if (open) ref.current?.showModal()
    else ref.current?.close()
  }, [open])
  return (
    <dialog ref={ref} onClose={onClose} className="m-auto h-[85vh] w-[min(94vw,1000px)] max-w-none rounded bg-ivory p-0 text-ink backdrop:bg-ink/50">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-ink/10 p-4">
          <h2 className="font-serif text-2xl">Choose an image</h2>
          <button type="button" className="abtn" onClick={onClose}>Close</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <Uploader multiple={false} label="Upload a new image" onFiles={async (f, p) => { const [m] = await add(f, p); if (m) onPick(m) }} />
          <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {list?.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => onPick(m)} className="block w-full rounded border border-transparent p-1 text-left hover:border-ink focus-visible:border-ink">
                  <Thumb media={m} className="aspect-[4/3] w-full rounded-sm" />
                  <span className="mt-1 block truncate text-xs text-ink-soft">{m.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </dialog>
  )
}
