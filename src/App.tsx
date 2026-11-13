import { lazy, Suspense } from 'react'
import { useRouter } from './lib/router'
import { SiteProvider } from './lib/site'
import { Footer, Header, Intro } from './components/Layout'
import Home from './pages/Home'
import About from './pages/About'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import FinishingTouch from './pages/FinishingTouch'
import Contact from './pages/Contact'
import NotFound from './pages/NotFound'

const Admin = lazy(() => import('./admin/Admin'))

export default function App() {
  const { path } = useRouter()
  if (path === '/admin' || path.startsWith('/admin/')) {
    return (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    )
  }
  return (
    <SiteProvider>
      <a href="#main" className="sr-only z-50 bg-ink px-4 py-3 text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <Intro />
      <Header />
      <main id="main">
        <Page path={path} />
      </main>
      <Footer />
    </SiteProvider>
  )
}

function Page({ path }: { path: string }) {
  const project = path.match(/^\/projects\/([^/]+)$/)
  if (project) return <ProjectDetail key={project[1]} slug={decodeURIComponent(project[1])} />
  switch (path) {
    case '/': return <Home />
    case '/about': return <About />
    case '/projects': return <Projects />
    case '/the-finishing-touch': return <FinishingTouch />
    case '/contact': return <Contact />
    default: return <NotFound />
  }
}
