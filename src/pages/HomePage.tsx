import { Hero } from '../components/Hero'
import { Sparkles, Shield, Compass, Key, ArrowRight } from 'lucide-react'

interface HomePageProps {
  onNavigate?: (page: string) => void
}

export function HomePage({ onNavigate }: HomePageProps) {
  const highlights = [
    {
      icon: <Compass className="w-6 h-6 text-[#74dc14]" />,
      title: 'Architectural Vision',
      description: 'Sculpting iconic residential monuments that harmoniously unite daring structural engineering with serene living.',
    },
    {
      icon: <Shield className="w-6 h-6 text-[#74dc14]" />,
      title: 'Enduring Engineering',
      description: 'Precision-engineered cantilevered foundations, thermal barrier glazing, and resilient sustainable materials.',
    },
    {
      icon: <Sparkles className="w-6 h-6 text-[#74dc14]" />,
      title: 'Bespoke Modernism',
      description: 'Custom acoustic timber soffits, integrated ambient lighting schemes, and seamless indoor-outdoor transitions.',
    },
    {
      icon: <Key className="w-6 h-6 text-[#74dc14]" />,
      title: 'Turnkey Delivery',
      description: 'Holistic project delivery from conceptual zoning and 3D architectural rendering to final structural commissioning.',
    },
  ]

  return (
    <div className="w-full bg-[#0a0c0f] text-white">
      {/* 1. Main LIVINOR Hero Section */}
      <Hero onContactClick={() => onNavigate?.('contact')} />

      {/* 2. Architectural Pillars Section */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-24 border-t border-white/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-[#74dc14] font-semibold">
              The LIVINOR Philosophy
            </span>
            <h2 className="text-3xl sm:text-4xl font-light text-white mt-2">
              Transforming Horizons Into Reality
            </h2>
          </div>
          <p className="text-white/60 text-sm sm:text-base max-w-md font-light leading-relaxed">
            Every architectural sanctuary designed by LIVINOR represents a masterclass in geometry, natural light, and structural elegance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item, idx) => (
            <div
              key={idx}
              className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#74dc14]/40 transition-all duration-300 hover:bg-white/[0.06] group"
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

      {/* 3. Call to Action */}
      <section className="relative w-full py-24 bg-gradient-to-b from-[#0a0c0f] via-[#12151b] to-[#0a0c0f] border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <span className="text-xs uppercase tracking-[0.25em] text-[#74dc14] font-semibold">
            Architectural Inquiries
          </span>
          <h2 className="text-4xl sm:text-5xl font-light text-white mt-3 mb-6 tracking-tight">
            Ready to Build Your Architectural Vision?
          </h2>
          <p className="text-white/70 max-w-xl mx-auto text-sm sm:text-base mb-10 font-light leading-relaxed">
            Collaborate with our senior architectural partners to design and commission an extraordinary bespoke residential masterpiece.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate?.('contact')}
              className="inline-flex items-center gap-3 bg-[#74dc14] text-neutral-950 font-semibold px-8 py-3.5 rounded-full hover:bg-[#68cb10] transition-all shadow-[0_4px_20px_rgba(116,220,20,0.35)] active:scale-95 cursor-pointer"
            >
              <span>Schedule Initial Consultation</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('services')}
              className="inline-flex items-center gap-2 border border-white/20 bg-white/5 backdrop-blur-sm text-white px-7 py-3.5 rounded-full hover:bg-white/10 hover:border-white/40 transition-all cursor-pointer"
            >
              <span>View Architectural Services</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="w-full border-t border-white/10 py-12 px-6 sm:px-12 text-xs text-white/50 flex flex-col sm:flex-row items-center justify-between gap-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-white/80 font-medium">
          <span className="text-[#74dc14] font-bold">LIVINOR</span>
          <span className="text-white/30">•</span>
          <span>Innovative Architecture & Design</span>
        </div>
        <div className="flex items-center gap-6">
          <button type="button" onClick={() => onNavigate?.('about')} className="hover:text-white transition-colors cursor-pointer">About</button>
          <button type="button" onClick={() => onNavigate?.('services')} className="hover:text-white transition-colors cursor-pointer">Services</button>
          <button type="button" onClick={() => onNavigate?.('team')} className="hover:text-white transition-colors cursor-pointer">Team</button>
          <button type="button" onClick={() => onNavigate?.('contact')} className="hover:text-white transition-colors cursor-pointer">Contact</button>
        </div>
        <p>© {new Date().getFullYear()} LIVINOR Architecture Studio. All rights reserved.</p>
      </footer>
    </div>
  )
}
