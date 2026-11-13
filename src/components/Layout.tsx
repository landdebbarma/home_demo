import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useRouter } from '../lib/router'
import { instagramUrl, telUrl, useSite } from '../lib/site'

const YEAR = new Date().getFullYear()

const NAV = [
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/the-finishing-touch', label: 'The Finishing Touch' },
  { href: '/contact', label: 'Contact' },
]

/** Pages that open on a full-bleed photograph get a transparent, light header until scrolled. */
const OVERLAY = ['/', '/the-finishing-touch']

export function Header() {
  const { path } = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const menu = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    // Smooth/momentum scrolling fires many 1–2px events; only react to a deliberate
    // movement, measured from where the direction last changed, or the header flickers.
    const THRESHOLD = 6
    let anchor = scrollY
    const on = () => {
      const y = scrollY
      const dy = y - anchor
      setScrolled(y > 40)
      if (y < 480) {
        setHidden(false)
        anchor = y
      } else if (Math.abs(dy) > THRESHOLD) {
        setHidden(dy > 0)
        anchor = y
      }
    }
    on()
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [path])

  const light = OVERLAY.includes(path) && !scrolled
  const tone = light ? 'light' : 'dark'

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-[background-color,transform,color,border-color] duration-500 ease-[var(--ease-out)] ${
          light ? 'border-b border-transparent text-ivory' : 'border-b border-ink/10 bg-ivory/95 text-ink backdrop-blur-[2px]'
        } ${hidden ? '-translate-y-full' : ''}`}
        style={{ viewTransitionName: 'site-header' } as CSSProperties}
      >
        <div className="wrap flex h-[var(--header-h)] items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3.5" aria-label="The Cornerstone Architect — home">
            {/* Both tones stay loaded and crossfade, so the logo never blanks while its src changes. */}
            <span className="grid">
              {(['light', 'dark'] as const).map((t) => (
                <img key={t} src={`/brand/mark-${t}.png`} alt="" width={147} height={160}
                  className={`[grid-area:1/1] h-10 w-auto transition-opacity duration-500 md:h-11 ${tone === t ? 'opacity-100' : 'opacity-0'}`} />
              ))}
            </span>
            <span className="grid">
              {(['light', 'dark'] as const).map((t) => (
                <img key={t} src={`/brand/wordmark-${t}.png`} alt={tone === t ? 'The Cornerstone Architect' : ''} width={738} height={96}
                  className={`[grid-area:1/1] h-[17px] w-auto transition-opacity duration-500 md:h-5 ${tone === t ? 'opacity-100' : 'opacity-0'}`} />
              ))}
            </span>
          </Link>
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-10">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="link-line text-[.74rem] font-normal uppercase tracking-[.2em]">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <button
            type="button"
            className="t-label -mr-3 p-3 lg:hidden"
            aria-haspopup="dialog"
            onClick={() => menu.current?.showModal()}
          >
            Menu
          </button>
        </div>
      </header>
      <MobileMenu ref={menu} />
    </>
  )
}

function MobileMenu({ ref }: { ref: React.RefObject<HTMLDialogElement | null> }) {
  const { path } = useRouter()
  const site = useSite()
  useEffect(() => ref.current?.close(), [path, ref])
  return (
    <dialog
      ref={ref}
      aria-label="Menu"
      className="mobile-menu m-0 h-dvh max-h-none w-screen max-w-none bg-ivory p-0 text-ink backdrop:bg-transparent"
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <div className="wrap flex h-full flex-col">
        <div className="flex h-[var(--header-h)] items-center justify-between">
          <img src="/brand/mark-dark.png" alt="" width={147} height={160} className="h-10 w-auto" />
          <button type="button" className="t-label -mr-3 p-3" onClick={() => ref.current?.close()}>
            Close
          </button>
        </div>
        <nav aria-label="Mobile" className="flex flex-1 flex-col justify-center">
          <ul className="space-y-3">
            {[{ href: '/', label: 'Home' }, ...NAV].map((n, i) => (
              <li key={n.href} className="menu-item" style={{ '--i': i } as CSSProperties}>
                <Link href={n.href} className="font-serif text-[2.6rem] font-light leading-tight sm:text-6xl">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {site.ready && (
          <div className="rule grid gap-1 py-8 text-sm text-ink-soft">
            <a href={`mailto:${site.content.contact.email}`}>{site.content.contact.email}</a>
            <a href={telUrl(site.content.contact.phone)}>{site.content.contact.phone}</a>
          </div>
        )}
      </div>
    </dialog>
  )
}

export function Footer() {
  const site = useSite()
  const c = site.ready ? site.content.contact : null
  return (
    <footer className="on-dark bg-ink text-ivory">
      {/* Phones: one compact block (horizontal logo, no column headings, inline links). md+: editorial columns. */}
      <div className="wrap grid gap-7 pb-6 pt-11 md:grid-cols-12 md:gap-14 md:pb-10 md:pt-28">
        <div className="md:col-span-5">
          <img src="/brand/logo-light.png" alt="The Cornerstone Architect — Architecture & Interior Design" width={803} height={600} loading="lazy" className="hidden h-auto w-64 md:block" />
          <div className="flex items-center gap-3 md:hidden">
            <img src="/brand/mark-light.png" alt="" width={147} height={160} loading="lazy" className="h-9 w-auto" />
            <img src="/brand/wordmark-light.png" alt="The Cornerstone Architect" width={738} height={96} loading="lazy" className="h-4 w-auto" />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-3 sm:gap-10 md:col-span-7">
          <div className="hidden sm:block">
            <p className="t-label mb-4 text-taupe">Studio</p>
            <p className="text-sm leading-7 text-ivory/80">{c?.location}</p>
          </div>
          <div>
            <p className="t-label mb-4 hidden text-taupe sm:block">Contact</p>
            {c && (
              <ul className="space-y-0.5 text-sm leading-6 text-ivory/80 sm:space-y-1 sm:leading-7">
                <li><a className="link-line" href={`mailto:${c.email}`}>{c.email}</a></li>
                <li><a className="link-line" href={telUrl(c.phone)}>{c.phone}</a></li>
                <li><a className="link-line" href={instagramUrl(c.instagram)} target="_blank" rel="noopener noreferrer">Instagram @{c.instagram.replace(/^@/, '')}</a></li>
                <li className="sm:hidden">{c.location}</li>
              </ul>
            )}
          </div>
          <nav aria-label="Footer">
            <p className="t-label mb-4 hidden text-taupe sm:block">Explore</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm leading-6 text-ivory/80 sm:block sm:space-y-1 sm:leading-7">
              {NAV.map((n) => (
                <li key={n.href}><Link className="link-line" href={n.href}>{n.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      <div className="wrap">
        <div className="rule flex flex-col justify-between gap-2 py-5 text-xs tracking-wide text-ivory/55 sm:flex-row md:py-7">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>© {YEAR} The Cornerstone Architect<span className="dot">.</span> Bengaluru</span>
            <span aria-hidden="true" className="hidden h-3 w-px bg-ivory/25 sm:block" />
            <span>Built with <span role="img" aria-label="love">❤️</span> by Antoant</span>
          </p>
          <p className="hidden sm:block">Architecture &amp; Interior Design</p>
        </div>
      </div>
    </footer>
  )
}

/** Logo curtain on the first visit of a session only. */
export function Intro() {
  const [show] = useState(() => {
    try {
      if (sessionStorage.getItem('tca-intro') || location.pathname.startsWith('/admin')) return false
      sessionStorage.setItem('tca-intro', '1')
    } catch { /* storage blocked: still fine to show once */ }
    return !matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const [done, setDone] = useState(!show)
  if (done) return null
  return (
    <div className="intro" aria-hidden="true" onAnimationEnd={(e) => e.animationName === 'intro-lift' && setDone(true)}>
      <img src="/brand/mark-dark.png" alt="" width={147} height={160} />
    </div>
  )
}
