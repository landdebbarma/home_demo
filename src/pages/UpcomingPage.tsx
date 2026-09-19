import { ArrowLeft, Sparkles, Building, Layers, Users, Mail } from 'lucide-react'

interface UpcomingPageProps {
  pageId: string
  onBack: () => void
}

export function UpcomingPage({ pageId, onBack }: UpcomingPageProps) {
  const pageDetails: Record<string, { title: string; subtitle: string; icon: any; content: string }> = {
    about: {
      title: 'About LIVINOR',
      subtitle: 'Sculpting timeless contemporary architecture with enduring structural integrity.',
      icon: Building,
      content: 'LIVINOR was founded on the conviction that exceptional architecture should elevate the human spirit while harmonizing with surrounding landscapes. Our award-winning international team specializes in bespoke residential estates, cantilevered structures, and sustainable high-performance building envelopes.',
    },
    services: {
      title: 'Architectural & Master Planning Services',
      subtitle: 'Comprehensive architectural development from concept to construction administration.',
      icon: Layers,
      content: 'We provide full-spectrum architectural design, structural engineering integration, sustainable daylighting analysis, interior millwork detailing, and on-site construction supervision for high-end residential and landmark commercial projects.',
    },
    team: {
      title: 'Our Architectural Partners & Directors',
      subtitle: 'A multidisciplinary team of visionary architects, structural innovators, and master planners.',
      icon: Users,
      content: 'Led by principal architects with decades of experience spanning Scandinavia, Tokyo, London, and California, LIVINOR brings rigorous technical craft and bespoke aesthetic sophistication to every commission.',
    },
    contact: {
      title: 'Consult With Our Architects',
      subtitle: 'Initiate a conversation regarding your future residence or architectural endeavor.',
      icon: Mail,
      content: 'Our architectural studios in Zurich, London, and New York accept a limited number of residential and private estate commissions annually to ensure meticulous oversight and craftsmanship.',
    },
  }

  const details = pageDetails[pageId] || {
    title: 'LIVINOR Architecture',
    subtitle: 'This section is being curated with comprehensive blueprints and photography.',
    icon: Sparkles,
    content: 'Check back shortly for interactive virtual 3D walkthroughs.',
  }

  const Icon = details.icon

  return (
    <div className="min-h-screen w-full bg-[#0a0c0f] text-white pt-36 pb-20 px-6 sm:px-12 flex flex-col justify-between">
      <div className="max-w-4xl mx-auto w-full">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white/60 hover:text-[#74dc14] mb-8 transition-colors cursor-pointer group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Return to LIVINOR Hero</span>
        </button>

        {/* Header Container */}
        <div className="p-8 sm:p-12 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-[#74dc14]">
            <Icon size={180} />
          </div>

          <div className="p-3 w-fit rounded-xl bg-white/10 mb-6 text-[#74dc14]">
            <Icon size={28} />
          </div>

          <span className="text-xs uppercase tracking-[0.25em] text-[#74dc14] font-semibold block mb-2">
            LIVINOR Architecture
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
                placeholder="Full Name"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#74dc14]"
              />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#74dc14]"
              />
              <button
                type="button"
                className="sm:col-span-2 py-3 px-6 rounded-full bg-[#74dc14] text-neutral-950 font-semibold text-sm hover:bg-[#68cb10] transition-colors shadow-md cursor-pointer"
              >
                Request Architectural Consultation
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-white/40 mt-16">
        LIVINOR Architecture & Structural Design
      </div>
    </div>
  )
}
