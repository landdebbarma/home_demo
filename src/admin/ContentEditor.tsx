import { useEffect, useState } from 'react'
import { Link } from '../lib/router'
import { api, type Content, type Media } from '../lib/site'
import { errText, PageTitle, Thumb, useUi } from './Admin'
import { MediaPicker } from './MediaLibrary'

type Sub = { key: string; label: string; type: 'text' | 'textarea' | 'image' }
type Field = (Sub & { hint?: string }) | { key: string; label: string; type: 'list'; item: Sub[]; hint?: string }
type Section = { key: keyof Content; label: string; note?: string; fields: Field[] }

const PARA = 'Separate paragraphs with a blank line. Text in [square brackets] shows on the site as “to be supplied”.'

const SECTIONS: Section[] = [
  {
    key: 'contact', label: 'Contact details', note: 'Shown in the footer, Contact page and The Finishing Touch page.',
    fields: [
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'instagram', label: 'Instagram handle', type: 'text', hint: 'Without the @, e.g. thecornerstonearchitect' },
      { key: 'location', label: 'Location', type: 'text' },
    ],
  },
  {
    key: 'home', label: 'Homepage', note: 'Homepage projects are chosen with “Feature on the homepage” on each project.',
    fields: [
      { key: 'heroImage', label: 'Hero image', type: 'image' },
      { key: 'heroEyebrow', label: 'Hero small heading', type: 'text' },
      { key: 'heroTitle', label: 'Hero headline', type: 'text' },
      { key: 'introTitle', label: 'Studio introduction — heading', type: 'text' },
      { key: 'introText', label: 'Studio introduction — text', type: 'textarea', hint: PARA },
      { key: 'introImage', label: 'Studio introduction — image', type: 'image' },
      { key: 'philosophy', label: 'Design philosophy', type: 'list', item: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'text', label: 'Text', type: 'textarea' }] },
      { key: 'storyText', label: 'The Architect — text', type: 'textarea', hint: PARA },
      { key: 'storyImage', label: 'The Architect — image', type: 'image' },
      { key: 'finishingImage', label: 'The Finishing Touch feature — background image', type: 'image' },
    ],
  },
  {
    key: 'about', label: 'About page',
    fields: [
      { key: 'portrait', label: 'Portrait of Ar. Jeanne Joseph', type: 'image' },
      { key: 'role', label: 'Role line', type: 'text' },
      { key: 'intro', label: 'Personal introduction (“In her words”)', type: 'textarea', hint: PARA },
      { key: 'approach', label: 'The approach', type: 'textarea', hint: 'The first paragraph is shown large. ' + PARA },
      { key: 'imageA', label: 'Supporting image (large)', type: 'image' },
      { key: 'imageB', label: 'Supporting image (small)', type: 'image' },
      { key: 'background', label: 'Professional background', type: 'textarea', hint: PARA },
      { key: 'values', label: 'Values', type: 'list', item: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'text', label: 'Text', type: 'textarea' }] },
    ],
  },
  {
    key: 'finishing', label: 'The Finishing Touch',
    fields: [
      { key: 'heroImage', label: 'Hero image', type: 'image' },
      { key: 'heroText', label: 'Hero introduction', type: 'textarea' },
      { key: 'whatWeDo', label: 'What we do', type: 'textarea', hint: PARA },
      { key: 'whatImage', label: 'What we do — image', type: 'image' },
      { key: 'transformations', label: 'Before & after', type: 'list', hint: 'Each pair needs both a before and an after image.', item: [{ key: 'label', label: 'Room / label', type: 'text' }, { key: 'before', label: 'Before', type: 'image' }, { key: 'after', label: 'After', type: 'image' }] },
      { key: 'detailsImage', label: 'The details we curate — image', type: 'image' },
      { key: 'experienceText', label: 'Experience — text', type: 'textarea', hint: PARA },
      { key: 'experienceImage', label: 'Experience — image', type: 'image' },
      { key: 'moodImage', label: 'Mood board image', type: 'image' },
      { key: 'holisticText', label: 'Holistic styling — text', type: 'textarea', hint: PARA },
      { key: 'holisticImage', label: 'Holistic styling — image', type: 'image' },
      { key: 'ctaImage', label: 'Consultation — background image', type: 'image' },
    ],
  },
]

type Values = Record<string, unknown>

export default function ContentEditor() {
  const { toast } = useUi()
  const [tab, setTab] = useState<Section['key']>('contact')
  const [data, setData] = useState<{ content: Content; media: Record<string, Media> } | null>(null)
  const [draft, setDraft] = useState<Values | null>(null)
  const [saving, setSaving] = useState(false)
  const [picker, setPicker] = useState<((m: Media) => void) | null>(null)

  useEffect(() => {
    api<{ content: Content; media: Record<string, Media> }>('/api/admin/content')
      .then((d) => { setData(d); setDraft({ ...(d.content.contact as Values) }) })
      .catch((e) => toast(errText(e), 'error'))
  }, [toast])

  if (!data || !draft) return <p>Loading…</p>
  const section = SECTIONS.find((s) => s.key === tab)!
  const media = data.media
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.content[tab])

  const pick = (apply: (id: string) => void) => setPicker(() => (m: Media) => {
    data.media[m.id] = m
    apply(m.id)
    setPicker(null)
  })

  async function save() {
    setSaving(true)
    try {
      const r = await api<{ content: Content[keyof Content]; media: Record<string, Media> }>(`/api/admin/content/${tab}`, { method: 'PUT', json: draft })
      setData((d) => d && { content: { ...d.content, [tab]: r.content }, media: { ...d.media, ...r.media } })
      setDraft({ ...(r.content as Values) })
      toast(`${section.label} saved — the website is updated.`)
    } catch (e) {
      toast(errText(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pb-24">
      <PageTitle>Website Content</PageTitle>
      <div role="tablist" className="mb-6 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button key={s.key} role="tab" type="button" aria-selected={tab === s.key} onClick={() => {
            if (dirty && !window.confirm('Discard unsaved changes in this section?')) return
            setTab(s.key)
            setDraft({ ...(data.content[s.key] as Values) })
          }} className={`rounded px-4 py-2 ${tab === s.key ? 'bg-ink text-ivory' : 'border border-ink/15 bg-white hover:bg-linen'}`}>{s.label}</button>
        ))}
      </div>
      {section.note && <p className="mb-5 text-sm text-ink-soft">{section.note} {section.key === 'home' && <Link href="/admin/projects" className="underline">Manage projects</Link>}</p>}

      <div className="grid max-w-3xl gap-6 rounded border border-ink/10 bg-white p-5 md:p-6">
        {section.fields.map((f) => (
          <div key={f.key} className="grid gap-1.5">
            <span className="font-medium">{f.label}</span>
            {f.hint && <span className="text-sm text-ink-soft">{f.hint}</span>}
            {f.type === 'list' ? (
              <ListField value={(draft[f.key] as Values[]) ?? []} item={f.item} media={media} onPick={pick} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />
            ) : (
              <Input sub={f} value={draft[f.key] as string | null} media={media} onPick={pick} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />
            )}
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-ivory/95 backdrop-blur lg:left-[250px]">
        <div className="flex items-center justify-end gap-3 px-5 py-3 md:px-10">
          <span className="mr-auto text-sm text-ink-soft" aria-live="polite">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
          <button type="button" className="abtn" disabled={!dirty || saving} onClick={() => setDraft({ ...(data.content[tab] as Values) })}>Discard</button>
          <button type="button" className="abtn abtn-primary" disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : 'Save section'}</button>
        </div>
      </div>
      <MediaPicker open={!!picker} onPick={(m) => picker?.(m)} onClose={() => setPicker(null)} />
    </div>
  )
}

function Input({ sub, value, media, onChange, onPick }: { sub: Sub; value: string | null; media: Record<string, Media>; onChange: (v: string | null) => void; onPick: (apply: (id: string) => void) => void }) {
  if (sub.type === 'image') {
    const m = value ? media[value] : null
    return (
      <div className="flex items-center gap-4">
        <Thumb media={m} className="h-20 w-28 rounded-sm" />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="abtn" onClick={() => onPick((id) => onChange(id))}>{m ? 'Change image' : 'Choose image'}</button>
          {m && <button type="button" className="abtn" onClick={() => onChange(null)}>Remove</button>}
        </div>
      </div>
    )
  }
  if (sub.type === 'textarea') return <textarea aria-label={sub.label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={5} className="ainput leading-relaxed" />
  return <input aria-label={sub.label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="ainput" />
}

function ListField({ value, item, media, onChange, onPick }: { value: Values[]; item: Sub[]; media: Record<string, Media>; onChange: (v: Values[]) => void; onPick: (apply: (id: string) => void) => void }) {
  const blank = () => Object.fromEntries(item.map((s) => [s.key, s.type === 'image' ? null : '']))
  return (
    <div className="grid gap-3">
      {value.map((row, i) => (
        <fieldset key={i} className="grid gap-3 rounded border border-ink/10 p-4">
          <legend className="px-1 text-sm text-ink-soft">Item {i + 1}</legend>
          {item.map((s) => (
            <label key={s.key} className="grid gap-1 text-sm">
              {s.label}
              <Input sub={s} value={row[s.key] as string | null} media={media} onPick={onPick} onChange={(v) => onChange(value.map((r, j) => (j === i ? { ...r, [s.key]: v } : r)))} />
            </label>
          ))}
          <div className="flex gap-2">
            <button type="button" className="abtn px-3" disabled={i === 0} onClick={() => { const n = [...value]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n) }} aria-label="Move up">↑</button>
            <button type="button" className="abtn px-3" disabled={i === value.length - 1} onClick={() => { const n = [...value]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; onChange(n) }} aria-label="Move down">↓</button>
            <button type="button" className="abtn abtn-danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove item</button>
          </div>
        </fieldset>
      ))}
      <div><button type="button" className="abtn" onClick={() => onChange([...value, blank()])}>+ Add item</button></div>
    </div>
  )
}
