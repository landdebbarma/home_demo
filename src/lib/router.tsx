import { createContext, useCallback, useContext, useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'

type Router = { path: string; navigate: (to: string, opts?: { replace?: boolean }) => void }
const Ctx = createContext<Router>({ path: '/', navigate: () => {} })

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Tiny History-API router. Page swaps run inside a View Transition where supported. */
export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => normalise(location.pathname))

  const swap = useCallback((next: string, hash = '') => {
    const update = () => {
      flushSync(() => setPath(next))
      if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
      else window.scrollTo({ top: 0, behavior: 'instant' })
    }
    const animated = 'startViewTransition' in document && !reduced() && !next.startsWith('/admin') && !path.startsWith('/admin')
    if (animated) document.startViewTransition(update)
    else update()
  }, [path])

  useEffect(() => {
    const onPop = () => swap(normalise(location.pathname))
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [swap])

  const navigate = useCallback<Router['navigate']>((to, opts) => {
    const url = new URL(to, location.href)
    const next = normalise(url.pathname)
    history[opts?.replace ? 'replaceState' : 'pushState'](null, '', url.pathname + url.search + url.hash)
    if (next === path && !url.hash) return window.scrollTo({ top: 0, behavior: reduced() ? 'instant' : 'smooth' })
    swap(next, url.hash)
  }, [path, swap])

  return <Ctx.Provider value={{ path, navigate }}>{children}</Ctx.Provider>
}

const normalise = (p: string) => p.replace(/\/+$/, '') || '/'

export const useRouter = () => useContext(Ctx)

export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const { navigate, path } = useRouter()
  const external = /^(https?:|mailto:|tel:)/.test(href)
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (external || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || rest.target) return
    e.preventDefault()
    navigate(href)
  }
  const current = !external && (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'))
  return <a href={href} onClick={handle} aria-current={current ? 'page' : undefined} {...rest} />
}
