import type { CSSProperties, ReactNode } from 'react'
import { mediaUrl, type Media } from '../lib/site'

type ImgProps = {
  media: Media | null | undefined
  sizes: string
  alt?: string
  priority?: boolean
  className?: string
  imgClassName?: string
  style?: CSSProperties
  vt?: string
}

/** Responsive AVIF/WebP picture with intrinsic dimensions (no layout shift). */
export function Img({ media, sizes, alt, priority, className = '', imgClassName = '', style, vt }: ImgProps) {
  const s = { ...style, viewTransitionName: vt } as CSSProperties
  if (!media) {
    return (
      <div className={`frame grid place-items-center ${className}`} style={s} role="img" aria-label="Image to be supplied">
        <img src="/brand/mark-dark.png" alt="" width={147} height={160} className="!h-auto !w-12 opacity-25" />
      </div>
    )
  }
  const set = (fmt: 'avif' | 'webp') => media.widths.map((w) => `${mediaUrl(media, w, fmt)} ${w}w`).join(', ')
  const fallback = media.widths.find((w) => w >= 960) ?? media.widths.at(-1)!
  return (
    <picture className={`frame ${className}`} style={s}>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <img
        src={mediaUrl(media, fallback)}
        srcSet={set('webp')}
        sizes={sizes}
        width={media.w}
        height={media.h}
        alt={alt ?? media.alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        className={imgClassName}
      />
    </picture>
  )
}

/** Splits text on blank lines. A paragraph wrapped in [brackets] is a visible "to be supplied" placeholder. */
export function Paras({ text, className = 'prose-body' }: { text: string; className?: string }) {
  const parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return (
    <div className={className}>
      {parts.map((p, i) =>
        /^\[[\s\S]*\]$/.test(p) ? (
          <p key={i} className="placeholder">{p.slice(1, -1)}</p>
        ) : (
          <p key={i}>{p}</p>
        ),
      )}
    </div>
  )
}

/** Inline text, rendering a [bracketed] value as a placeholder. */
export function T({ text }: { text: string }) {
  return /^\[[\s\S]*\]$/.test(text.trim()) ? <span className="placeholder inline-block">{text.trim().slice(1, -1)}</span> : <>{text}</>
}

/** Heading whose lines rise out of a mask. Split lines with "\n". */
export function Lines({ text, as: As = 'h2', className = '', delay = 0, id }: { text: string; as?: 'h1' | 'h2' | 'h3' | 'p'; className?: string; delay?: number; id?: string }) {
  return (
    <As id={id} className={`lines ${className}`} data-reveal="lines" style={{ '--d': delay } as CSSProperties} aria-label={text.replace(/\n/g, ' ')}>
      {text.split('\n').map((line, i) => (
        <span key={i} aria-hidden="true">
          <span style={{ '--i': i } as CSSProperties}>{line}</span>
        </span>
      ))}
    </As>
  )
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`t-label ${className}`}>{children}</p>
}

export const d = (n: number) => ({ '--d': n }) as CSSProperties

/** One shared IntersectionObserver for every [data-reveal] element, including ones added later. */
export function setupReveals() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
  )
  const scan = () => document.querySelectorAll('[data-reveal]:not([data-watch])').forEach((el) => {
    el.setAttribute('data-watch', '')
    io.observe(el)
  })
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true })
  scan()
}
