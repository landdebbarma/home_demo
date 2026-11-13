import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, useRouter } from '../lib/router'
import { api, ApiError, type Media, type Project } from '../lib/site'
import { AdminDataProvider, useAdmin, type Deploy } from './store'
import ProjectsList from './ProjectsList'
import ProjectEditor from './ProjectEditor'
import ContentEditor from './ContentEditor'

// ---------- shared admin helpers ----------
type Toast = { id: number; kind: 'ok' | 'error'; text: string }
type Ui = { toast: (text: string, kind?: Toast['kind']) => void; confirm: (o: { title: string; body: string; action: string }) => Promise<boolean> }
const UiCtx = createContext<Ui>(null!)
export const useUi = () => useContext(UiCtx)

export const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.')

/** Thumbnail: the deployed file if it exists, otherwise straight from GitHub / local preview. */
export function Thumb({ media, className = '' }: { media: Media | null | undefined; className?: string }) {
  const { imageUrl } = useAdmin()
  if (!media) return <div className={`grid place-items-center bg-sand/60 text-[10px] uppercase tracking-widest text-ink-soft ${className}`}>No image</div>
  const w = media.widths[0]
  return (
    <img
      src={imageUrl(media, w)}
      alt={media.alt}
      width={media.w}
      height={media.h}
      loading="lazy"
      className={`bg-sand object-cover ${className}`}
    />
  )
}

export function StatusBadge({ status }: { status: Project['status'] }) {
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
  ['/admin/content', 'Website Content'],
] as const

export default function Admin() {
  const [me, setMe] = useState<{ authed: boolean; configured: boolean; issues?: string[] } | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<{ title: string; body: string; action: string; resolve: (v: boolean) => void } | null>(null)
  const dlg = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    document.title = 'Admin — The Cornerstone Architect'
    api<{ authed: boolean; configured: boolean; issues?: string[] }>('/api/admin/me').then(setMe).catch(() => setMe({ authed: false, configured: true }))
  }, [])

  const toast = useCallback<Ui['toast']>((text, kind = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 9000 : 4500)
  }, [])
  const confirm = useCallback<Ui['confirm']>((o) => new Promise((resolve) => setConfirmState({ ...o, resolve })), [])
  useEffect(() => { if (confirmState) dlg.current?.showModal() }, [confirmState])
  const closeConfirm = (v: boolean) => { confirmState?.resolve(v); setConfirmState(null); dlg.current?.close() }

  // Any 401 from the API means the session expired.
  useEffect(() => {
    const onRej = (e: PromiseRejectionEvent) => e.reason instanceof ApiError && e.reason.status === 401 && setMe((m) => m && { ...m, authed: false })
    addEventListener('unhandledrejection', onRej)
    return () => removeEventListener('unhandledrejection', onRej)
  }, [])

  if (!me) return null
  if (!me.authed) return <Login configured={me.configured !== false} issues={me.issues ?? []} onDone={() => setMe({ ...me, authed: true })} />

  return (
    <UiCtx.Provider value={{ toast, confirm }}>
      <AdminDataProvider>
        <Shell onSignOut={() => setMe({ ...me, authed: false })} />
      </AdminDataProvider>

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

function Shell({ onSignOut }: { onSignOut: () => void }) {
  const { path, navigate } = useRouter()
  const { data, error, load } = useAdmin()
  const signOut = async () => {
    await api('/api/admin/logout', { method: 'POST' }).catch(() => {})
    onSignOut()
    navigate('/admin')
  }

  const editMatch = path.match(/^\/admin\/projects\/([a-z0-9]+)$/)
  let page: ReactNode
  if (error && !data) page = <LoadError message={error} retry={load} />
  else if (!data) page = <p>Loading content from GitHub…</p>
  else if (path === '/admin') page = <Dashboard />
  else if (path === '/admin/projects') page = <ProjectsList />
  else if (editMatch) page = <ProjectEditor key={editMatch[1]} id={editMatch[1]} />
  else if (path === '/admin/content') page = <ContentEditor />
  else page = <p>Page not found. <Link href="/admin" className="underline">Back to dashboard</Link></p>

  return (
    <div className="min-h-screen bg-[#FAF8F4] font-sans text-[15px] font-normal text-ink lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-ink/10 bg-ivory lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
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
              const active = href === '/admin' ? path === href : path === href || (href === '/admin/projects' && !!editMatch && path !== '/admin/projects/new')
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
        <DeployPanel />
      </aside>
      <main className="min-w-0 px-5 py-8 md:px-10 md:py-10">{page}</main>
    </div>
  )
}

function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="max-w-xl rounded border border-[#7A2A2A]/30 bg-white p-6">
      <h1 className="font-serif text-2xl">Couldn’t load content from GitHub</h1>
      <p className="mt-2 text-ink-soft">{message}</p>
      <p className="mt-2 text-sm text-ink-soft">The public website is unaffected. Check the GitHub settings in the server environment (see README).</p>
      <button type="button" className="abtn mt-4" onClick={retry}>Try again</button>
    </div>
  )
}

const DEPLOY_TEXT: Record<Deploy['state'], string> = {
  deploying: 'Saved to GitHub · deploying…',
  live: 'Live on the website',
  failed: 'Deploy failed — the website still shows the previous version',
  unknown: 'Saved to GitHub · deploy status unknown',
}
function DeployPanel() {
  const { deploys } = useAdmin()
  if (!deploys.length) return null
  return (
    <section aria-label="Publishing status" aria-live="polite" className="m-3 rounded border border-ink/10 bg-white p-3 text-sm lg:mt-auto">
      <h2 className="mb-2 text-[11px] uppercase tracking-[.16em] text-ink-soft">Recent saves</h2>
      <ul className="grid gap-2">
        {deploys.slice(0, 4).map((d) => (
          <li key={d.commit} className="grid gap-0.5">
            <span className="truncate font-medium" title={d.message}>{d.message}</span>
            <span className={`flex items-center gap-1.5 ${d.state === 'failed' ? 'text-[#7A2A2A]' : d.state === 'live' ? 'text-[#3F5230]' : 'text-ink-soft'}`}>
              <span aria-hidden="true" className={`inline-block size-2 rounded-full ${{ deploying: 'animate-pulse bg-[#B58A2A]', live: 'bg-[#3F5230]', failed: 'bg-[#7A2A2A]', unknown: 'bg-taupe' }[d.state]}`} />
              {DEPLOY_TEXT[d.state]}
            </span>
            {d.url && d.state === 'failed' && <a href={d.url} target="_blank" rel="noopener" className="text-xs underline">View build log ↗</a>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Login({ onDone, configured, issues }: { onDone: () => void; configured: boolean; issues: string[] }) {
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
        {!configured && (
          <div role="alert" className="mt-4 rounded bg-[#F0DCDC] p-3 text-sm text-[#7A2A2A]">
            <p>The admin account isn’t configured on the server yet:</p>
            <ul className="mt-2 list-disc pl-5">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
            <p className="mt-2">Fix these in Vercel → Settings → Environment Variables (Production), then redeploy.</p>
          </div>
        )}
        <label className="mt-8 grid gap-1.5 text-sm">Email
          <input name="email" type="email" autoComplete="username" required className="ainput" />
        </label>
        <div className="mt-4 grid gap-1.5 text-sm">
          <label htmlFor="admin-password">Password</label>
          <div className="relative">
            <input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className="ainput pr-11" />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              aria-controls="admin-password"
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-soft hover:text-ink"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-cornerstone">{error}</p>}
        <button type="submit" disabled={busy} className="abtn abtn-primary mt-6 w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="mt-6 text-center text-sm text-ink-soft"><a href="/" className="underline-offset-4 hover:underline">← Back to website</a></p>
      </form>
    </main>
  )
}

function Dashboard() {
  const { data } = useAdmin()
  const projects = data!.projects
  const count = (s: Project['status']) => projects.filter((p) => p.status === s).length
  const recent = [...projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)
  const stats = [
    ['Published projects', count('published')],
    ['Drafts', count('draft')],
    ['Unpublished', count('unpublished')],
  ] as const
  return (
    <>
      <PageTitle actions={<Link href="/admin/projects/new" className="abtn abtn-primary">+ Add new project</Link>}>Dashboard</PageTitle>
      <ul className="grid gap-3 sm:grid-cols-3">
        {stats.map(([label, n]) => (
          <li key={label}>
            <Link href="/admin/projects" className="block rounded border border-ink/10 bg-white p-5 hover:border-ink/30">
              <p className="font-serif text-4xl">{n}</p>
              <p className="mt-1 text-sm text-ink-soft">{label}</p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-2xl text-sm text-ink-soft">
        Every save is stored in GitHub and then published automatically; the status of each save is shown in the sidebar. Saving usually takes a minute or two to appear on the website.
      </p>
      <h2 className="mb-3 mt-10 font-serif text-2xl">Recently edited</h2>
      <ul className="divide-y divide-ink/10 rounded border border-ink/10 bg-white">
        {recent.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/projects/${p.id}`} className="flex items-center gap-4 p-3 hover:bg-linen/50">
              <Thumb media={p.cover} className="h-12 w-16 rounded-sm" />
              <span className="flex-1 font-medium">{p.title}</span>
              <StatusBadge status={p.status} />
            </Link>
          </li>
        ))}
        {!recent.length && <li className="p-4 text-ink-soft">No projects yet.</li>}
      </ul>
    </>
  )
}
