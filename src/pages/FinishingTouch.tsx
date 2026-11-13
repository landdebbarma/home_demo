import { useState, type CSSProperties } from 'react'
import { Link } from '../lib/router'
import { instagramUrl, telUrl, usePageMeta, useSite, type Media } from '../lib/site'
import { d, Img, Label, Lines, Paras } from '../components/ui'
import PaletteStudio from '../components/PaletteStudio'

// Brochure content that rarely changes lives here; editable copy and imagery comes from the admin.
const PROCESS = [
  { title: 'Discover & Design', text: 'Consultation & mood board development' },
  { title: 'Visualize', text: '3D visualisation & design presentation' },
  { title: 'Curate & Guide', text: 'Product selection & sourcing guidance' },
  { title: 'Style & Finish', text: 'Final styling & finishing touches' },
]
const DETAILS = [
  { title: 'Paints & Wall Finishes', items: ['Paint colours', 'Wall papers', 'Accent walls', 'Textured finishes', 'Feature wall concepts'] },
  { title: 'Furniture', items: ['Sofas', 'Beds', 'Accent chairs', 'Ottomans', 'Coffee tables', 'Dining tables'] },
  { title: 'Lighting', items: ['Floor lamps', 'Table lamps', 'Pendants', 'Ambient lighting'] },
  { title: 'Textiles', items: ['Rugs', 'Curtains', 'Cushions', 'Throws', 'Upholstery'] },
  { title: 'Art & Décor', items: ['Artwork', 'Mirrors', 'Vases', 'Sculptures', 'Candles', 'Décor pieces'] },
  { title: 'Greenery', items: ['Indoor plants', 'Artificial plants', 'Succulents', 'Planters', 'Green wall'] },
]
const MOOD = [
  { title: 'Natural warmth', text: 'Layered neutrals, natural textures and warm tones create a timeless, inviting foundation.' },
  { title: 'Layered details', text: 'Lighting, furniture, textiles and décor add depth, texture and personality to the space.' },
  { title: 'Refined palette', text: 'Earthy greens, warm taupes and rich neutrals come together to create a cohesive palette.' },
]
const COMPARE = {
  designer: [
    { title: 'Design focused', text: 'Designs the space through layouts, drawings and material solutions.', note: 'Focus is on how the space is planned.' },
    { title: 'Design + execution', text: 'Often includes vendor management, procurement and site coordination.', note: 'Focus is on delivering the complete project.' },
    { title: 'Project-based investment', text: 'Fees reflect the wider scope of design and execution.', note: 'Investment is aligned with full project scope.' },
    { title: 'Project delivery', text: 'Focused on completing the entire interior project.', note: 'End-to-end delivery of the designed solution.' },
  ],
  curator: [
    { title: 'You first', text: 'Focuses on your lifestyle, needs, personality and how you live.', note: 'Focus is on how the space feels to you.' },
    { title: 'Curated for you', text: 'Furniture, finishes and details are selected specifically for your space.', note: 'Focus is on what is right for your space.' },
    { title: 'Accessible, transparent fees', text: 'A focused design service without the cost structure of a full turnkey project.', note: 'Value-driven with complete transparency.' },
    { title: 'Relationship-driven', text: 'Guidance that helps you make confident decisions throughout the process.', note: 'The relationship continues beyond the handover.' },
  ],
}
const WHY = [
  { title: 'Personalized approach', text: 'Every space is unique because you are.' },
  { title: 'Thoughtful selection', text: 'We handpick each element with purpose.' },
  { title: 'Cohesive storytelling', text: 'Your home will have flow, function, and feeling.' },
  { title: 'Timeless investment', text: 'We create spaces that stand the test of time.' },
  { title: 'Beyond beautiful', text: 'We design experiences you’ll love every day.' },
]

export default function FinishingTouch() {
  const site = useSite()
  usePageMeta('The Finishing Touch by Jeanne — Interior Finishing & Curation', 'A signature interior finishing and curation service: furniture, lighting, textiles, art and décor curated around your existing interiors.')
  if (!site.ready) return null
  const f = site.content.finishing
  const c = site.content.contact
  const m = (img: Media | null) => img

  return (
    <>
      {/* Hero */}
      <section className="on-dark on-photo relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-ink text-ivory" aria-label="The Finishing Touch by Jeanne">
        <Img media={m(f.heroImage)} sizes="100vw" priority alt="" className="hero-settle !absolute inset-0 h-full w-full" imgClassName="h-full" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(42,36,32,.5)_0%,rgba(42,36,32,.38)_35%,rgba(42,36,32,.82)_100%)]" />
        <div className="wrap relative pb-14 text-center md:pb-20">
          <Label className="mb-6 font-medium text-ivory tracking-[.42em]"><span data-reveal style={d(4)} className="inline-block">Interior finishing &amp; curation services</span></Label>
          <Lines as="h1" text="The Finishing Touch" className="t-display mx-auto" delay={5} />
          <p className="t-script mt-1 text-6xl text-sand md:-mt-2 md:text-8xl lg:pl-[30%]" data-reveal style={d(7)}>by Jeanne</p>
          <div className="mx-auto mt-10 max-w-md" data-reveal style={d(8)}>
            <Paras text={f.heroText} className="text-[1.02rem] leading-8 text-ivory" />
            <a href="#consultation" className="btn mt-10">Book a consultation</a>
          </div>
        </div>
      </section>

      {/* 01 What we do */}
      <section className="wrap grid gap-14 py-24 md:grid-cols-12 md:gap-8 md:py-40" aria-labelledby="what-title">
        <div className="md:col-span-5">
          <div data-reveal="clip">
            <Img media={m(f.whatImage)} sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[3/4]" imgClassName="h-full" />
          </div>
        </div>
        <div className="md:col-span-6 md:col-start-7 md:pt-16">
          <Num n={1} label="What we do" />
          <Lines text={'Refining\nspaces'} className="t-h1 mt-8 uppercase tracking-[.02em] text-umber" />
          <p className="t-script mt-2 text-5xl text-ink-soft md:text-6xl" data-reveal style={d(2)}>Curating the details</p>
          <h2 id="what-title" className="sr-only">What we do</h2>
          <div className="mt-10 max-w-xl" data-reveal style={d(3)}>
            <Paras text={f.whatWeDo} />
          </div>
        </div>
      </section>

      {/* 02 Before / after */}
      <section className="bg-linen py-24 md:py-36" aria-labelledby="diff-title">
        <div className="wrap">
          <div className="grid gap-8 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <Num n={2} label="Transformations" />
              <Lines text={'The difference is\nin the details'} className="t-h1 mt-8" />
              <h2 id="diff-title" className="sr-only">The difference is in the details</h2>
            </div>
            <p className="t-script text-5xl leading-[.95] text-umber md:col-span-4 md:text-right md:text-6xl" data-reveal style={d(2)}>
              <span className="whitespace-nowrap">Curated pieces</span> <span className="whitespace-nowrap">= Cohesive spaces</span>
            </p>
          </div>
          <Transformations items={f.transformations} />
        </div>
      </section>

      {/* 03 Process */}
      <section className="wrap py-24 md:py-40" aria-labelledby="process-title">
        <div className="grid gap-8 md:grid-cols-12">
          <div className="md:col-span-7">
            <Num n={3} label="The process" />
            <Lines text={'From vision to\nfinishing touch'} className="t-h1 mt-8" />
            <h2 id="process-title" className="sr-only">The process</h2>
          </div>
          <p className="t-lead self-end italic text-ink-soft md:col-span-4 md:col-start-9" data-reveal style={d(2)}>
            “We don’t overwhelm you with choices. We take you through the choices.”
          </p>
        </div>
        <ol className="relative mt-20 grid gap-14 sm:grid-cols-2 md:mt-28 lg:grid-cols-4 lg:gap-8">
          <span aria-hidden="true" className="process-line absolute left-0 right-0 top-[1.4rem] hidden h-px origin-left bg-sand lg:block" data-reveal="fade" />
          {PROCESS.map((s, i) => (
            <li key={s.title} className="relative" data-reveal style={d(i + 1)}>
              <span className="t-num relative grid size-11 place-items-center rounded-full bg-sand text-lg text-ink">0{i + 1}</span>
              <h3 className="t-label mt-8 text-[.8rem] text-ink">{s.title}</h3>
              <p className="mt-3 text-ink-soft">{s.text}</p>
              <img src={`/finishing/process-${i + 1}.webp`} alt="" width={310} height={300} loading="lazy" className="mt-8 w-full max-w-[16rem] mix-blend-multiply" />
            </li>
          ))}
        </ol>
      </section>

      {/* 04 Details we curate */}
      <section className="on-dark bg-ink py-24 text-ivory md:py-36" aria-labelledby="details-title">
        <div className="wrap">
          <Num n={4} label="The details we curate" dark />
          <h2 id="details-title" className="sr-only">The details we curate</h2>
          <ul className="mt-14 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {DETAILS.map((g, i) => (
              <li key={g.title} className="rule py-8" data-reveal style={d(i % 3)}>
                <h3 className="t-h3">{g.title}</h3>
                <p className="mt-3 text-sm leading-7 tracking-wide text-ivory/65">{g.items.join(' · ')}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="wrap mt-16 md:mt-24">
          <div data-reveal="clip">
            <Img media={m(f.detailsImage)} sizes="100vw" className="aspect-[4/3] sm:aspect-[21/9]" imgClassName="h-full" />
          </div>
          <p className="t-h2 mt-10 text-center uppercase tracking-[.04em] text-sand md:mt-14" data-reveal>
            Thoughtfully selected. Beautifully layered.
          </p>
        </div>
      </section>

      {/* 05 Experience + mood board */}
      <section className="wrap grid gap-14 py-24 md:grid-cols-12 md:gap-8 md:py-40" aria-labelledby="exp-title">
        <div className="md:col-span-6 lg:col-span-5">
          <Num n={5} label="The Finishing Touch experience" />
          <Lines text={'A personalized\ndesign experience'} className="t-h1 mt-8" />
          <h2 id="exp-title" className="sr-only">A personalized design experience</h2>
          <div className="mt-10 max-w-md" data-reveal style={d(2)}>
            <Paras text={f.experienceText} />
          </div>
        </div>
        <div className="md:col-span-5 md:col-start-8 lg:col-span-5 lg:col-start-8">
          <div data-reveal="clip">
            <Img media={m(f.experienceImage)} sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[4/5]" imgClassName="h-full" />
          </div>
        </div>
      </section>

      <section className="bg-linen py-24 md:py-36" aria-labelledby="mood-title">
        <div className="wrap grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <h2 id="mood-title" className="t-h1" data-reveal>
              Mood <span className="t-script -ml-1 align-[-.08em] text-[1.35em] text-umber">Board</span>
            </h2>
            <ol className="mt-12 space-y-8">
              {MOOD.map((x, i) => (
                <li key={x.title} className="rule grid grid-cols-[2.5rem_1fr] pt-5" data-reveal style={d(i)}>
                  <span className="t-num text-umber">0{i + 1}</span>
                  <div>
                    <h3 className="t-label text-ink">{x.title}</h3>
                    <p className="mt-2 text-[.95rem] leading-7 text-ink-soft">{x.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-8" data-reveal="clip">
            <Img media={m(f.moodImage)} sizes="(min-width: 1024px) 64vw, 100vw" className="aspect-[4/3]" imgClassName="h-full !object-contain bg-[#f3f1ed]" />
          </div>
        </div>
        <div className="wrap">
          <PaletteStudio />
        </div>
      </section>

      {/* 06 Holistic styling */}
      <section className="grid md:grid-cols-2" aria-labelledby="holistic-title">
        <div data-reveal="clip" className="md:min-h-[100svh]">
          <Img media={m(f.holisticImage)} sizes="(min-width: 768px) 50vw, 100vw" className="aspect-[4/5] h-full md:aspect-auto" imgClassName="h-full" />
        </div>
        <div className="flex flex-col justify-center px-[var(--gutter)] py-20 md:py-28 lg:pl-24">
          <Num n={6} label="Holistic styling" />
          <Lines text={'Holistic\nstyling'} className="t-display mt-8 uppercase text-umber" />
          <h2 id="holistic-title" className="sr-only">Holistic styling</h2>
          <p className="t-script mt-3 text-5xl text-ink-soft md:text-6xl" data-reveal style={d(2)}>The art of bringing it all together</p>
          <div className="mt-10 max-w-md" data-reveal style={d(3)}>
            <Paras text={f.holisticText} />
          </div>
        </div>
      </section>

      {/* 07 Why we stand out */}
      <section className="wrap py-24 md:py-40" aria-labelledby="why-title">
        <Num n={7} label="Why we stand out" />
        <h2 id="why-title" className="t-h1 mt-8 flex flex-wrap items-baseline gap-x-5" data-reveal>
          <span>Interior Designer</span>
          <span className="t-script text-[1.1em] text-umber">vs</span>
          <span>Interior Curator</span>
        </h2>
        <p className="t-label mt-8 text-ink-soft" data-reveal style={d(1)}>We do more than make spaces look beautiful. We curate homes that feel like you.</p>
        <div className="mt-16 grid md:grid-cols-2">
          <Compare title="Interior Designer" rows={COMPARE.designer} />
          <Compare title="Interior Curator" rows={COMPARE.curator} highlight />
        </div>

        <div className="mt-24 md:mt-32">
          <h3 className="t-label text-center text-umber" data-reveal>Why choose us?</h3>
          <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0 lg:divide-x lg:divide-ink/10">
            {WHY.map((w, i) => (
              <li key={w.title} className="lg:px-6" data-reveal style={d(i)}>
                <p className="t-h3">{w.title}</p>
                <p className="mt-3 text-[.95rem] leading-7 text-ink-soft">{w.text}</p>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-20 max-w-3xl text-center font-serif text-2xl italic leading-snug text-umber md:text-3xl" data-reveal>
            We don’t just design spaces. We curate homes that reflect who you are.
          </p>
        </div>
      </section>

      {/* Consultation */}
      <section id="consultation" className="on-dark relative scroll-mt-0 overflow-hidden bg-ink text-ivory" aria-labelledby="consult-title">
        <Img media={m(f.ctaImage)} sizes="100vw" alt="" className="!absolute inset-0 h-full w-full" imgClassName="h-full" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(42,36,32,.82)_0%,rgba(42,36,32,.55)_60%,rgba(42,36,32,.35)_100%)]" />
        <div className="wrap relative grid min-h-[90svh] content-center gap-12 py-28 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="t-label mb-8 tracking-[.32em] text-ivory/80" data-reveal>Book your consultation today</p>
            <h2 id="consult-title" className="t-h1" data-reveal style={d(1)}>
              The Finishing Touch <span className="t-script inline-block whitespace-nowrap text-[.8em] text-sand">by Jeanne</span>
            </h2>
            <div className="mt-12" data-reveal style={d(2)}>
              <p className="font-serif text-2xl">Ar. Jeanne Joseph</p>
              <p className="t-label mt-2 text-ivory/70">Architect &amp; Interior Curator</p>
            </div>
          </div>
          <div className="md:col-span-4 md:col-start-9 md:self-end" data-reveal style={d(3)}>
            <ul className="space-y-4 text-[1.02rem]">
              <li><a className="link-line" href={telUrl(c.phone)}>{c.phone}</a></li>
              <li><a className="link-line" href={`mailto:${c.email}`}>{c.email}</a></li>
              <li><a className="link-line" href={instagramUrl(c.instagram)} target="_blank" rel="noopener noreferrer">@{c.instagram.replace(/^@/, '')}</a></li>
            </ul>
            <Link href="/contact?service=finishing-touch" className="btn mt-10">Send an enquiry</Link>
          </div>
        </div>
      </section>
    </>
  )
}

function Num({ n, label, dark }: { n: number; label: string; dark?: boolean }) {
  return (
    <p className={`flex items-center gap-5 ${dark ? 'text-taupe' : 'text-umber'}`} data-reveal>
      <span className="t-num text-3xl">0{n}</span>
      <span className="h-px w-10 bg-current opacity-50" />
      <span className="t-label">{label}</span>
    </p>
  )
}

function Compare({ title, rows, highlight }: { title: string; rows: typeof COMPARE.designer; highlight?: boolean }) {
  return (
    <div className={highlight ? 'bg-linen px-6 py-2 md:px-10' : 'py-2 md:pr-10'} data-reveal style={d(highlight ? 1 : 0)}>
      <h3 className="t-label py-6 text-center text-[.8rem] tracking-[.32em] text-ink">{title}</h3>
      <ul>
        {rows.map((r) => (
          <li key={r.title} className="rule grid gap-2 py-6 sm:grid-cols-[1fr_11rem] sm:gap-8">
            <div>
              <h4 className="t-label text-ink">{r.title}</h4>
              <p className="mt-2 text-[.95rem] leading-7 text-ink-soft">{r.text}</p>
            </div>
            <p className="font-serif text-lg italic leading-snug text-umber">{r.note}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Transformations({ items }: { items: { label: string; before: Media | null; after: Media | null }[] }) {
  const [active, setActive] = useState(0)
  const shown = items.filter((t) => t.before && t.after)
  if (!shown.length) return null
  const t = shown[Math.min(active, shown.length - 1)]
  return (
    <div className="mt-14 md:mt-20" data-reveal>
      {shown.length > 1 && (
        <div role="tablist" aria-label="Transformations" className="mb-8 flex gap-8">
          {shown.map((s, i) => (
            <button key={s.label + i} role="tab" aria-selected={i === active} type="button" onClick={() => setActive(i)}
              className={`t-label py-1 ${i === active ? 'border-b border-ink text-ink' : 'text-ink-soft hover:text-ink'}`}>
              {s.label}
            </button>
          ))}
        </div>
      )}
      <BeforeAfter key={t.label + active} before={t.before!} after={t.after!} label={t.label} />
    </div>
  )
}

/** Comparison slider. A native range input drives it, so it works with mouse, touch and keyboard. */
function BeforeAfter({ before, after, label }: { before: Media; after: Media; label: string }) {
  const [pos, setPos] = useState(50)
  return (
    <div className="relative select-none overflow-hidden" style={{ '--pos': `${pos}%` } as CSSProperties}>
      <Img media={after} sizes="(min-width: 1440px) 1280px, 100vw" className="aspect-[4/5] sm:aspect-[16/10]" imgClassName="h-full" />
      <div className="absolute inset-0 [clip-path:inset(0_calc(100%-var(--pos))_0_0)]">
        <Img media={before} sizes="(min-width: 1440px) 1280px, 100vw" className="h-full w-full" imgClassName="h-full" />
      </div>
      <span className="t-label pointer-events-none absolute left-4 top-4 bg-ivory/90 px-3 py-1.5 text-ink">Before</span>
      <span className="t-label pointer-events-none absolute right-4 top-4 bg-ink/80 px-3 py-1.5 text-ivory">After</span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[var(--pos)] w-px -translate-x-1/2 bg-ivory">
        <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-ivory bg-ink/30 text-ivory backdrop-blur-sm">
          ‹ ›
        </span>
      </span>
      <input
        type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)}
        aria-label={`${label}: drag to compare before and after`}
        className="ba-range absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  )
}
