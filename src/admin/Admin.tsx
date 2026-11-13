import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useRouter } from '../lib/router'
import { api, ApiError, mediaUrl, type Media, type ProjectSummary } from '../lib/site'
import ProjectsList from './ProjectsList'
import ProjectEditor from './ProjectEditor'
import MediaLibrary from './MediaLibrary'
import ContentEditor from './ContentEditor'

// ---------- shared admin helpers ----------
type Toast = { id: number; kind: 'ok' | 'error'; text: string }
type Ui = { toast: (text: string, kind?: Toast['kind']) => void; confirm: (o: { title: string; body: string; action: string }) => Promise<boolean>; signOut: () => void }
const UiCtx = createContext<Ui>(null!)
export const useUi = () => useContext(UiCtx)

export const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.')

/** Multipart upload with progress (fetch cannot report upload progress). */
export function upload<T>(url: string, files: File[], onProgress?: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
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
    xhr.send(fd)
  })
}

export const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,image/tiff'
export const MAX_MB = 25
export function checkFiles(files: File[]): string | null {
  const big = files.find((f) => f.size > MAX_MB * 1024 * 1024)
  if (big) return `"${big.name}" is larger than ${MAX_MB} MB. Please resize it first.`
  const bad = files.find((f) => f.type && !ACCEPT.split(',').includes(f.type))
  if (bad) return `"${bad.name}" is not a supported image type (JPEG, PNG, WebP, AVIF, HEIC, TIFF).`
  return null
}

export function Thumb({ media, className = '' }: { media: Media | null | undefined; className?: string }) {
  if (!media) return <div className={`grid place-items-center bg-sand/60 text-[10px] uppercase tracking-widest text-ink-soft ${className}`}>No image</div>
  return <img src={mediaUrl(media, media.widths[0])} alt={media.alt} width={media.w} height={media.h} loading="lazy" className={`bg-sand object-cover ${className}`} />
}

export function StatusBadge({ status }: { status: ProjectSummary['status'] }) {
  const s = { published: 'bg-[#E3EADB] text-[#3F5230]', draft: 'bg-sand/70 text-ink', unpublished: 'bg-[#F0DCDC] text-[#7A2A2A]' }[status]
  return <span className={`inline-block rounded-sm px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${s}`}>{status}</span>
}

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h1 className="font-serif text-4xl font-light">{children}</h1>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  )
}

// ---------- shell ----------
const NAV = [
  ['/admin', 'Dashboard'],
  ['/admin/projects', 'Projects'],
  ['/admin/projects/new', 'Add New Project'],
  ['/admin/media', 'Media Library'],
  ['/admin/content', 'Website Content'],
  ['/admin/enquiries', 'Enquiries'],
  ['/admin/settings', 'Settings'],
] as const

export default function Admin() {
  const { path, navigate } = useRouter()
  const [me, setMe] = useState<{ authed: boolean; email: string | null } | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<{ title: string; body: string; action: string; resolve: (v: boolean) => void } | null>(null)
  const dlg = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    document.title = 'Admin — The Cornerstone Architect'
    api<{ authed: boolean; email: string | null }>('/api/admin/me').then(setMe).catch(() => setMe({ authed: false, email: null }))
  }, [])

  const toast = useCallback<Ui['toast']>((text, kind = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 8000 : 4000)
  }, [])

  const confirm = useCallback<Ui['confirm']>((o) => new Promise((resolve) => setConfirmState({ ...o, resolve })), [])
  useEffect(() => { if (confirmState) dlg.current?.showModal() }, [confirmState])
  const closeConfirm = (v: boolean) => { confirmState?.resolve(v); setConfirmState(null); dlg.current?.close() }

  const signOut = useCallback(async () => {
    await api('/api/admin/logout', { method: 'POST' }).catch(() => {})
    setMe({ authed: false, email: null })
    navigate('/admin')
  }, [navigate])

  // Any 401 from the API means the session expired.
  useEffect(() => {
    const onRej = (e: PromiseRejectionEvent) => e.reason instanceof ApiError && e.reason.status === 401 && setMe({ authed: false, email: null })
    addEventListener('unhandledrejection', onRej)
    return () => removeEventListener('unhandledrejection', onRej)
  }, [])

  if (!me) return null
  if (!me.authed) return <Login onDone={() => api<{ authed: boolean; email: string }>('/api/admin/me').then(setMe)} />

  const editMatch = path.match(/^\/admin\/projects\/(\d+)$/)
  let page: ReactNode
  if (path === '/admin') page = <Dashboard />
  else if (path === '/admin/projects') page = <ProjectsList />
  else if (path === '/admin/projects/new') page = <NewProject />
  else if (editMatch) page = <ProjectEditor key={editMatch[1]} id={Number(editMatch[1])} />
  else if (path === '/admin/media') page = <MediaLibrary />
  else if (path === '/admin/content') page = <ContentEditor />
  else if (path === '/admin/enquiries') page = <Enquiries />
  else if (path === '/admin/settings') page = <Settings email={me.email ?? ''} onEmail={(email) => setMe({ ...me, email })} />
  else page = <p>Page not found. <Link href="/admin" className="underline">Back to dashboard</Link></p>

  return (
    <UiCtx.Provider value={{ toast, confirm, signOut }}>
      <div className="min-h-screen bg-[#FAF8F4] font-sans text-[15px] font-normal text-ink lg:grid lg:grid-cols-[250px_1fr]">
        <aside className="border-b border-ink/10 bg-ivory lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 px-5 py-5 lg:block">
            <Link href="/admin" className="flex items-center gap-3">
              <img src="/brand/mark-dark.png" alt="" width={147} height={160} className="h-9 w-auto" />
              <span className="text-[11px] uppercase leading-4 tracking-[.18em]">Cornerstone<br />Admin</span>
            </Link>
            <a href="/" target="_blank" rel="noopener" className="text-sm underline-offset-4 hover:underline lg:mt-4 lg:inline-block">View website ↗</a>
          </div>
          <nav aria-label="Admin" className="overflow-x-auto px-3 pb-3 lg:pb-0">
            <ul className="flex gap-1 lg:block lg:space-y-0.5">
              {NAV.map(([href, label]) => {
                const active = href === '/admin' ? path === href : path === href || (href === '/admin/projects' && !!editMatch)
                return (
                  <li key={href}>
                    <Link href={href} className={`block whitespace-nowrap rounded px-3 py-2 ${active ? 'bg-ink text-ivory' : 'hover:bg-linen'}`}>{label}</Link>
                  </li>
                )
              })}
              <li>
                <button type="button" onClick={signOut} className="block w-full whitespace-nowrap rounded px-3 py-2 text-left hover:bg-linen">Logout</button>
              </li>
            </ul>
          </nav>
        </aside>
        <main className="min-w-0 px-5 py-8 md:px-10 md:py-10">{page}</main>
      </div>

      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 grid w-[min(92vw,380px)] gap-2">
        {toasts.map((t) => (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'} className={`rounded px-4 py-3 text-sm shadow-lg ${t.kind === 'error' ? 'bg-[#7A2A2A] text-white' : 'bg-ink text-ivory'}`}>
            {t.text}
          </div>
        ))}
      </div>

      <dialog ref={dlg} onCancel={(e) => { e.preventDefault(); closeConfirm(false) }} className="m-auto w-[min(92vw,440px)] rounded bg-ivory p-0 text-ink backdrop:bg-ink/50">
        {confirmState && (
          <div className="p-6">
            <h2 className="font-serif text-2xl">{confirmState.title}</h2>
            <p className="mt-3 text-ink-soft">{confirmState.body}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="abtn" onClick={() => closeConfirm(false)} autoFocus>Cancel</button>
              <button type="button" className="abtn abtn-danger" onClick={() => closeConfirm(true)}>{confirmState.action}</button>
            </div>
          </div>
        )}
      </dialog>
    </UiCtx.Provider>
  )
}

function Login({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/api/admin/login', { method: 'POST', json: Object.fromEntries(new FormData(e.currentTarget)) })
      onDone()
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-ivory px-5 font-sans text-ink">
      <form onSubmit={submit} className="w-full max-w-sm">
        <img src="/brand/logo-dark.png" alt="The Cornerstone Architect" width={803} height={600} className="mx-auto h-auto w-40" />
        <h1 className="mt-10 text-center font-serif text-3xl font-light">Studio admin</h1>
        <label className="mt-8 grid gap-1.5 text-sm">Email
          <input name="email" type="email" autoComplete="username" required className="ainput" />
        </label>
        <label className="mt-4 grid gap-1.5 text-sm">Password
          <input name="password" type="password" autoComplete="current-password" required className="ainput" />
        </label>
        {error && <p role="alert" className="mt-4 text-sm text-cornerstone">{error}</p>}
        <button type="submit" disabled={busy} className="abtn abtn-primary mt-6 w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="mt-6 text-center text-sm text-ink-soft"><a href="/" className="underline-offset-4 hover:underline">← Back to website</a></p>
      </form>
    </main>
  )
}

function Dashboard() {
  const [data, setData] = useState<{ counts: Record<string, number>; media: number; unreadEnquiries: number; recent: ProjectSummary[] } | null>(null)
  const { toast } = useUi()
  useEffect(() => { api<typeof data>('/api/admin/overview').then(setData).catch((e) => toast(errText(e), 'error')) }, [toast])
  if (!data) return <p>Loading…</p>
  const stats = [
    ['Published projects', data.counts.published, '/admin/projects'],
    ['Drafts', data.counts.draft, '/admin/projects'],
    ['Unpublished', data.counts.unpublished, '/admin/projects'],
    ['Images in library', data.media, '/admin/media'],
    ['Unread enquiries', data.unreadEnquiries, '/admin/enquiries'],
  ] as const
  return (
    <>
      <PageTitle actions={<Link href="/admin/projects/new" className="abtn abtn-primary">+ Add new project</Link>}>Dashboard</PageTitle>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(([label, n, href]) => (
          <li key={label}>
            <Link href={href} className="block rounded border border-ink/10 bg-white p-5 hover:border-ink/30">
              <p className="font-serif text-4xl">{n}</p>
              <p className="mt-1 text-sm text-ink-soft">{label}</p>
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mb-3 mt-12 font-serif text-2xl">Recently edited</h2>
      <ul className="divide-y divide-ink/10 rounded border border-ink/10 bg-white">
        {data.recent.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/projects/${p.id}`} className="flex items-center gap-4 p-3 hover:bg-linen/50">
              <Thumb media={p.cover} className="h-12 w-16 rounded-sm" />
              <span className="flex-1 font-medium">{p.title}</span>
              <StatusBadge status={p.status} />
            </Link>
          </li>
        ))}
        {!data.recent.length && <li className="p-4 text-ink-soft">No projects yet.</li>}
      </ul>
    </>
  )
}

function NewProject() {
  const { navigate } = useRouter()
  const { toast } = useUi()
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    try {
      const { project } = await api<{ project: { id: number } }>('/api/admin/projects', { method: 'POST', json: { title: new FormData(e.currentTarget).get('title') } })
      toast('Draft created. Add images and details, then publish.')
      navigate(`/admin/projects/${project.id}`)
    } catch (err) {
      toast(errText(err), 'error')
      setBusy(false)
    }
  }
  return (
    <>
      <PageTitle>Add new project</PageTitle>
      <form onSubmit={submit} className="max-w-xl rounded border border-ink/10 bg-white p-6">
        <label className="grid gap-1.5">
          <span className="font-medium">Project title</span>
          <input name="title" required maxLength={160} className="ainput" placeholder="e.g. Residence in Whitefield" autoFocus />
        </label>
        <p className="mt-2 text-sm text-ink-soft">The project starts as a draft — it won’t appear on the website until you publish it.</p>
        <button type="submit" disabled={busy} className="abtn abtn-primary mt-6">{busy ? 'Creating…' : 'Create draft'}</button>
      </form>
    </>
  )
}

type Enquiry = { id: number; name: string; email: string; phone: string; project_type: string; location: string; message: string; read: number; created_at: number }
function Enquiries() {
  const [list, setList] = useState<Enquiry[] | null>(null)
  const { toast, confirm } = useUi()
  const load = useCallback(() => api<{ enquiries: Enquiry[] }>('/api/admin/enquiries').then((r) => setList(r.enquiries)).catch((e) => toast(errText(e), 'error')), [toast])
  useEffect(() => { load() }, [load])
  if (!list) return <p>Loading…</p>
  return (
    <>
      <PageTitle>Enquiries</PageTitle>
      {!list.length && <p className="text-ink-soft">No enquiries yet. Messages sent from the Contact page appear here.</p>}
      <ul className="grid gap-3">
        {list.map((e) => (
          <li key={e.id} className={`rounded border bg-white p-5 ${e.read ? 'border-ink/10' : 'border-ink/40'}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{!e.read && <span className="mr-2 inline-block size-2 rounded-full bg-cornerstone" aria-label="Unread" />}{e.name} · <a className="underline" href={`mailto:${e.email}`}>{e.email}</a>{e.phone && <> · {e.phone}</>}</p>
              <time className="text-sm text-ink-soft">{new Date(e.created_at).toLocaleString('en-IN')}</time>
            </div>
            {(e.project_type || e.location) && <p className="mt-1 text-sm text-ink-soft">{[e.project_type, e.location].filter(Boolean).join(' · ')}</p>}
            <p className="mt-3 whitespace-pre-wrap">{e.message}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" className="abtn" onClick={() => api(`/api/admin/enquiries/${e.id}`, { method: 'PATCH', json: { read: !e.read } }).then(load)}>Mark as {e.read ? 'unread' : 'read'}</button>
              <button type="button" className="abtn abtn-danger" onClick={async () => {
                if (await confirm({ title: 'Delete enquiry?', body: `The message from ${e.name} will be permanently deleted.`, action: 'Delete' })) {
                  await api(`/api/admin/enquiries/${e.id}`, { method: 'DELETE' }).then(() => { toast('Enquiry deleted.'); load() }).catch((err) => toast(errText(err), 'error'))
                }
              }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function Settings({ email, onEmail }: { email: string; onEmail: (e: string) => void }) {
  const { toast } = useUi()
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const b = Object.fromEntries(new FormData(form)) as Record<string, string>
    if (b.newPassword && b.newPassword !== b.confirmPassword) return toast('The new passwords do not match.', 'error')
    setBusy(true)
    try {
      const r = await api<{ email: string }>('/api/admin/account', { method: 'PUT', json: b })
      onEmail(r.email)
      form.reset()
      toast(b.newPassword ? 'Password changed. Other devices have been signed out.' : 'Account updated.')
    } catch (err) {
      toast(errText(err), 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageTitle>Settings</PageTitle>
      <form onSubmit={submit} className="grid max-w-xl gap-5 rounded border border-ink/10 bg-white p-6">
        <h2 className="font-serif text-2xl">Admin account</h2>
        <label className="grid gap-1.5">Sign-in email<input name="email" type="email" defaultValue={email} className="ainput" autoComplete="username" /></label>
        <label className="grid gap-1.5">New password <span className="text-sm text-ink-soft">Leave blank to keep the current one. At least 10 characters.</span><input name="newPassword" type="password" minLength={10} className="ainput" autoComplete="new-password" /></label>
        <label className="grid gap-1.5">Confirm new password<input name="confirmPassword" type="password" className="ainput" autoComplete="new-password" /></label>
        <label className="grid gap-1.5">Current password <span className="text-sm text-ink-soft">Required to save changes.</span><input name="currentPassword" type="password" required className="ainput" autoComplete="current-password" /></label>
        <div><button type="submit" disabled={busy} className="abtn abtn-primary">{busy ? 'Saving…' : 'Save changes'}</button></div>
      </form>
      <p className="mt-6 max-w-xl text-sm text-ink-soft">Contact details shown on the website (email, phone, Instagram) are edited under <Link className="underline" href="/admin/content">Website Content</Link>.</p>
    </>
  )
}
