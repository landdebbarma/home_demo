import { Link } from '../lib/router'
import { usePageMeta, useSite, type Media, type Project } from '../lib/site'
import { d, Img, Label, Lines, Paras, T } from '../components/ui'
import NotFound from './NotFound'

type Neighbour = Pick<Project, 'slug' | 'title' | 'cover'> | null

export default function ProjectDetail({ slug }: { slug: string }) {
  const { projects } = useSite()
  const i = projects.findIndex((p) => p.slug === slug)
  const project = projects[i]
  usePageMeta(project ? `${project.title} — The Cornerstone Architect` : 'Page not found — The Cornerstone Architect', project?.summary.replace(/[[\]]/g, ''))
  if (!project) return <NotFound />
  const many = projects.length > 1
  return <ProjectView project={project} prev={many ? projects.at(i - 1)! : null} next={many ? projects[(i + 1) % projects.length] : null} />
}

/** The project page layout. Also used by the admin to preview unsaved drafts. */
export function ProjectView({ project: p, prev, next }: { project: Project; prev: Neighbour; next: Neighbour }) {
  const facts = [
    ['Category', p.category],
    ['Location', p.location],
    ['Year', p.year],
    ...p.meta.map((m) => [m.label, m.value]),
  ].filter(([, v]) => v)

  return (
    <article>
      <header className="wrap grid gap-10 pb-14 pt-[calc(var(--header-h)+4rem)] md:grid-cols-12 md:pb-20 md:pt-[calc(var(--header-h)+7rem)]">
        <div className="md:col-span-8">
          <Label className="mb-6 text-umber">
            <Link href="/projects" className="link-line">Projects</Link>
            {p.category && <span className="text-ink-soft"> &nbsp;/&nbsp; {p.category}</span>}
          </Label>
          <Lines as="h1" text={p.title} className="t-display" />
        </div>
        {p.location && (
          <p className="t-label self-end text-ink-soft md:col-span-3 md:col-start-10 md:text-right" data-reveal style={d(2)}>
            {[p.location, p.year].filter(Boolean).join(' — ')}
          </p>
        )}
      </header>

      <Img media={p.cover} sizes="100vw" priority className="aspect-[4/5] w-full sm:aspect-[16/9] lg:aspect-[2/1]" imgClassName="h-full" vt={`cover-${p.slug}`} />

      <section className="wrap grid gap-14 py-20 md:grid-cols-12 md:gap-8 md:py-32">
        <dl className="grid content-start gap-6 md:col-span-3" data-reveal>
          {facts.map(([k, v]) => (
            <div key={k} className="rule pt-4">
              <dt className="t-label text-umber">{k}</dt>
              <dd className="mt-2 text-ink-soft"><T text={v} /></dd>
            </div>
          ))}
        </dl>
        <div className="md:col-span-7 md:col-start-6">
          {p.summary && <Paras text={p.summary} className="t-lead text-ink" />}
          {p.body && (
            <div className="mt-10" data-reveal style={d(1)}>
              <Paras text={p.body} />
            </div>
          )}
        </div>
      </section>

      {p.gallery.length > 0 && <Gallery images={p.gallery} />}

      {next && (
        <nav aria-label="More projects" className="mt-24 md:mt-40">
          <div className="wrap rule flex justify-between pt-6">
            {prev && prev.slug !== next.slug ? (
              <Link href={`/projects/${prev.slug}`} className="t-label link-line text-ink-soft">← {prev.title}</Link>
            ) : <span />}
            <Link href="/projects" className="t-label link-line text-ink-soft">All projects</Link>
          </div>
          <Link href={`/projects/${next.slug}`} className="group on-dark relative mt-6 block overflow-hidden bg-ink text-ivory">
            <Img media={next.cover} sizes="100vw" alt="" className="hover-zoom !absolute inset-0 h-full w-full opacity-60" imgClassName="h-full" vt={`cover-${next.slug}`} />
            <div className="wrap relative flex min-h-[60svh] flex-col justify-end py-14">
              <p className="t-label mb-5 text-ivory/80">Next project</p>
              <p className="t-display">{next.title}</p>
            </div>
          </Link>
        </nav>
      )}
    </article>
  )
}

/** Editorial gallery: a repeating rhythm of full-bleed, offset pair, and captioned single. */
function Gallery({ images }: { images: Media[] }) {
  const blocks: Media[][] = []
  for (let i = 0; i < images.length; ) {
    const step = [1, 2, 1][blocks.length % 3]
    blocks.push(images.slice(i, i + step))
    i += step
  }
  return (
    <section aria-label="Project gallery" className="space-y-8 md:space-y-16">
      {blocks.map((b, i) => {
        const kind = i % 3
        if (kind === 0) return <Figure key={b[0].id} img={b[0]} sizes="100vw" frame="aspect-[4/5] sm:aspect-[16/9]" bleed />
        if (kind === 1)
          return (
            <div key={b[0].id} className="wrap grid gap-8 md:grid-cols-12">
              <div className={b[1] ? 'md:col-span-5' : 'md:col-span-8 md:col-start-3'}>
                <Figure img={b[0]} sizes="(min-width: 768px) 40vw, 100vw" frame="aspect-[4/5]" />
              </div>
              {b[1] && (
                <div className="md:col-span-6 md:col-start-7 md:mt-32">
                  <Figure img={b[1]} sizes="(min-width: 768px) 50vw, 100vw" frame="aspect-[4/3]" />
                </div>
              )}
            </div>
          )
        return (
          <div key={b[0].id} className="wrap grid gap-8 md:grid-cols-12">
            <div className="md:col-span-8 md:col-start-5">
              <Figure img={b[0]} sizes="(min-width: 768px) 66vw, 100vw" frame="aspect-[3/2]" />
            </div>
          </div>
        )
      })}
    </section>
  )
}

function Figure({ img, sizes, frame, bleed }: { img: Media; sizes: string; frame: string; bleed?: boolean }) {
  return (
    <figure>
      <div data-reveal="clip">
        <Img media={img} sizes={sizes} className={frame} imgClassName="h-full" />
      </div>
      {img.caption && <figcaption className={`mt-4 text-sm text-ink-soft ${bleed ? 'wrap' : ''}`}>{img.caption}</figcaption>}
    </figure>
  )
}
