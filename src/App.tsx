import { useState, useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { HomePage } from './pages/HomePage'
import { UpcomingPage } from './pages/UpcomingPage'

export type PageType = 'home' | 'about' | 'services' | 'team' | 'contact'

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  return (
    <div className="min-h-screen w-full bg-[#0a0c0f] text-white flex flex-col selection:bg-[#74dc14] selection:text-neutral-950 font-sans">
      {/* 1. Global Floating Navbar matching LIVINOR reference */}
      <Navbar
        activePage={currentPage}
        onNavigate={(page) => setCurrentPage(page as PageType)}
      />

      {/* 2. Main Active View */}
      <main className="flex-1 w-full">
        {currentPage === 'home' ? (
          <HomePage onNavigate={(page) => setCurrentPage(page as PageType)} />
        ) : (
          <UpcomingPage
            pageId={currentPage}
            onBack={() => setCurrentPage('home')}
          />
        )}
      </main>
    </div>
  )
}
