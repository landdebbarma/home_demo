import { useState, useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { HomePage } from './pages/HomePage'
import { UpcomingPage } from './pages/UpcomingPage'

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'about' | 'works' | 'services' | 'contact'>('home')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  return (
    <div className="min-h-screen w-full bg-[#121214] text-white flex flex-col selection:bg-[#d6c2b1] selection:text-neutral-900">
      {/* 1. Global Floating Navbar (Replicated from Reference Image) */}
      <Navbar
        activePage={currentPage}
        onNavigate={(page) => setCurrentPage(page as any)}
      />

      {/* 2. Main Active Page View */}
      <main className="flex-1 w-full">
        {currentPage === 'home' ? (
          <HomePage onNavigate={(page) => setCurrentPage(page as any)} />
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
