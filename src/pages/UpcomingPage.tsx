import { ArrowLeft, Sparkles, Building, Layers, ShieldCheck, Mail } from 'lucide-react'

interface UpcomingPageProps {
  pageId: string
  onBack: () => void
}

export function UpcomingPage({ pageId, onBack }: UpcomingPageProps) {
  const pageDetails: Record<string, { title: string; subtitle: string; icon: any; content: string }> = {
    about: {
      title: 'About Homewide',
      subtitle: 'Redefining prime luxury real estate through architectural discernment and discretion.',
      icon: Building,
      content: 'Founded to bridge architectural brilliance and bespoke private acquisitions, Homewide curates premier residences across the globe. Our advisors specialize in off-market estates and iconic modern properties.',
    },
    works: {
      title: 'ccWorks Architectural Studio',
      subtitle: 'Our proprietary architectural curation and private development advisory framework.',
      icon: Layers,
      content: 'ccWorks collaborates with top-tier architects, landscape designers, and private investors to conceptualize, renovate, and execute world-class residences.',
    },
    services: {
      title: 'Private Client Services',
      subtitle: 'End-to-end luxury brokerage, private aviation transfer, and bespoke advisory.',
      icon: ShieldCheck,
      content: 'From confidential off-market sourcing to cross-border capital management and concierge escrow services, Homewide delivers an uncompromised acquisition experience.',
    },
    contact: {
      title: 'Contact & Private Inquiries',
      subtitle: 'Schedule a confidential appointment or private showing with a senior advisor.',
      icon: Mail,
      content: 'Our global offices in Beverly Hills, Manhattan, London, and Dubai are available for confidential consultations. Complete an inquiry to access private listings.',
    },
  }

  const details = pageDetails[pageId] || {
    title: 'Upcoming Page',
    subtitle: 'This page is being prepared with full architectural portfolios.',
    icon: Sparkles,
    content: 'Check back soon for interactive property tours and detailed specifications.',
  }

  const Icon = details.icon

  return (
    <div className="min-h-screen w-full bg-[#121214] text-white pt-36 pb-20 px-6 sm:px-12 flex flex-col justify-between">
      <div className="max-w-4xl mx-auto w-full">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white/60 hover:text-white mb-8 transition-colors cursor-pointer group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Return to Horizon Hero</span>
        </button>

        {/* Header */}
        <div className="p-8 sm:p-12 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Icon size={180} />
          </div>

          <div className="p-3 w-fit rounded-xl bg-white/10 mb-6 text-[#d6c2b1]">
            <Icon size={28} />
          </div>

          <span className="text-xs uppercase tracking-[0.25em] text-[#d6c2b1] font-semibold block mb-2">
            Homewide • Horizon
          </span>
          <h1 className="text-3xl sm:text-5xl font-light text-white mb-4 tracking-tight">
            {details.title}
          </h1>
          <p className="text-white/70 text-base sm:text-lg font-light leading-relaxed max-w-2xl mb-8">
            {details.subtitle}
          </p>

          <div className="border-t border-white/10 pt-6">
            <p className="text-white/60 text-sm leading-relaxed max-w-2xl font-light">
              {details.content}
            </p>
          </div>

          {pageId === 'contact' && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <input
                type="text"
                placeholder="Your Full Name"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#d6c2b1]"
              />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#d6c2b1]"
              />
              <button
                type="button"
                className="sm:col-span-2 py-3 px-6 rounded-xl bg-white text-neutral-900 font-medium text-sm hover:bg-neutral-100 transition-colors shadow-md"
              >
                Request Confidential Callback
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-white/40 mt-16">
        Homewide Private Portfolio • Horizon Collection
      </div>
    </div>
  )
}
