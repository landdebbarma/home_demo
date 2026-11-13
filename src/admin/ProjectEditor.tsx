import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Link, useRouter } from '../lib/router'
import { api, mediaUrl, type Project, type ProjectImage } from '../lib/site'
import { ACCEPT, checkFiles, errText, PageTitle, StatusBadge, Thumb, upload, useUi } from './Admin'

type Fields = Pick<Project, 'title' | 'slug' | 'category' | 'location' | 'year' | 'summary' | 'body' | 'featured' | 'sort' | 'meta'> & { coverAlt: string }
type Img = Pick<ProjectImage, 'id' | 'caption' | 'alt' | 'media'>

const fieldsOf = (p: Project): Fields => ({
  title: p.title, slug: p.slug, category: p.category, location: p.location, year: p.year, summary: p.summary, body: p.body,
  featured: p.featured, sort: p.sort, meta: p.meta, coverAlt: p.cover?.alt ?? '',
})

/** Keep local order/caption edits; append images that are new on the server; drop deleted ones. */
function mergeImages(local: Img[], server: ProjectImage[]): Img[] {
  const byId = new Map(server.map((s) => [s.id, s]))
  const kept = local.filter((l) => byId.has(l.id)).map((l) => ({ ...l, media: byId.get(l.id)!.media }))
  const known = new Set(local.map((l) => l.id))
  return [...kept, ...server.filter((s) => !known.has(s.id))]
}

export default function ProjectEditor({ id }: { id: number }) {
  const { toast, confirm } = useUi()
  const { navigate } = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [f, setF] = useState<Fields | null>(null)
  const [images, setImages] = useState<Img[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    api<{ project: Project }>(`/api/admin/projects/${id}`)
      .then(({ project }) => { setProject(project); setF(fieldsOf(project)); setImages(project.images) })
      .catch((e) => toast(errText(e), 'error'))
    api<{ projects: { category: string }[] }>('/api/admin/projects').then((r) => setCategories([...new Set(r.projects.map((p) => p.category).filter(Boolean))]))
  }, [id, toast])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => { setF((x) => x && { ...x, [k]: v }); setDirty(true) }
  const setImgs = (next: Img[]) => { setImages(next); setDirty(true) }

  /** Server returned a fresh project after an immediate action (upload/delete/replace). */
  const applyServer = useCallback((p: Project) => {
    setProject(p)
    setImages((local) => mergeImages(local, p.images))
  }, [])

  async function save(status?: Project['status']) {
    if (!f || !project) return
    if (!f.title.trim()) return toast('Please give the project a title.', 'error')
    setSaving(true)
    try {
      const { project: p } = await api<{ project: Project }>(`/api/admin/projects/${id}`, {
        method: 'PUT',
        json: { ...f, status: status ?? project.status, images: images.map(({ id, caption, alt }) => ({ id, caption, alt })) },
      })
      setProject(p)
      setF(fieldsOf(p))
      setImages(p.images)
      setDirty(false)
      toast(status === 'published' ? 'Published — the project is now live on the website.' : status === 'unpublished' ? 'Unpublished — the project is hidden from the website.' : 'Changes saved.')
    } catch (e) {
      toast(errText(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!project) return
    const ok = await confirm({ title: 'Delete this project?', body: `“${project.title}” and all ${images.length} gallery image(s) will be permanently deleted. This cannot be undone.`, action: 'Delete project' })
    if (!ok) return
    try {
      await api(`/api/admin/projects/${id}`, { method: 'DELETE' })
      setDirty(false)
      toast(`“${project.title}” was deleted.`)
      navigate('/admin/projects')
    } catch (e) {
      toast(errText(e), 'error')
    }
  }

  if (!project || !f) return <p>Loading…</p>
  const live = project.status === 'published'

  return (
    <div className="pb-28">
      <PageTitle actions={<><StatusBadge status={project.status} />{live && <a className="abtn" href={`/projects/${project.slug}`} target="_blank" rel="noopener">View on website ↗</a>}</>}>
        {project.title || 'Untitled project'}
      </PageTitle>
      <p className="-mt-5 mb-8 text-sm"><Link href="/admin/projects" className="underline-offset-4 hover:underline">← All projects</Link></p>

      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-8">
          <Panel title="Project details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Text label="Title" value={f.title} onChange={(v) => set('title', v)} required className="sm:col-span-2" />
              <label className="grid gap-1.5">
                <span className="font-medium">Category</span>
                <input list="cats" value={f.category} onChange={(e) => set('category', e.target.value)} className="ainput" placeholder="e.g. Residential Interior" />
                <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </label>
              <Text label="Location" value={f.location} onChange={(v) => set('location', v)} placeholder="e.g. Bengaluru" />
              <Text label="Year" value={f.year} onChange={(v) => set('year', v)} placeholder="e.g. 2025" />
              <Text label="Web address" value={f.slug} onChange={(v) => set('slug', v)} hint={`/projects/${f.slug}`} />
            </div>
            <Area label="Short description" hint="One or two sentences. Shown at the top of the project page and in search results." value={f.summary} onChange={(v) => set('summary', v)} rows={3} />
            <Area label="Full project description" hint="Separate paragraphs with a blank line." value={f.body} onChange={(v) => set('body', v)} rows={10} />
          </Panel>

          <Panel title="Gallery" hint="Drag images to reorder (or use the arrows). Captions are optional; alt text describes the image for people using screen readers.">
            <Gallery projectId={id} images={images} onChange={setImgs} onServer={applyServer} />
          </Panel>
        </div>

        <div className="grid content-start gap-8">
          <Panel title="Publishing">
            <p className="text-sm text-ink-soft">
              {live ? 'This project is visible on the website.' : project.status === 'draft' ? 'Draft — only visible here in the admin.' : 'Unpublished — hidden from the website.'}
            </p>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={f.featured} onChange={(e) => set('featured', e.target.checked)} className="size-4 accent-ink" />
              Feature on the homepage
            </label>
            <Text label="Display order" type="number" value={String(f.sort)} onChange={(v) => set('sort', Number(v) || 0)} hint="Lower numbers appear first." />
          </Panel>

          <Panel title="Cover image" hint="The main image used on the projects page and at the top of the project.">
            <Cover project={project} onServer={applyServer} />
            <Text label="Cover alt text" value={f.coverAlt} onChange={(v) => set('coverAlt', v)} placeholder="Describe the image" />
          </Panel>

          <Panel title="Additional details" hint="Optional facts shown beside the description, e.g. Area — 2,400 sq ft.">
            <MetaEditor meta={f.meta} onChange={(m) => set('meta', m)} />
          </Panel>

          <Panel title="Danger zone">
            <button type="button" className="abtn abtn-danger" onClick={remove}>Delete project</button>
          </Panel>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-ivory/95 backdrop-blur lg:left-[250px]">
        <div className="flex flex-wrap items-center justify-end gap-3 px-5 py-3 md:px-10">
          <span className="mr-auto text-sm text-ink-soft" aria-live="polite">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
          {live ? (
            <>
              <button type="button" disabled={saving} className="abtn" onClick={() => save('unpublished')}>Unpublish</button>
              <button type="button" disabled={saving} className="abtn abtn-primary" onClick={() => save()}>{saving ? 'Saving…' : 'Save changes'}</button>
            </>
          ) : (
            <>
              <button type="button" disabled={saving} className="abtn" onClick={() => save(project.status === 'unpublished' ? 'unpublished' : 'draft')}>{saving ? 'Saving…' : project.status === 'draft' ? 'Save draft' : 'Save'}</button>
              <button type="button" disabled={saving} className="abtn abtn-primary" onClick={() => save('published')}>Publish</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- pieces ----------
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

function MetaEditor({ meta, onChange }: { meta: Fields['meta']; onChange: (m: Fields['meta']) => void }) {
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

/** File picker + drop zone with local previews and upload progress. */
export function Uploader({ multiple, label, onFiles }: { multiple?: boolean; label: string; onFiles: (files: File[], progress: (n: number) => void) => Promise<void> }) {
  const { toast } = useUi()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [pending, setPending] = useState<{ urls: string[]; pct: number } | null>(null)

  async function handle(list: FileList | null) {
    const files = [...(list ?? [])]
    if (!files.length) return
    const problem = checkFiles(files)
    if (problem) return toast(problem, 'error')
    const urls = files.map((f) => URL.createObjectURL(f))
    setPending({ urls, pct: 0 })
    try {
      await onFiles(files, (pct) => setPending((p) => p && { ...p, pct }))
    } catch (e) {
      toast(errText(e), 'error')
    } finally {
      urls.forEach(URL.revokeObjectURL)
      setPending(null)
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
      {pending ? (
        <div>
          <div className="flex flex-wrap justify-center gap-2">
            {pending.urls.slice(0, 12).map((u) => <img key={u} src={u} alt="" className="h-16 w-20 rounded-sm object-cover opacity-70" />)}
          </div>
          <div className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded bg-sand" role="progressbar" aria-valuenow={pending.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
            <div className="h-full bg-ink transition-[width]" style={{ width: `${pending.pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-ink-soft">{pending.pct < 100 ? `Uploading… ${pending.pct}%` : 'Optimising images… this can take a few seconds.'}</p>
        </div>
      ) : (
        <>
          <button type="button" className="abtn" onClick={() => input.current?.click()}>{label}</button>
          <p className="mt-2 text-sm text-ink-soft">or drag {multiple ? 'images' : 'an image'} here · JPEG, PNG, WebP, AVIF, HEIC · max 25 MB each</p>
        </>
      )}
      <input ref={input} type="file" accept={ACCEPT} multiple={multiple} className="hidden" onChange={(e) => handle(e.target.files)} />
    </div>
  )
}

function Cover({ project, onServer }: { project: Project; onServer: (p: Project) => void }) {
  const { toast } = useUi()
  return (
    <div className="grid gap-3">
      {project.cover && <img src={mediaUrl(project.cover, project.cover.widths.find((w) => w >= 960) ?? project.cover.widths.at(-1)!)} alt="Current cover" className="aspect-[4/3] w-full rounded-sm bg-sand object-cover" />}
      <Uploader
        label={project.cover ? 'Replace cover image' : 'Upload cover image'}
        onFiles={async (files, progress) => {
          const r = await upload<{ project: Project }>(`/api/admin/projects/${project.id}/cover`, files.slice(0, 1), progress)
          onServer(r.project)
          toast('Cover image updated.')
        }}
      />
    </div>
  )
}

function Gallery({ projectId, images, onChange, onServer }: { projectId: number; images: Img[]; onChange: (i: Img[]) => void; onServer: (p: Project) => void }) {
  const { toast, confirm } = useUi()
  const dragFrom = useRef<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return
    const next = [...images]
    const [it] = next.splice(from, 1)
    next.splice(to, 0, it)
    onChange(next)
  }
  const edit = (i: number, k: 'caption' | 'alt', v: string) => onChange(images.map((im, j) => (j === i ? { ...im, [k]: v } : im)))

  async function del(img: Img) {
    if (!(await confirm({ title: 'Delete this image?', body: 'The image will be removed from this project’s gallery and deleted.', action: 'Delete image' }))) return
    try {
      const r = await api<{ project: Project }>(`/api/admin/projects/${projectId}/images/${img.id}`, { method: 'DELETE' })
      onServer(r.project)
      toast('Image deleted.')
    } catch (e) {
      toast(errText(e), 'error')
    }
  }

  async function replace(img: Img, file: File | undefined) {
    if (!file) return
    const problem = checkFiles([file])
    if (problem) return toast(problem, 'error')
    try {
      const r = await upload<{ project: Project }>(`/api/admin/projects/${projectId}/images/${img.id}/replace`, [file])
      onServer(r.project)
      toast('Image replaced.')
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
          const r = await upload<{ project: Project; errors: string[] }>(`/api/admin/projects/${projectId}/images`, files, progress)
          onServer(r.project)
          if (r.errors.length) toast(`Some images were skipped: ${r.errors.join(' ')}`, 'error')
          else toast(`${files.length} image${files.length > 1 ? 's' : ''} added.`)
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
            <Thumb media={img.media} className="h-24 w-32 rounded-sm" />
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
                <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => replace(img, e.target.files?.[0])} />
              </label>
              <button type="button" className="abtn abtn-danger" onClick={() => del(img)}>Delete</button>
            </div>
          </li>
        ))}
      </ol>
      {images.length > 1 && <p className="text-sm text-ink-soft">Remember to save after reordering or editing captions.</p>}
    </div>
  )
}
