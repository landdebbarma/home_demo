import { useRef } from 'react'
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react'

interface PropertyCard {
  id: string
  title: string
  location: string
  price: string
  image: string
  tag: string
}

export function Hero() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const properties: PropertyCard[] = [
    {
      id: 'villa-1',
      title: 'Villa Lumina',
      location: 'Malibu Coast, CA',
      price: '$6,850,000',
      image: '/images/luxury_villa_1.jpg',
      tag: 'Architectural Masterpiece',
    },
    {
      id: 'villa-2',
      title: 'Aura Infinity Estate',
      location: 'Aspen Ridge, CO',
      price: '$12,400,000',
      image: '/images/luxury_villa_2.jpg',
      tag: 'Panoramic Sunset View',
    },
    {
      id: 'villa-3',
      title: 'The Glass Pavilion',
      location: 'Scottsdale, AZ',
      price: '$5,900,000',
      image: '/images/luxury_villa_3.jpg',
      tag: 'Minimalist Sanctuary',
    },
    {
      id: 'villa-4',
      title: 'Solstice Villa',
      location: 'Bel Air, CA',
      price: '$8,250,000',
      image: '/images/luxury_villa_1.jpg',
      tag: 'Exclusive Modern Living',
    },
  ]

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  return (
    <section className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden bg-[#121214] text-white pt-32 sm:pt-36 pb-12 sm:pb-16 select-none">
      {/* Background Dusk Skyline */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/skyline_dusk.jpg"
          alt="Twilight city skyline with illuminated skyscraper"
          className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
        />
        
        {/* Cinematic Vignette and Dark Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/90 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-[circle_at_center,_transparent_40%,_rgba(0,0,0,0.6)_100%] pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#121214] via-[#121214]/80 to-transparent pointer-events-none" />
      </div>

      {/* Typographic Backdrop: HORIZON */}
      <div className="relative z-10 w-full flex items-center justify-center pointer-events-none my-auto px-4 py-6 sm:py-10">
        <h1
          className="text-[10vw] md:text-[8.5vw] lg:text-[8vw] font-bold uppercase tracking-[0.16em] sm:tracking-[0.22em] leading-none text-[#d6c2b1]/80 drop-shadow-[0_8px_24px_rgba(0,0,0,0.7)] transition-all duration-300 select-none text-center max-w-6xl mx-auto"
        >
          HORIZON
        </h1>
      </div>

      {/* Bottom Content Area */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 mt-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
          
          {/* Left Column: Heading & Subtitle */}
          <div className="lg:col-span-5 flex flex-col justify-end">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-white leading-[1.1] drop-shadow-md">
              The World
              <br />
              <span className="font-semibold text-white">Of Luxury</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-white/80 max-w-sm leading-relaxed font-light drop-shadow">
              Unlock the perfect living experience by exploring a diverse selection of homes.
            </p>

            {/* Slider Navigation Chevrons */}
            <div className="mt-6 hidden sm:flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => scroll('left')}
                className="w-10 h-10 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 hover:border-white/40 transition-all cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                className="w-10 h-10 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 hover:border-white/40 transition-all cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Right Column: Horizontal Cards Strip */}
          <div className="lg:col-span-7 overflow-hidden">
            <div
              ref={scrollContainerRef}
              className="flex items-center gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth pb-4 pt-2 -mx-2 px-2"
            >
              {properties.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex-shrink-0 w-[240px] sm:w-[280px] md:w-[300px] aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/25 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:border-white/60 hover:shadow-black/60 cursor-pointer"
                >
                  {/* Property Image */}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                  />

                  {/* Dark gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#d6c2b1]">
                      {item.tag}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <h3 className="text-sm font-semibold text-white">
                        {item.title}
                      </h3>
                      <span className="p-1 rounded-full bg-white/20 backdrop-blur text-white">
                        <ArrowUpRight size={14} />
                      </span>
                    </div>
                    <p className="text-xs font-medium text-white/80 mt-0.5">
                      {item.price} • {item.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
