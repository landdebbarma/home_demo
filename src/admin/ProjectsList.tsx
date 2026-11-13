import { useState } from 'react'
import { Link } from '../lib/router'
import { ApiError, type Project } from '../lib/site'
import { errText, PageTitle, StatusBadge, Thumb, useUi } from './Admin'
import { useAdmin } from './store'

export default function ProjectsList() {
  const { toast, confirm } = useUi()
  const { data, save, load } = useAdmin()
  const [busy, setBusy] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState('')
  const list = data!.projects

  async function commit(p: Project, next: Project[], message: string, done: string) {
    setBusy(p.id)
    try {
      await save({ projects: next, message })
      toast(done)
    } catch (e) {
      toast(errText(e), 'error')
      if (e instanceof ApiError && e.status === 409) load() // nothing local to lose here
    } finally {
      setBusy(null)
    }
  }

  const setProjectStatus = (p: Project, s: Project['status']) =>
    commit(p, list.map((x) => (x.id === p.id ? { ...x, status: s, updatedAt: Date.now() } : x)),
      `${s === 'published' ? 'Publish' : 'Unpublish'} "${p.title}"`,
      s === 'published' ? `“${p.title}” saved as published — it goes live after the deploy finishes.` : `“${p.title}” saved as hidden — it disappears after the deploy finishes.`)

  async function remove(p: Project) {
    const ok = await confirm({
      title: 'Delete this project?',
      body: `“${p.title}” and all of its images will be removed from the website and the repository. This can only be undone from the Git history.`,
      action: 'Delete project',
    })
    if (ok) commit(p, list.filter((x) => x.id !== p.id), `Delete "${p.title}"`, `“${p.title}” deleted.`)
  }

  const categories = [...new Set(list.map((p) => p.category).filter(Boolean))].sort()
  const needle = q.trim().toLowerCase()
  const shown = [...list]
    .sort((a, b) => a.order - b.order || b.createdAt - a.createdAt)
    .filter((p) =>
      (!needle || [p.title, p.category, p.location, p.year].join(' ').toLowerCase().includes(needle)) &&
      (!cat || p.category === cat) &&
      (!status || p.status === status),
    )

  return (
    <>
      <PageTitle actions={<Link href="/admin/projects/new" className="abtn abtn-primary">+ Add new project</Link>}>Projects</PageTitle>
      <div className="mb-5 flex flex-wrap gap-3">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" aria-label="Search projects" className="ainput w-64 max-w-full" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category" className="ainput w-auto">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className="ainput w-auto">
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="unpublished">Unpublished</option>
        </select>
      </div>
      <p className="mb-3 text-sm text-ink-soft">Projects appear on the website in “Display order” (lowest first). Featured projects are shown on the homepage.</p>
      <ul className="divide-y divide-ink/10 rounded border border-ink/10 bg-white">
        {shown.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-4 p-3 sm:flex-nowrap">
            <Link href={`/admin/projects/${p.id}`} className="shrink-0"><Thumb media={p.cover} className="h-16 w-24 rounded-sm" /></Link>
            <div className="min-w-0 flex-1">
              <Link href={`/admin/projects/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
              <p className="truncate text-sm text-ink-soft">{[p.category, p.location, p.year].filter(Boolean).join(' · ') || 'No details yet'}</p>
            </div>
            <div className="flex items-center gap-2">
              {p.featured && <span className="text-[11px] uppercase tracking-wider text-umber">★ Featured</span>}
              <StatusBadge status={p.status} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/projects/${p.id}`} className="abtn">Edit</Link>
              {p.status === 'published' ? (
                <button type="button" className="abtn" disabled={!!busy} onClick={() => setProjectStatus(p, 'unpublished')}>Unpublish</button>
              ) : (
                <button type="button" className="abtn" disabled={!!busy || !p.cover} title={p.cover ? undefined : 'Add a cover image first'} onClick={() => setProjectStatus(p, 'published')}>Publish</button>
              )}
              <button type="button" className="abtn abtn-danger" disabled={!!busy} onClick={() => remove(p)} aria-label={`Delete ${p.title}`}>Delete</button>
            </div>
            {busy === p.id && <span className="w-full text-sm text-ink-soft" role="status">Saving to GitHub…</span>}
          </li>
        ))}
        {!shown.length && <li className="p-6 text-ink-soft">{list.length ? 'No projects match your search.' : 'No projects yet — add your first one.'}</li>}
      </ul>
    </>
  )
}
