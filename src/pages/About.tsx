import { Link } from '../lib/router'
import { usePageMeta, useSite, type Media } from '../lib/site'
import { d, Img, Label, Lines, Paras } from '../components/ui'

export default function About() {
  const site = useSite()
  usePageMeta('About Ar. Jeanne Joseph — The Cornerstone Architect', 'Meet Ar. Jeanne Joseph, architect and interior designer, and the thinking behind The Cornerstone Architect.')
  if (!site.ready) return null
  const a = site.content.about
  const m = (img: Media | null) => img
  const [firstPara, ...restParas] = a.approach.split(/\n\s*\n/)

  return (
    <>
      {/* Opening spread */}
      <section className="wrap grid gap-14 pb-24 pt-[calc(var(--header-h)+4rem)] md:grid-cols-12 md:gap-8 md:pb-36 md:pt-[calc(var(--header-h)+7rem)]">
        <div className="relative z-10 md:col-span-7">
          <Label className="mb-8 text-umber"><span data-reveal className="inline-block">About the studio</span></Label>
          <p className="t-label mb-3 text-ink-soft" data-reveal style={d(1)}>Ar.</p>
          <Lines as="h1" text={'Jeanne\nJoseph'} className="t-display md:text-[clamp(4rem,10vw,10.5rem)]" delay={1} />
          <div className="mt-6 flex items-center gap-6" data-reveal style={d(3)}>
            <span className="h-px w-14 bg-cornerstone" />
            <p className="t-label text-ink-soft">{a.role} · Bengaluru</p>
          </div>
        </div>
        <div className="md:col-span-5 md:-ml-16 md:mt-24 lg:-ml-24">
          <div data-reveal="clip">
            <Img media={m(a.portrait)} alt="Portrait of Ar. Jeanne Joseph" sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[3/4]" imgClassName="h-full" />
          </div>
          {!a.portrait && <p className="mt-3 text-xs text-ink-soft">Portrait to be supplied.</p>}
        </div>
      </section>

      {/* A personal note */}
      <section className="wrap grid gap-10 pb-24 md:grid-cols-12 md:pb-36">
        <Label className="text-umber md:col-span-3"><span data-reveal className="inline-block">In her words</span></Label>
        <div className="md:col-span-8 lg:col-span-7" data-reveal>
          <Paras text={a.intro} className="t-lead space-y-6 text-ink" />
          <p className="t-script mt-10 text-6xl text-umber" aria-hidden="true">Jeanne</p>
        </div>
      </section>

      {/* Approach — magazine columns on linen */}
      <section className="bg-linen py-24 md:py-36">
        <div className="wrap">
          <Label className="mb-10 text-umber"><span data-reveal className="inline-block">The approach</span></Label>
          <p className="t-h2 max-w-[22ch] md:max-w-[28ch]" data-reveal>{firstPara}</p>
          {restParas.length > 0 && (
            <div className={`mt-14 ${restParas.length > 1 ? 'md:columns-2 md:gap-16 lg:w-5/6' : 'max-w-2xl'}`} data-reveal style={d(1)}>
              <Paras text={restParas.join('\n\n')} />
            </div>
          )}
        </div>
      </section>

      {/* Image pair */}
      <section className="wrap grid gap-8 py-24 md:grid-cols-12 md:py-36">
        <div className="md:col-span-7" data-reveal="clip">
          <Img media={m(a.imageA)} sizes="(min-width: 768px) 58vw, 100vw" className="aspect-[4/3]" imgClassName="h-full" />
        </div>
        <div className="md:col-span-4 md:col-start-9 md:mt-56" data-reveal="clip" style={d(1)}>
          <Img media={m(a.imageB)} sizes="(min-width: 768px) 33vw, 100vw" className="aspect-[4/5]" imgClassName="h-full" />
        </div>
      </section>

      {/* Background */}
      <section className="wrap grid gap-10 pb-24 md:grid-cols-12 md:pb-36">
        <Label className="text-umber md:col-span-3"><span data-reveal className="inline-block">Background</span></Label>
        <div className="md:col-span-7" data-reveal>
          <Paras text={a.background} />
        </div>
      </section>

      {/* Values */}
      <section className="on-dark bg-ink py-24 text-ivory md:py-36" aria-labelledby="values-title">
        <div className="wrap">
          <div className="grid gap-10 md:grid-cols-12">
            <Label className="text-taupe md:col-span-3"><span data-reveal className="inline-block">What guides the work</span></Label>
            <Lines text="Values" className="t-h1 md:col-span-8" />
            <h2 id="values-title" className="sr-only">Values</h2>
          </div>
          <ol className="mt-16 grid gap-x-16 md:mt-24 md:grid-cols-2">
            {a.values.map((v, i) => (
              <li key={i} className="rule grid grid-cols-[4rem_1fr] gap-4 py-10" data-reveal style={d(i % 2)}>
                <span className="t-num text-3xl text-taupe">0{i + 1}</span>
                <div>
                  <h3 className="t-h3">{v.title}</h3>
                  <p className="mt-3 text-ivory/75">{v.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Onward */}
      <section className="wrap grid gap-px py-20 md:grid-cols-2 md:py-28">
        <Link href="/projects" className="group rule block py-10 md:pr-10" data-reveal>
          <p className="t-label text-umber">See the work</p>
          <p className="t-h2 mt-4 transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-2">Projects →</p>
        </Link>
        <Link href="/the-finishing-touch" className="group rule block py-10 md:pl-10" data-reveal style={d(1)}>
          <p className="t-label text-umber">A signature service</p>
          <p className="t-h2 mt-4 transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-2">The Finishing Touch →</p>
        </Link>
      </section>
    </>
  )
}
