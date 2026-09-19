import { useState } from 'react'
import { Search, Menu, X, ArrowRight } from 'lucide-react'

interface NavbarProps {
  activePage?: string
  onNavigate?: (page: string) => void
}

export function LivinorLogoIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top curved bridge */}
      <path
        d="M6 4.5C9.5 7.5 14.5 7.5 18 4.5"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      {/* Bottom curved bridge */}
      <path
        d="M6 19.5C9.5 16.5 14.5 16.5 18 19.5"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      {/* Left curved bow */}
      <path
        d="M5.5 5.5C9.5 9.5 9.5 14.5 5.5 18.5"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      {/* Right curved bow */}
      <path
        d="M18.5 5.5C14.5 9.5 14.5 14.5 18.5 18.5"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Navbar({ activePage = 'home', onNavigate }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'team', label: 'Team' },
    { id: 'contact', label: 'Contact' },
  ]

  const handleLinkClick = (id: string) => {
    if (onNavigate) {
      onNavigate(id)
    }
    setMobileMenuOpen(false)
  }

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 transition-all duration-300 pointer-events-none">
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pt-6 sm:pt-8 flex items-center justify-between pointer-events-auto">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => handleLinkClick('home')}
            className="flex items-center gap-2.5 sm:gap-3 text-left focus:outline-none group cursor-pointer"
          >
            <LivinorLogoIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white transition-transform group-hover:scale-105" />
            <span className="text-white text-xl sm:text-2xl font-bold tracking-tight">
              LIVINOR
            </span>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {navLinks.map((link) => {
              const isActive = activePage === link.id
              if (link.id === 'home') {
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => handleLinkClick(link.id)}
                    className={`text-xs sm:text-sm font-semibold px-5 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#74dc14] text-neutral-950 shadow-[0_2px_12px_rgba(116,220,20,0.35)]'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </button>
                )
              }

              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleLinkClick(link.id)}
                  className={`text-xs sm:text-sm font-medium px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#74dc14] text-neutral-950 shadow-[0_2px_12px_rgba(116,220,20,0.35)]'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {link.label}
                </button>
              )
            })}
          </nav>

          {/* Right Actions: Search Icon + Get Started CTA */}
          <div className="hidden md:flex items-center gap-4 lg:gap-5">
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="text-white/85 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Search architectural designs"
            >
              <Search size={19} strokeWidth={2.2} />
            </button>

            {/* Get Started Pill Button */}
            <button
              type="button"
              onClick={() => handleLinkClick('contact')}
              className="bg-[#74dc14] hover:bg-[#68cb10] active:scale-95 text-neutral-950 font-semibold px-5 py-2 rounded-full text-xs sm:text-sm transition-all duration-200 shadow-[0_2px_12px_rgba(116,220,20,0.3)] hover:shadow-[0_4px_18px_rgba(116,220,20,0.45)] cursor-pointer"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu & Search Buttons */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="text-white/90 hover:text-white p-2 rounded-lg"
              aria-label="Search"
            >
              <Search size={20} />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white/90 hover:text-white p-2 rounded-lg focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mx-4 mt-3 p-5 rounded-2xl bg-neutral-950/95 backdrop-blur-xl border border-white/15 shadow-2xl flex flex-col gap-3 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => handleLinkClick(link.id)}
                className={`text-left text-sm py-2 px-3 rounded-lg transition-colors font-medium ${
                  activePage === link.id
                    ? 'bg-[#74dc14] text-neutral-950'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {link.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => handleLinkClick('contact')}
              className="w-full mt-2 bg-[#74dc14] text-neutral-950 font-semibold py-2.5 rounded-full text-sm text-center hover:bg-[#68cb10] transition-colors shadow-sm cursor-pointer"
            >
              Get Started
            </button>
          </div>
        )}
      </header>

      {/* Interactive Quick Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-[#14171c] border border-white/20 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3 text-white">
                <Search size={20} className="text-[#74dc14]" />
                <span className="font-semibold text-base">Search LIVINOR</span>
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search villas, architecture, blueprints, services..."
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#74dc14] text-sm"
                autoFocus
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
              <span className="text-white/40">Suggested:</span>
              {['Minimalist Villa', 'Cantilever Living', 'Penthouse', 'Consultation'].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSearchQuery(term)}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-[#74dc14] hover:text-black transition-colors cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>

            {searchQuery && (
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/70">
                <span>Showing search results for &ldquo;{searchQuery}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false)
                    handleLinkClick('services')
                  }}
                  className="text-[#74dc14] flex items-center gap-1 hover:underline cursor-pointer"
                >
                  View projects <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
