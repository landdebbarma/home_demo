import { createContext, useContext, useEffect, type ReactNode } from 'react'
import data from 'virtual:site-data'

/** An image stored as responsive WebP files at `${path}-${width}.webp`. */
export type Media = { id: string; path: string; w: number; h: number; widths: number[]; alt: string; caption: string }
export type Project = {
  id: string; slug: string; title: string; category: string; location: string; year: string
  summary: string; body: string; status: 'draft' | 'published' | 'unpublished'; featured: boolean; order: number
  cover: Media | null; gallery: Media[]; meta: { label: string; value: string }[]; createdAt: number; updatedAt: number
}

type Item = { title: string; text: string }
export type Content = {
  contact: { email: string; phone: string; instagram: string; location: string }
  home: { heroEyebrow: string; heroTitle: string; heroImage: Media | null; introTitle: string; introText: string; introImage: Media | null; philosophy: Item[]; storyText: string; storyImage: Media | null; finishingImage: Media | null }
  about: { role: string; portrait: Media | null; intro: string; background: string; approach: string; values: Item[]; imageA: Media | null; imageB: Media | null }
  finishing: {
    heroImage: Media | null; heroText: string; whatWeDo: string; whatImage: Media | null
    transformations: { label: string; before: Media | null; after: Media | null }[]
    detailsImage: Media | null; experienceText: string; experienceImage: Media | null; moodImage: Media | null
    holisticText: string; holisticImage: Media | null; ctaImage: Media | null
  }
}

export class ApiError extends Error {
  status: number
  extra: Record<string, unknown>
  constructor(status: number, message: string, extra: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...rest,
    headers: json !== undefined ? { 'Content-Type': 'application/json', ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const { error, ...extra } = body
    throw new ApiError(res.status, error || `Request failed (${res.status})`, extra)
  }
  return body as T
}

// Content is baked in at build time (published projects only); a content commit triggers a new deploy.
type Site = { ready: true; content: Content; projects: Project[] }
const site: Site = { ready: true, ...(data as { content: Content; projects: Project[] }) }
const Ctx = createContext<Site>(site)

export function SiteProvider({ children, value = site }: { children: ReactNode; value?: Site }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useSite = () => useContext(Ctx)

/** How an image + width becomes a URL. The admin preview swaps this for not-yet-deployed images. */
export const defaultImageUrl = (m: Media, w: number) => `${m.path}-${w}.webp`
export const ImageUrlContext = createContext(defaultImageUrl)

/** Keeps document title/description in sync during client-side navigation. */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description])
}

export const instagramUrl = (handle: string) => `https://www.instagram.com/${handle.replace(/^@/, '')}/`
export const telUrl = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`
