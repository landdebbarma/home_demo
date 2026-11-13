import { useState } from 'react'
import { Link } from '../lib/router'
import { usePageMeta, useSite } from '../lib/site'
import { d, Img, Label, Lines } from '../components/ui'

export default function Projects() {
  const site = useSite()
  const [filter, setFilter] = useState('All')
  usePageMeta('Projects — The Cornerstone Architect', 'Selected architecture and interior design projects by The Cornerstone Architect, Bengaluru.')
  if (!site.ready) return null
  const categories = ['All', ...new Set(site.projects.map((p) => p.category).filter(Boolean))]
  const list = filter === 'All' ? site.projects : site.projects.filter((p) => p.category === filter)

  return (
    <div className="pt-[calc(var(--header-h)+4rem)] md:pt-[calc(var(--header-h)+7rem)]">
      <header className="wrap grid gap-10 pb-16 md:grid-cols-12 md:pb-24">
        <div className="md:col-span-7">
          <Label className="mb-6 text-umber"><span data-reveal className="inline-block">Portfolio</span></Label>
          <Lines as="h1" text="Projects" className="t-display" />
        </div>
        <p className="t-lead self-end text-ink-soft md:col-span-4 md:col-start-9" data-reveal style={d(2)}>
          Homes and interiors, each shaped around the people who live in them.
        </p>
      </header>

      {categories.length > 2 && (
        <div className="wrap" data-reveal>
          <div role="group" aria-label="Filter projects by category" className="rule flex flex-wrap gap-x-8 gap-y-3 pt-6">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={filter === c}
                onClick={() => setFilter(c)}
                className={`t-label py-1 transition-colors duration-200 ${filter === c ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}
              >
                <span className={filter === c ? 'border-b border-ink pb-1' : ''}>{c}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className="wrap grid gap-x-8 gap-y-20 py-16 md:grid-cols-2 md:gap-y-28 md:py-24">
        {list.map((p, i) => (
          <li key={p.id} className={i % 2 === 1 ? 'md:mt-40' : ''}>
            <Link href={`/projects/${p.slug}`} className="group block">
              <div data-reveal="clip" className="hover-zoom">
                <Img media={p.cover} sizes="(min-width: 768px) 46vw, 100vw" className={i % 3 === 0 ? 'aspect-[4/5]' : 'aspect-[5/4]'} imgClassName="h-full" vt={`cover-${p.slug}`} />
              </div>
              <div className="mt-6 grid gap-2" data-reveal style={d(1)}>
                <p className="t-label text-ink-soft">{[p.category, p.location, p.year].filter(Boolean).join(' · ')}</p>
                <h2 className="t-h2 transition-colors duration-200 group-hover:text-umber">{p.title}</h2>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {!list.length && <p className="wrap pb-32 text-ink-soft">No projects to show yet.</p>}
    </div>
  )
}
