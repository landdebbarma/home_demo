import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent, type ReactNode } from 'react'
import { Link, useRouter } from '../lib/router'
import { ApiError, ImageUrlContext, SiteProvider, type Media, type Project } from '../lib/site'
import { ProjectView } from '../pages/ProjectDetail'
import { errText, PageTitle, StatusBadge, Thumb, useUi } from './Admin'
import { ACCEPT, merge3, newId, uniqueSlug, useAdmin } from './store'

const blank = (): Project => ({
  id: newId(), slug: '', title: '', category: '', location: '', year: '', summary: '', body: '',
  status: 'draft', featured: false, order: 0, cover: null, gallery: [], meta: [], createdAt: Date.now(), updatedAt: Date.now(),
})
const DRAFT_KEY = (id: string) => `tca-draft-${id}`
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export default function ProjectEditor({ id }: { id: string }) {
  const { toast, confirm } = useUi()
  const { navigate } = useRouter()
  const { data, save, load, upload, imageUrl } = useAdmin()
  const isNew = id === 'new'
  const stored = isNew ? null : data!.projects.find((p) => p.id === id) ?? null
  const [original] = useState<Project | null>(() => (isNew ? blank() : stored))
  const [draft, setDraft] = useState<Project | null>(original)
  const [started, setStarted] = useState<Project | null>(original) // the saved version this draft is based on
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [recovered, setRecovered] = useState<{ draft: Project; at: number } | null>(() => {
    try {
      const r = JSON.parse(localStorage.getItem(DRAFT_KEY(id)) || 'null')
      return r && original && !same(r.draft, original) ? r : null
    } catch { return null }
  })

  const base = stored ?? original
  const dirty = !!draft && !!base && !same(draft, base)

  // Keep unsaved work in the browser until it is committed.
  useEffect(() => {
    if (!draft || !dirty || recovered) return
    try { localStorage.setItem(DRAFT_KEY(id), JSON.stringify({ draft, at: Date.now() })) } catch { /* storage blocked */ }
  }, [draft, dirty, id, recovered])
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [dirty])

  if (!draft) return <p>Project not found. <Link href="/admin/projects" className="underline">All projects</Link></p>
  const projects = data!.projects
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setDraft((d) => d && { ...d, [k]: v })
  const folder = `projects/${draft.slug || draft.id}`
  const categories = [...new Set(projects.map((p) => p.category).filter(Boolean))]

  async function commit(status: Project['status'], verb: string) {
    if (!draft) return
    if (!draft.title.trim()) return toast('Please give the project a title.', 'error')
    if (status === 'published' && !draft.cover) return toast('Add a cover image before publishing.', 'error')
    const neverSaved = !projects.some((p) => p.id === draft.id)
    const next: Project = {
      ...draft,
      title: draft.title.trim(),
      slug: draft.slug || uniqueSlug(draft.title, projects, draft.id),
      status,
      order: neverSaved ? Math.max(-1, ...projects.map((p) => p.order)) + 1 : draft.order,
      updatedAt: Date.now(),
    }
    const list = neverSaved ? [...projects, next] : projects.map((p) => (p.id === next.id ? next : p))
    setSaving(true)
    setConflict(null)
    try {
      const saved = await save({ projects: list, message: `${verb} "${next.title}"` })
      try { localStorage.removeItem(DRAFT_KEY(id)) } catch { /* ignore */ }
      const canonical = saved.projects.find((p) => p.id === next.id) ?? next // the server's normalised copy
      setDraft(canonical)
      setStarted(canonical)
      toast(status === 'published' ? 'Saved — publishing to the website (see status in the sidebar).' : 'Saved to GitHub.')
      if (isNew) navigate(`/admin/projects/${next.id}`, { replace: true })
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setConflict(e.message)
      else toast(errText(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!draft) return
    if (isNew || !projects.some((p) => p.id === draft.id)) return navigate('/admin/projects')
    const ok = await confirm({ title: 'Delete this project?', body: `“${draft.title}” and its ${draft.gallery.length + (draft.cover ? 1 : 0)} image(s) will be removed from the website and the repository.`, action: 'Delete project' })
    if (!ok) return
    setSaving(true)
    try {
      await save({ projects: projects.filter((p) => p.id !== draft.id), message: `Delete "${draft.title}"` })
      try { localStorage.removeItem(DRAFT_KEY(id)) } catch { /* ignore */ }
      toast(`“${draft.title}” deleted.`)
      navigate('/admin/projects')
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setConflict(e.message)
      else toast(errText(e), 'error')
      setSaving(false)
    }
  }

  const live = draft.status === 'published'
  const savedStatus = stored?.status
  return (
    <div className="pb-28">
      <PageTitle actions={<>
        {savedStatus && <StatusBadge status={savedStatus} />}
        <button type="button" className="abtn" onClick={() => setPreview(true)}>Preview</button>
        {stored?.status === 'published' && <a className="abtn" href={`/projects/${stored.slug}`} target="_blank" rel="noopener">View on website ↗</a>}
      </>}>
        {draft.title || 'New project'}
      </PageTitle>
      <p className="-mt-5 mb-6 text-sm"><Link href="/admin/projects" className="underline-offset-4 hover:underline">← All projects</Link></p>

      {recovered && (
        <Banner tone="info">
          You have unsaved changes from {new Date(recovered.at).toLocaleString('en-IN')}.
          <button type="button" className="abtn ml-3" onClick={() => { setDraft(recovered.draft); setRecovered(null) }}>Restore them</button>
          <button type="button" className="abtn ml-2" onClick={() => { try { localStorage.removeItem(DRAFT_KEY(id)) } catch { /* ignore */ } setRecovered(null) }}>Discard</button>
        </Banner>
      )}
      {conflict && (
        <Banner tone="error">
          {conflict}
          <button type="button" className="abtn ml-3" onClick={async () => {
            const fresh = await load()
            if (!fresh) return
            setConflict(null)
            const latest = fresh.projects.find((p) => p.id === draft.id)
            if (!latest) return toast('This project was deleted elsewhere. Saving will add it back.', 'error')
            // Keep only the fields changed here; take everything else from the latest version.
            const { merged, both } = merge3(draft, started ?? latest, latest)
            setDraft(merged)
            setStarted(latest)
            toast(both.length
              ? `Loaded the latest version. These were changed both here and elsewhere: ${both.join(', ')} — your version is kept; review before saving.`
              : 'Loaded the latest version and kept your changes. Review and save again.')
          }}>Load latest version</button>
        </Banner>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-8">
          <Panel title="Project details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Text label="Title" value={draft.title} required className="sm:col-span-2"
                onChange={(v) => setDraft((d) => d && { ...d, title: v, ...(!projects.some((p) => p.id === d.id) ? { slug: uniqueSlug(v, projects, d.id) } : {}) })} />
              <label className="grid gap-1.5">
                <span className="font-medium">Category</span>
                <input list="cats" value={draft.category} onChange={(e) => set('category', e.target.value)} className="ainput" placeholder="e.g. Residential Interior" />
                <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </label>
              <Text label="Location" value={draft.location} onChange={(v) => set('location', v)} placeholder="e.g. Bengaluru" />
              <Text label="Year" value={draft.year} onChange={(v) => set('year', v)} placeholder="e.g. 2025" />
              <Text label="Web address" value={draft.slug} onChange={(v) => set('slug', v.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} hint={`/projects/${draft.slug}`} />
            </div>
            <Area label="Short description" hint="One or two sentences. Shown at the top of the project page and in search results." value={draft.summary} onChange={(v) => set('summary', v)} rows={3} />
            <Area label="Full project description" hint="Separate paragraphs with a blank line." value={draft.body} onChange={(v) => set('body', v)} rows={10} />
          </Panel>

          <Panel title="Gallery" hint="Drag images to reorder (or use the arrows). Captions are optional; alt text describes the image for people using screen readers.">
            <Gallery images={draft.gallery} folder={folder} upload={upload} onChange={(g) => set('gallery', g)} />
          </Panel>
        </div>

        <div className="grid content-start gap-8">
          <Panel title="Publishing">
            <p className="text-sm text-ink-soft">
              {savedStatus === 'published' ? 'This project is on the website.' : savedStatus === 'unpublished' ? 'Unpublished — hidden from the website.' : 'Draft — only visible here in the admin.'}
            </p>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={draft.featured} onChange={(e) => set('featured', e.target.checked)} className="size-4 accent-ink" />
              Feature on the homepage
            </label>
            <Text label="Display order" type="number" value={String(draft.order)} onChange={(v) => set('order', Math.trunc(Number(v)) || 0)} hint="Lower numbers appear first." />
          </Panel>

          <Panel title="Cover image" hint="The main image on the projects page and at the top of the project.">
            {draft.cover && <img src={imageUrl(draft.cover, draft.cover.widths.find((w) => w >= 960) ?? draft.cover.widths.at(-1)!)} alt="Current cover" className="aspect-[4/3] w-full rounded-sm bg-sand object-cover" />}
            <Uploader label={draft.cover ? 'Replace cover image' : 'Upload cover image'}
              onFiles={async ([file], progress) => {
                const img = await upload(file, folder, progress)
                set('cover', { ...img, alt: draft.cover?.alt || '' })
              }} />
            {draft.cover && <Text label="Cover alt text" value={draft.cover.alt} onChange={(v) => set('cover', { ...draft.cover!, alt: v })} placeholder="Describe the image" />}
          </Panel>

          <Panel title="Additional details" hint="Optional facts shown beside the description, e.g. Area — 2,400 sq ft.">
            <MetaEditor meta={draft.meta} onChange={(m) => set('meta', m)} />
          </Panel>

          <Panel title="Danger zone">
            <button type="button" className="abtn abtn-danger" disabled={saving} onClick={remove}>{isNew ? 'Discard new project' : 'Delete project'}</button>
          </Panel>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-ivory/95 backdrop-blur lg:left-[250px]">
        <div className="flex flex-wrap items-center justify-end gap-3 px-5 py-3 md:px-10">
          <span className="mr-auto text-sm text-ink-soft" aria-live="polite">{saving ? 'Saving to GitHub…' : dirty ? 'You have unsaved changes.' : 'No unsaved changes.'}</span>
          {live && savedStatus === 'published' ? (
            <>
              <button type="button" disabled={saving} className="abtn" onClick={() => commit('unpublished', 'Unpublish')}>Unpublish</button>
              <button type="button" disabled={saving || !dirty} className="abtn abtn-primary" onClick={() => commit('published', 'Update')}>Save changes</button>
            </>
          ) : (
            <>
              <button type="button" disabled={saving || (!dirty && !isNew)} className="abtn" onClick={() => commit(savedStatus === 'unpublished' ? 'unpublished' : 'draft', isNew ? 'Create draft' : 'Update draft')}>Save draft</button>
              <button type="button" disabled={saving} className="abtn abtn-primary" onClick={() => commit('published', 'Publish')}>Publish</button>
            </>
          )}
        </div>
      </div>

      {preview && <Preview project={draft} onClose={() => setPreview(false)} />}
    </div>
  )
}

function Banner({ tone, children }: { tone: 'info' | 'error'; children: ReactNode }) {
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`mb-6 flex flex-wrap items-center gap-y-2 rounded border p-4 text-sm ${tone === 'error' ? 'border-[#7A2A2A]/40 bg-[#F7E9E9]' : 'border-ink/20 bg-white'}`}>{children}</div>
}

/** The public project page, rendered from the unsaved draft. */
function Preview({ project, onClose }: { project: Project; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const { data, imageUrl } = useAdmin()
  const site = useMemo(() => ({ ready: true as const, content: data!.site, projects: [] }), [data])
  useEffect(() => { ref.current?.showModal() }, [])
  const stopLinks = (e: MouseEvent) => (e.target as HTMLElement).closest('a') && e.preventDefault()
  return (
    <dialog ref={ref} onClose={onClose} aria-label="Project preview" className="m-0 h-dvh max-h-none w-screen max-w-none bg-ivory p-0 font-sans font-light text-ink">
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-ink px-5 py-3 text-sm text-ivory">
        <span>Preview — not saved{project.status !== 'published' ? ' · not published' : ''}</span>
        <button type="button" className="abtn" onClick={() => ref.current?.close()}>Close preview</button>
      </div>
      <div onClickCapture={stopLinks}>
        <SiteProvider value={site}>
          <ImageUrlContext.Provider value={imageUrl}>
            <ProjectView project={{ ...project, title: project.title || 'Untitled project' }} prev={null} next={null} />
          </ImageUrlContext.Provider>
        </SiteProvider>
      </div>
    </dialog>
  )
}

// ---------- form pieces ----------
function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 rounded border border-ink/10 bg-white p-5 md:p-6">
      <div>
        <h2 className="font-serif text-2xl">{title}</h2>
        {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Text({ label, value, onChange, hint, className = '', ...rest }: { label: string; value: string; onChange: (v: string) => void; hint?: string; className?: string; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="font-medium">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="ainput" {...rest} />
      {hint && <span className="text-sm text-ink-soft">{hint}</span>}
    </label>
  )
}

function Area({ label, value, onChange, hint, rows }: { label: string; value: string; onChange: (v: string) => void; hint?: string; rows: number }) {
  return (
    <label className="grid gap-1.5">
      <span className="font-medium">{label}</span>
      {hint && <span className="text-sm text-ink-soft">{hint}</span>}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="ainput leading-relaxed" />
    </label>
  )
}

function MetaEditor({ meta, onChange }: { meta: Project['meta']; onChange: (m: Project['meta']) => void }) {
  const upd = (i: number, k: 'label' | 'value', v: string) => onChange(meta.map((m, j) => (j === i ? { ...m, [k]: v } : m)))
  return (
    <div className="grid gap-3">
      {meta.map((m, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
          <input aria-label="Detail name" value={m.label} onChange={(e) => upd(i, 'label', e.target.value)} placeholder="e.g. Area" className="ainput" />
          <input aria-label="Detail value" value={m.value} onChange={(e) => upd(i, 'value', e.target.value)} placeholder="e.g. 2,400 sq ft" className="ainput" />
          <button type="button" className="abtn px-3" aria-label="Remove detail" onClick={() => onChange(meta.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <div><button type="button" className="abtn" onClick={() => onChange([...meta, { label: '', value: '' }])}>+ Add detail</button></div>
    </div>
  )
}

/** File picker + drop zone. Files are resized in the browser, then uploaded one at a time with progress. */
export function Uploader({ multiple, label, onFiles }: { multiple?: boolean; label: string; onFiles: (files: File[], progress: (n: number) => void) => Promise<void> }) {
  const { toast } = useUi()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  async function handle(list: FileList | null) {
    const files = [...(list ?? [])]
    if (!files.length) return
    try {
      await onFiles(files, (pct) => setStatus(pct < 100 ? `Uploading… ${pct}%` : 'Optimising…'))
    } catch (e) {
      toast(errText(e), 'error')
    } finally {
      setStatus(null)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true) } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setOver(false); handle(e.dataTransfer.files) } }}
      className={`rounded border-2 border-dashed p-5 text-center transition-colors ${over ? 'border-ink bg-linen' : 'border-ink/20'}`}
    >
      {status ? (
        <p role="status" className="text-sm text-ink-soft">{status}</p>
      ) : (
        <>
          <button type="button" className="abtn" onClick={() => input.current?.click()}>{label}</button>
          <p className="mt-2 text-sm text-ink-soft">or drag {multiple ? 'images' : 'an image'} here · JPEG, PNG or WebP · large photos are resized automatically</p>
        </>
      )}
      <input ref={input} type="file" accept={ACCEPT} multiple={multiple} className="hidden" onChange={(e) => handle(e.target.files)} />
    </div>
  )
}

function Gallery({ images, folder, upload, onChange }: { images: Media[]; folder: string; upload: ReturnType<typeof useAdmin>['upload']; onChange: (i: Media[]) => void }) {
  const { toast, confirm } = useUi()
  const dragFrom = useRef<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const latest = useRef(images) // the uploader appends across awaits, so it needs the newest list
  useEffect(() => { latest.current = images }, [images])

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return
    const next = [...images]
    const [it] = next.splice(from, 1)
    next.splice(to, 0, it)
    onChange(next)
  }
  const edit = (i: number, k: 'caption' | 'alt', v: string) => onChange(images.map((im, j) => (j === i ? { ...im, [k]: v } : im)))

  async function replace(i: number, file: File | undefined) {
    if (!file) return
    try {
      const img = await upload(file, folder)
      onChange(latest.current.map((im, j) => (j === i ? { ...img, caption: im.caption, alt: im.alt } : im)))
      toast('Image replaced — save to keep the change.')
    } catch (e) {
      toast(errText(e), 'error')
    }
  }

  return (
    <div className="grid gap-5">
      <Uploader
        multiple
        label="Add gallery images"
        onFiles={async (files, progress) => {
          let added = 0
          for (const [n, f] of files.entries()) {
            const img = await upload(f, folder, (pct) => progress(Math.round(((n + pct / 100) / files.length) * 100)))
            if (latest.current.some((x) => x.id === img.id)) {
              toast(`“${f.name}” is already in this gallery.`, 'error')
              continue
            }
            latest.current = [...latest.current, img]
            onChange(latest.current)
            added++
          }
          if (added) toast(`${added} image${added > 1 ? 's' : ''} added — save to keep them.`)
        }}
      />
      {!images.length && <p className="text-sm text-ink-soft">No gallery images yet.</p>}
      <ol className="grid gap-3">
        {images.map((img, i) => (
          <li
            key={img.id}
            draggable
            onDragStart={(e: DragEvent) => { dragFrom.current = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }}
            onDragOver={(e) => { if (dragFrom.current !== null) { e.preventDefault(); setOverIdx(i) } }}
            onDragLeave={() => setOverIdx((o) => (o === i ? null : o))}
            onDrop={(e) => { e.preventDefault(); if (dragFrom.current !== null) move(dragFrom.current, i); dragFrom.current = null; setOverIdx(null) }}
            onDragEnd={() => { dragFrom.current = null; setOverIdx(null) }}
            className={`grid grid-cols-[auto_1fr] gap-4 rounded border bg-[#FCFBF8] p-3 sm:grid-cols-[auto_auto_1fr_auto] ${overIdx === i ? 'border-ink' : 'border-ink/10'}`}
          >
            <span className="flex cursor-grab select-none flex-col items-center justify-center text-ink-soft active:cursor-grabbing" title="Drag to reorder" aria-hidden="true">⋮⋮<span className="text-xs">{i + 1}</span></span>
            <Thumb media={img} className="h-24 w-32 rounded-sm" />
            <div className="col-span-2 grid gap-2 sm:col-span-1">
              <input aria-label={`Caption for image ${i + 1}`} value={img.caption} onChange={(e) => edit(i, 'caption', e.target.value)} placeholder="Caption (optional)" className="ainput" />
              <input aria-label={`Alt text for image ${i + 1}`} value={img.alt} onChange={(e) => edit(i, 'alt', e.target.value)} placeholder="Alt text — describe the image" className="ainput" />
            </div>
            <div className="col-span-2 flex flex-wrap items-start gap-1.5 sm:col-span-1 sm:flex-col">
              <div className="flex gap-1.5">
                <button type="button" className="abtn px-3" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move image ${i + 1} up`}>↑</button>
                <button type="button" className="abtn px-3" onClick={() => move(i, i + 1)} disabled={i === images.length - 1} aria-label={`Move image ${i + 1} down`}>↓</button>
              </div>
              <label className="abtn cursor-pointer">
                Replace
                <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => replace(i, e.target.files?.[0])} />
              </label>
              <button type="button" className="abtn abtn-danger" onClick={async () => {
                if (await confirm({ title: 'Remove this image?', body: 'It will be removed from the gallery, and its files deleted from the repository when you save.', action: 'Remove image' })) {
                  onChange(images.filter((_, j) => j !== i))
                }
              }}>Delete</button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
