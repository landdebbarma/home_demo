import { Link } from '../lib/router'
import { telUrl, usePageMeta, useSite, type ProjectSummary } from '../lib/site'
import { d, Img, Label, Lines, Paras } from '../components/ui'

export default function Home() {
  const site = useSite()
  usePageMeta('The Cornerstone Architect — Architecture & Interior Design, Bengaluru')
  if (!site.ready) return null
  const { home, contact } = site.content
  const m = (id: string | null) => (id ? site.media[id] : null)
  const featured = site.projects.filter((p) => p.featured).slice(0, 4)
  const shown = featured.length ? featured : site.projects.slice(0, 3)

  return (
    <>
      {/* 1 — Hero: full-bleed photograph, type set low and large */}
      <section className="on-dark on-photo relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-ink text-ivory" aria-label="Introduction">
        <Img media={m(home.heroImage)} sizes="100vw" priority alt="" className="hero-settle !absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(42,36,32,.42)_0%,rgba(42,36,32,.08)_26%,rgba(42,36,32,.34)_50%,rgba(42,36,32,.8)_100%)]" />
        <div className="wrap relative pb-12 md:pb-16">
          <Label className="mb-6 font-medium text-ivory md:mb-8">
            <span data-reveal style={d(4)} className="inline-block">{home.heroEyebrow}</span>
          </Label>
          <Lines as="h1" text={home.heroTitle} className="t-display" delay={2} />
          <div className="mt-10 flex items-end justify-between gap-8 md:mt-14">
            <Link href="/projects" className="cta" data-reveal style={d(9)}>
              <span className="cta-line" /> View the work
            </Link>
            <p className="t-label hidden text-ivory/70 sm:block" data-reveal style={d(10)}>Scroll</p>
          </div>
        </div>
      </section>

      {/* 2 — Studio introduction: offset editorial composition */}
      <section className="wrap grid gap-12 py-24 md:grid-cols-12 md:gap-8 md:py-36 lg:py-44">
        <div className="md:col-span-2">
          <Label className="text-umber" ><span data-reveal className="inline-block">The Studio</span></Label>
        </div>
        <div className="md:col-span-6 lg:col-span-5">
          <Lines text={home.introTitle} className="t-h2 text-ink" />
          <div data-reveal style={d(2)} className="mt-10 max-w-[34rem]">
            <Paras text={home.introText} />
          </div>
          <Link href="/about" className="cta mt-12 text-ink" data-reveal style={d(3)}>
            <span className="cta-line" /> About the studio
          </Link>
        </div>
        <div className="md:col-span-4 md:col-start-9 lg:col-span-4 lg:col-start-9 md:pt-40">
          <Img media={m(home.introImage)} sizes="(min-width: 768px) 30vw, 100vw" className="aspect-[4/5]" imgClassName="h-full" />
        </div>
      </section>

      {/* 3 — Selected projects: varied, large compositions */}
      <section aria-labelledby="work-title" className="pb-24 md:pb-40">
        <div className="wrap mb-14 flex items-end justify-between gap-6 md:mb-20">
          <div>
            <Label className="mb-5 text-umber"><span data-reveal className="inline-block">Selected work</span></Label>
            <Lines id="work-title" text="Projects" className="t-h1" />
          </div>
          <Link href="/projects" className="cta shrink-0 pb-2" data-reveal>
            <span className="cta-line" /> <span className="hidden sm:inline">All projects</span><span className="sm:hidden">All</span>
          </Link>
        </div>
        <ProjectsShowcase projects={shown} />
      </section>

      {/* 4 — Philosophy: numbered horizontal sequence on linen */}
      <section className="bg-linen py-24 md:py-36" aria-labelledby="philosophy-title">
        <div className="wrap">
          <div className="grid gap-10 md:grid-cols-12">
            <Label className="text-umber md:col-span-3"><span data-reveal className="inline-block">Design philosophy</span></Label>
            <h2 id="philosophy-title" className="sr-only">Design philosophy</h2>
            <p className="t-h2 md:col-span-8 lg:col-span-7" data-reveal>
              Every decision is weighed against how it will feel to live with, <em className="text-umber">long after</em> the work is finished.
            </p>
          </div>
          <ol className="mt-20 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:mt-28 lg:grid-cols-4">
            {home.philosophy.map((p, i) => (
              <li key={i} className="rule pt-7" data-reveal style={d(i)}>
                <span className="t-num text-lg text-umber">0{i + 1}</span>
                <h3 className="t-h3 mt-6">{p.title}</h3>
                <p className="mt-4 text-[.98rem] leading-7 text-ink-soft">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5 — The architect: intimate, editorial */}
      <section className="wrap grid items-center gap-12 py-24 md:grid-cols-12 md:gap-8 md:py-40">
        <div className="md:col-span-5 lg:col-span-5">
          <Img media={m(home.storyImage)} sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[3/4]" imgClassName="h-full" />
        </div>
        <div className="md:col-span-6 md:col-start-7 lg:col-span-5 lg:col-start-7">
          <Label className="mb-8 text-umber"><span data-reveal className="inline-block">The Architect</span></Label>
          <Lines text={'Ar. Jeanne\nJoseph'} className="t-h1" />
          <p className="t-script mt-2 text-5xl text-umber md:text-6xl" data-reveal style={d(2)} aria-hidden="true">Jeanne</p>
          <div className="mt-8" data-reveal style={d(3)}>
            <Paras text={home.storyText} />
          </div>
          <Link href="/about" className="cta mt-12" data-reveal style={d(4)}>
            <span className="cta-line" /> Read her story
          </Link>
        </div>
      </section>

      {/* 6 — The Finishing Touch: full-bleed feature */}
      <section className="on-dark relative overflow-hidden bg-ink text-ivory" aria-labelledby="ft-title">
        <Img media={m(home.finishingImage)} sizes="100vw" alt="" className="!absolute inset-0 h-full w-full" imgClassName="h-full" />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="wrap relative grid min-h-[88svh] content-center gap-10 py-28 md:grid-cols-12">
          <div className="md:col-span-8 lg:col-span-7">
            <Label className="mb-8 text-ivory/80"><span data-reveal className="inline-block">A signature service</span></Label>
            <h2 id="ft-title" className="t-display" data-reveal>
              The Finishing Touch
            </h2>
            <p className="t-script -mt-1 text-right text-6xl text-sand md:-mt-4 md:text-8xl" data-reveal style={d(1)}>by Jeanne</p>
          </div>
          <div className="md:col-span-4 md:col-start-9 md:self-end" data-reveal style={d(2)}>
            <p className="text-[1.02rem] leading-8 text-ivory/85">
              Interior finishing and curation — furniture, lighting, textiles, art and décor, curated around your existing interiors.
            </p>
            <Link href="/the-finishing-touch" className="btn mt-10">Discover the service</Link>
          </div>
        </div>
      </section>

      {/* 7 — Closing */}
      <section className="wrap py-28 text-center md:py-44" aria-labelledby="closing-title">
        <Label className="mb-10 text-umber"><span data-reveal className="inline-block">Begin a project</span></Label>
        <Lines as="h2" id="closing-title" text={"Let’s begin with\na conversation."} className="t-h1 mx-auto" />
        <div className="mt-14 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-12" data-reveal style={d(2)}>
          <Link href="/contact" className="btn">Make an enquiry</Link>
          <a href={telUrl(contact.phone)} className="link-line t-label">{contact.phone}</a>
        </div>
      </section>
    </>
  )
}

/** Alternating compositions: a wide lead, then an offset pair, then wide again. */
function ProjectsShowcase({ projects }: { projects: ProjectSummary[] }) {
  if (!projects.length) {
    return <p className="wrap text-ink-soft">Projects will appear here once published.</p>
  }
  const [lead, ...rest] = projects
  return (
    <div className="space-y-20 md:space-y-32">
      <ProjectTile p={lead} index={0} layout="wide" />
      {rest.length > 0 && (
        <div className="wrap grid gap-20 md:grid-cols-12 md:gap-8">
          {rest.slice(0, 2).map((p, i) => (
            <div key={p.id} className={i === 0 ? 'md:col-span-5' : 'md:col-span-6 md:col-start-7 md:mt-48'}>
              <ProjectTile p={p} index={i + 1} layout={i === 0 ? 'tall' : 'landscape'} />
            </div>
          ))}
        </div>
      )}
      {rest[2] && <ProjectTile p={rest[2]} index={3} layout="wide" />}
    </div>
  )
}

export function ProjectTile({ p, index, layout }: { p: ProjectSummary; index: number; layout: 'wide' | 'tall' | 'landscape' }) {
  const ratio = layout === 'wide' ? 'aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]' : layout === 'tall' ? 'aspect-[4/5]' : 'aspect-[4/3]'
  const sizes = layout === 'wide' ? '100vw' : '(min-width: 768px) 45vw, 100vw'
  return (
    <Link href={`/projects/${p.slug}`} className={`group block ${layout === 'wide' ? 'wrap' : ''}`}>
      <div data-reveal="clip" className="hover-zoom">
        <Img media={p.cover} sizes={sizes} className={ratio} imgClassName="h-full" vt={`cover-${p.slug}`} />
      </div>
      <div className={`mt-6 flex flex-col gap-2 ${layout === 'wide' ? 'md:flex-row md:items-baseline md:justify-between md:gap-6' : ''}`} data-reveal style={d(1)}>
        <div className="flex items-baseline gap-5">
          <span className="t-num text-umber">0{index + 1}</span>
          <h3 className="t-h3 transition-colors duration-200 group-hover:text-umber">{p.title}</h3>
        </div>
        <p className="t-label text-ink-soft">{[p.category, p.location].filter(Boolean).join(' · ')}</p>
      </div>
    </Link>
  )
}
