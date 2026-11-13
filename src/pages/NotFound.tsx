import { Link } from '../lib/router'
import { usePageMeta } from '../lib/site'

export default function NotFound() {
  usePageMeta('Page not found — The Cornerstone Architect')
  return (
    <section className="wrap grid min-h-[80svh] content-center gap-8 pt-[var(--header-h)]">
      <p className="t-label text-umber">404</p>
      <h1 className="t-h1">This page could not be found.</h1>
      <Link href="/" className="cta"><span className="cta-line" /> Return home</Link>
    </section>
  )
}
