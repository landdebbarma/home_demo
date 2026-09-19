import { useState } from 'react'
import { Menu, X } from 'lucide-react'

interface NavbarProps {
  activePage?: string
  onNavigate?: (page: string) => void
}

export function Navbar({ activePage = 'home', onNavigate }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { id: 'about', label: 'About' },
    { id: 'works', label: 'ccWorks' },
    { id: 'services', label: 'Services' },
  ]

  const handleLinkClick = (id: string) => {
    if (onNavigate) {
      onNavigate(id)
    }
    setMobileMenuOpen(false)
  }

  return (
    <header className="fixed top-5 inset-x-0 z-50 flex justify-center px-4 sm:px-8 pointer-events-none">
      <nav className="pointer-events-auto w-full max-w-5xl rounded-2xl bg-white/15 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] px-5 sm:px-8 py-3 transition-all duration-300">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => handleLinkClick('home')}
            className="flex items-center gap-3 text-left focus:outline-none group cursor-pointer"
          >
            {/* Architectural Building Icon matching the reference logo */}
            <div className="flex items-end gap-[3px] text-white transition-transform group-hover:scale-105">
              <div className="w-1.5 h-3.5 bg-white rounded-t-[1px]" />
              <div className="w-2 h-5 bg-white rounded-t-[1px] relative">
                <span className="absolute inset-x-[2px] top-1 h-[2px] bg-neutral-900/60 block" />
              </div>
              <div className="w-2.5 h-6 bg-white rounded-t-[1px] relative">
                <span className="absolute inset-x-[2px] top-1 h-[2px] bg-neutral-900/60 block" />
                <span className="absolute inset-x-[2px] top-2.5 h-[2px] bg-neutral-900/60 block" />
              </div>
              <div className="w-1.5 h-4 bg-white rounded-t-[1px]" />
            </div>

            <span className="text-white text-lg font-medium tracking-tight">
              Homewide
            </span>
          </button>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-9">
            {navLinks.map((link) => {
              const isActive = activePage === link.id
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleLinkClick(link.id)}
                  className={`text-sm font-normal transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'text-white font-medium drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                      : 'text-white/80 hover:text-white hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]'
                  }`}
                >
                  {link.label}
                </button>
              )
            })}
          </div>

          {/* Action CTA Button */}
          <div className="hidden md:block">
            <button
              type="button"
              onClick={() => handleLinkClick('contact')}
              className="bg-white text-neutral-900 hover:bg-neutral-100 active:scale-95 px-6 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-md cursor-pointer hover:shadow-lg hover:shadow-white/10"
            >
              Contact
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white/90 hover:text-white p-1 rounded-lg focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/15 flex flex-col gap-3 pb-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => handleLinkClick(link.id)}
                className={`text-left text-sm py-2 px-1 transition-colors ${
                  activePage === link.id ? 'text-white font-medium' : 'text-white/80 hover:text-white'
                }`}
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleLinkClick('contact')}
              className="w-full mt-2 bg-white text-neutral-900 py-2.5 rounded-xl text-sm font-medium text-center hover:bg-neutral-100 transition-colors shadow-sm"
            >
              Contact
            </button>
          </div>
        )}
      </nav>
    </header>
  )
}
