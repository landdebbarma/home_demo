import { useState } from 'react'
import { ArrowUpRight, X, Sparkles, CheckCircle2 } from 'lucide-react'

interface HeroProps {
  onContactClick?: () => void
}

export function Hero({ onContactClick }: HeroProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })

  const handleContact = () => {
    if (onContactClick) {
      onContactClick()
    } else {
      setModalOpen(true)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitted(true)
    setTimeout(() => {
      setModalOpen(false)
      setFormSubmitted(false)
      setFormData({ name: '', email: '', message: '' })
    }, 2200)
  }

  return (
    <section className="relative w-full h-screen min-h-[640px] max-h-[1080px] flex flex-col justify-between overflow-hidden bg-[#0a0c0f] text-white select-none">
      {/* 1. Cinematic Background Layer with Villa & Typography */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/livinor_hero_bg.jpg"
          alt="LIVINOR Modern Luxury Architecture Villa"
          className="w-full h-full object-cover object-[center_30%] sm:object-[center_35%] lg:object-center transition-transform duration-1000 ease-out scale-[1.01]"
        />

        {/* Top Dusk Sky Subtle Darkening for Nav Legibility */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/45 via-black/15 to-transparent pointer-events-none" />

        {/* Bottom Ground Dark Vignette matching reference */}
        <div className="absolute bottom-0 inset-x-0 h-72 sm:h-84 lg:h-96 bg-gradient-to-t from-[#090b0e] via-[#090b0e]/75 to-transparent pointer-events-none" />
      </div>

      {/* 2. Top spacing buffer for the fixed header */}
      <div className="relative z-10 w-full pt-28 sm:pt-36 pointer-events-none" />

      {/* 3. Bottom Hero Content Area */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pb-10 sm:pb-14 lg:pb-16 mt-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 lg:gap-12">
          
          {/* Left Column: Heading + Description inline on desktop */}
          <div className="flex flex-col xl:flex-row xl:items-end gap-5 sm:gap-7 xl:gap-8 max-w-4xl">
            {/* Main Punchy 3-line Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-semibold text-white tracking-tight leading-[1.14] drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
              Experience innovative<br />
              architecture that transforms<br />
              your vision
            </h1>

            {/* Subtitle description beside/below heading */}
            <p className="text-white/75 text-xs sm:text-sm md:text-[13px] font-normal leading-relaxed max-w-xs sm:max-w-sm drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] xl:pb-1">
              We craft inspiring spaces that blend cutting-edge design with enduringFunctionality, turning your vision into reality.
            </p>
          </div>

          {/* Right Column: High-Impact Neon Lime Contact Us Pill */}
          <div className="shrink-0 flex items-center">
            <button
              type="button"
              onClick={handleContact}
              className="group inline-flex items-center gap-3.5 bg-[#74dc14] hover:bg-[#68cb10] active:scale-95 text-neutral-950 font-semibold text-sm sm:text-base pl-6 sm:pl-7 pr-2.5 py-2.5 rounded-full transition-all duration-300 shadow-[0_4px_24px_rgba(116,220,20,0.35)] hover:shadow-[0_6px_32px_rgba(116,220,20,0.55)] cursor-pointer"
            >
              <span className="tracking-tight text-neutral-950 font-semibold">
                Contact Us
              </span>
              <span className="w-8 h-8 rounded-full bg-neutral-950 text-[#74dc14] flex items-center justify-center transition-all duration-300 group-hover:rotate-45 group-hover:bg-black shadow-sm">
                <ArrowUpRight size={17} strokeWidth={2.4} />
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* Interactive Contact Drawer / Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#12151b] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>

            {formSubmitted ? (
              <div className="py-8 text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-[#74dc14]/20 border border-[#74dc14]/40 flex items-center justify-center text-[#74dc14] mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Message Received</h3>
                <p className="text-sm text-white/70 max-w-xs">
                  A LIVINOR architectural director will connect with you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-[#74dc14]">
                  <Sparkles size={18} />
                  <span className="text-xs uppercase tracking-widest font-semibold">
                    LIVINOR Architecture
                  </span>
                </div>

                <h3 className="text-2xl font-semibold text-white tracking-tight">
                  Consult With Our Architects
                </h3>
                <p className="text-xs sm:text-sm text-white/65 -mt-1 leading-relaxed">
                  Tell us about your residential or commercial vision.
                </p>

                <div className="space-y-3 mt-2">
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your Name"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#74dc14]"
                  />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email Address"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#74dc14]"
                  />
                  <textarea
                    rows={3}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Project vision, location, or desired scope..."
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#74dc14] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full bg-[#74dc14] hover:bg-[#68cb10] active:scale-95 text-neutral-950 font-semibold py-3 rounded-full text-sm transition-all shadow-[0_2px_12px_rgba(116,220,20,0.3)] cursor-pointer"
                >
                  Send Consultation Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
