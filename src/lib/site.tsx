import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Media = { id: string; w: number; h: number; widths: number[]; alt: string; name?: string; createdAt?: number; inUse?: boolean }
export type ProjectSummary = {
  id: number; slug: string; title: string; category: string; location: string; year: string
  summary: string; status: 'draft' | 'published' | 'unpublished'; featured: boolean; sort: number
  cover: Media | null; updatedAt: number
}
export type ProjectImage = { id: number; caption: string; alt: string; media: Media }
export type Project = ProjectSummary & { body: string; meta: { label: string; value: string }[]; images: ProjectImage[] }
export type Neighbour = { slug: string; title: string; cover: Media | null } | null

type Item = { title: string; text: string }
export type Content = {
  contact: { email: string; phone: string; instagram: string; location: string }
  home: { heroEyebrow: string; heroTitle: string; heroImage: string | null; introTitle: string; introText: string; introImage: string | null; philosophy: Item[]; storyText: string; storyImage: string | null; finishingImage: string | null }
  about: { role: string; portrait: string | null; intro: string; background: string; approach: string; values: Item[]; imageA: string | null; imageB: string | null }
  finishing: {
    heroImage: string | null; heroText: string; whatWeDo: string; whatImage: string | null
    transformations: { label: string; before: string | null; after: string | null }[]
    detailsImage: string | null; experienceText: string; experienceImage: string | null; moodImage: string | null
    holisticText: string; holisticImage: string | null; ctaImage: string | null
  }
}

export class ApiError extends Error {
  status: number
  errors?: Record<string, string>
  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message)
    this.status = status
    this.errors = errors
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
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`, data.errors)
  return data as T
}

type Site = { content: Content; media: Record<string, Media>; projects: ProjectSummary[] }
const Ctx = createContext<(Site & { ready: true }) | { ready: false; error?: string }>({ ready: false })

export function SiteProvider({ children }: { children: ReactNode }) {
  const inlined = (window as { __SITE__?: Site }).__SITE__
  const [state, setState] = useState<(Site & { ready: true }) | { ready: false; error?: string }>(inlined ? { ...inlined, ready: true } : { ready: false })
  useEffect(() => {
    if (inlined) return
    api<Site>('/api/site')
      .then((s) => setState({ ...s, ready: true }))
      .catch((e) => setState({ ready: false, error: e.message }))
  }, [inlined])
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}

export const useSite = () => useContext(Ctx)

/** Keeps document title/description in sync during client-side navigation. */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description])
}

export const mediaUrl = (m: Media, w: number, fmt: 'webp' | 'avif' = 'webp') => `/uploads/${m.id}/${w}.${fmt}`
export const instagramUrl = (handle: string) => `https://www.instagram.com/${handle.replace(/^@/, '')}/`
export const telUrl = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`
