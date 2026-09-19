import { Hero } from '../components/Hero'
import { Sparkles, Shield, Compass, Key, ArrowRight } from 'lucide-react'

interface HomePageProps {
  onNavigate?: (page: string) => void
}

export function HomePage({ onNavigate }: HomePageProps) {
  const highlights = [
    {
      icon: <Compass className="w-6 h-6 text-[#d6c2b1]" />,
      title: 'Curated Portfolios',
      description: 'Hand-vetted luxury villas and penthouses across prime architectural locations worldwide.',
    },
    {
      icon: <Shield className="w-6 h-6 text-[#d6c2b1]" />,
      title: 'Private Acquisitions',
      description: 'Discreet off-market transactions managed by premier international private client advisors.',
    },
    {
      icon: <Sparkles className="w-6 h-6 text-[#d6c2b1]" />,
      title: 'Bespoke Concierge',
      description: 'Tailored private viewings, chartered aviation transfers, and comprehensive legal escrow.',
    },
    {
      icon: <Key className="w-6 h-6 text-[#d6c2b1]" />,
      title: 'Turnkey Handover',
      description: 'Seamless title transition with white-glove interior staging and management ready upon closing.',
    },
  ]

  return (
    <div className="w-full bg-[#121214] text-white">
      {/* 1. Main Reference Hero Section */}
      <Hero />

      {/* 2. Architectural Highlights & Value Proposition */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-24 border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-[#d6c2b1] font-semibold">
              The Homewide Standard
            </span>
            <h2 className="text-3xl sm:text-4xl font-light text-white mt-2">
              Unrivaled Luxury Living
            </h2>
          </div>
          <p className="text-white/60 text-sm sm:text-base max-w-md font-light leading-relaxed">
            Every estate in the Horizon collection is evaluated against rigorous architectural standards, rare geographic desirability, and bespoke build quality.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item, idx) => (
            <div
              key={idx}
              className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#d6c2b1]/40 transition-all duration-300 hover:bg-white/[0.06] group"
            >
              <div className="p-3 w-fit rounded-xl bg-white/[0.07] mb-6 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h3 className="text-lg font-medium text-white mb-2">{item.title}</h3>
              <p className="text-sm text-white/60 font-light leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Upcoming Pages Section / Call to Action */}
      <section className="relative w-full py-24 bg-gradient-to-b from-[#121214] via-[#1a1a1e] to-[#121214] border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <span className="text-xs uppercase tracking-[0.25em] text-[#d6c2b1] font-semibold">
            Private Consultation
          </span>
          <h2 className="text-4xl sm:text-5xl font-light text-white mt-3 mb-6 tracking-tight">
            Discover Your Next Horizon
          </h2>
          <p className="text-white/70 max-w-xl mx-auto text-sm sm:text-base mb-10 font-light leading-relaxed">
            Connect with our global private advisors to access off-market architectural residences and exclusive estates before public listing.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate?.('contact')}
              className="inline-flex items-center gap-3 bg-white text-neutral-950 font-medium px-8 py-3.5 rounded-xl hover:bg-neutral-100 transition-all shadow-lg hover:shadow-white/10 active:scale-95 cursor-pointer"
            >
              <span>Schedule a Private Showing</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('works')}
              className="inline-flex items-center gap-2 border border-white/20 bg-white/5 backdrop-blur-sm text-white px-7 py-3.5 rounded-xl hover:bg-white/10 hover:border-white/40 transition-all cursor-pointer"
            >
              <span>Explore ccWorks</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. Elegant Minimal Footer */}
      <footer className="w-full border-t border-white/10 py-12 px-6 sm:px-12 text-xs text-white/50 flex flex-col sm:flex-row items-center justify-between gap-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-white/80 font-medium">
          <span>Homewide Luxury Real Estate</span>
          <span className="text-white/30">•</span>
          <span className="text-white/40">Horizon Collection</span>
        </div>
        <div className="flex items-center gap-6">
          <button type="button" onClick={() => onNavigate?.('about')} className="hover:text-white transition-colors">About</button>
          <button type="button" onClick={() => onNavigate?.('works')} className="hover:text-white transition-colors">ccWorks</button>
          <button type="button" onClick={() => onNavigate?.('services')} className="hover:text-white transition-colors">Services</button>
          <button type="button" onClick={() => onNavigate?.('contact')} className="hover:text-white transition-colors">Contact</button>
        </div>
        <p>© 2026 Homewide Inc. All rights reserved.</p>
      </footer>
    </div>
  )
}
