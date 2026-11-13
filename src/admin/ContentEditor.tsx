import { useRef, useState } from 'react'
import { Link } from '../lib/router'
import { ApiError, type Content, type Media } from '../lib/site'
import { errText, PageTitle, Thumb, useUi } from './Admin'
import { ACCEPT, merge3, useAdmin } from './store'

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
type Draft = Record<keyof Content, Values>
type Value = string | Media | null

export default function ContentEditor() {
  const { toast } = useUi()
  const { data, save, load } = useAdmin()
  const [tab, setTab] = useState<Section['key']>('contact')
  // The whole site document is edited together and saved as one commit.
  const [draft, setDraft] = useState<Draft>(() => structuredClone(data!.site) as unknown as Draft)
  const [started, setStarted] = useState<Draft>(() => structuredClone(data!.site) as unknown as Draft) // version the draft is based on
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState<string | null>(null)

  const section = SECTIONS.find((s) => s.key === tab)!
  const changed = SECTIONS.filter((s) => JSON.stringify(draft[s.key]) !== JSON.stringify(data!.site[s.key])).map((s) => s.label)
  const dirty = changed.length > 0
  const setField = (k: string, v: unknown) => setDraft((d) => ({ ...d, [tab]: { ...d[tab], [k]: v } }))

  async function onSave() {
    setSaving(true)
    setConflict(null)
    try {
      const saved = await save({ site: draft as unknown as Content, message: `Update website content (${changed.join(', ')})` })
      setDraft(structuredClone(saved.site) as unknown as Draft)
      setStarted(structuredClone(saved.site) as unknown as Draft)
      toast('Saved to GitHub — publishing to the website (see status in the sidebar).')
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setConflict(e.message)
      else toast(errText(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  const values = draft[tab]
  return (
    <div className="pb-24">
      <PageTitle>Website Content</PageTitle>
      {conflict && (
        <div role="alert" className="mb-6 rounded border border-[#7A2A2A]/40 bg-[#F7E9E9] p-4 text-sm">
          {conflict}
          <button type="button" className="abtn ml-3" onClick={async () => {
            const fresh = await load()
            if (!fresh) return
            setConflict(null)
            // Field-by-field: keep what was changed here, take the latest for everything else.
            const latest = fresh.site as unknown as Draft
            const both: string[] = []
            const merged = Object.fromEntries(SECTIONS.map((sec) => {
              const r = merge3(draft[sec.key], started[sec.key], latest[sec.key])
              both.push(...r.both.map((k) => `${sec.label} → ${sec.fields.find((f) => f.key === k)?.label ?? k}`))
              return [sec.key, r.merged]
            })) as Draft
            setDraft(merged)
            setStarted(structuredClone(latest))
            toast(both.length
              ? `Loaded the latest version. Changed both here and elsewhere: ${both.join('; ')} — your version is kept; review before saving.`
              : 'Loaded the latest version and kept your changes. Review and save again.')
          }}>Load latest version</button>
        </div>
      )}
      <div role="tablist" className="mb-6 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button key={s.key} role="tab" type="button" aria-selected={tab === s.key} onClick={() => setTab(s.key)}
            className={`rounded px-4 py-2 ${tab === s.key ? 'bg-ink text-ivory' : 'border border-ink/15 bg-white hover:bg-linen'}`}>
            {s.label}{changed.includes(s.label) && <span className="ml-1.5" aria-label="(unsaved changes)">•</span>}
          </button>
        ))}
      </div>
      {section.note && <p className="mb-5 text-sm text-ink-soft">{section.note} {section.key === 'home' && <Link href="/admin/projects" className="underline">Manage projects</Link>}</p>}

      <div className="grid max-w-3xl gap-6 rounded border border-ink/10 bg-white p-5 md:p-6">
        {section.fields.map((f) => (
          <div key={f.key} className="grid gap-1.5">
            <span className="font-medium">{f.label}</span>
            {f.hint && <span className="text-sm text-ink-soft">{f.hint}</span>}
            {f.type === 'list' ? (
              <ListField value={(values[f.key] as Values[]) ?? []} item={f.item} onChange={(v) => setField(f.key, v)} />
            ) : (
              <Input sub={f} value={values[f.key] as Value} onChange={(v) => setField(f.key, v)} />
            )}
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-ivory/95 backdrop-blur lg:left-[250px]">
        <div className="flex items-center justify-end gap-3 px-5 py-3 md:px-10">
          <span className="mr-auto text-sm text-ink-soft" aria-live="polite">{saving ? 'Saving to GitHub…' : dirty ? `Unsaved changes: ${changed.join(', ')}` : 'No unsaved changes.'}</span>
          <button type="button" className="abtn" disabled={!dirty || saving} onClick={() => setDraft(structuredClone(data!.site) as unknown as Draft)}>Discard</button>
          <button type="button" className="abtn abtn-primary" disabled={!dirty || saving} onClick={onSave}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

function Input({ sub, value, onChange }: { sub: Sub; value: Value; onChange: (v: Value) => void }) {
  if (sub.type === 'image') return <ImageField value={value as Media | null} label={sub.label} onChange={onChange} />
  if (sub.type === 'textarea') return <textarea aria-label={sub.label} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} rows={5} className="ainput leading-relaxed" />
  return <input aria-label={sub.label} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className="ainput" />
}

/** Upload or replace a page image; files nothing uses any more are deleted from the repository on save. */
function ImageField({ value, label, onChange }: { value: Media | null; label: string; onChange: (m: Media | null) => void }) {
  const { upload } = useAdmin()
  const { toast } = useUi()
  const input = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  async function pick(file: File | undefined) {
    if (!file) return
    try {
      const img = await upload(file, 'site', (pct) => setStatus(pct < 100 ? `Uploading… ${pct}%` : 'Optimising…'))
      onChange({ ...img, alt: value?.alt || '' })
    } catch (e) {
      toast(errText(e), 'error')
    } finally {
      setStatus(null)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-4">
        <Thumb media={value} className="h-20 w-28 rounded-sm" />
        <div className="flex flex-wrap gap-2">
          {status ? <span role="status" className="text-sm text-ink-soft">{status}</span> : (
            <button type="button" className="abtn" onClick={() => input.current?.click()} aria-label={`${value ? 'Replace' : 'Upload'} ${label}`}>{value ? 'Replace image' : 'Upload image'}</button>
          )}
          {value && !status && <button type="button" className="abtn" onClick={() => onChange(null)}>Remove</button>}
        </div>
        <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {value && <input aria-label={`Alt text for ${label}`} value={value.alt} onChange={(e) => onChange({ ...value, alt: e.target.value })} placeholder="Alt text — describe the image" className="ainput text-sm" />}
    </div>
  )
}

function ListField({ value, item, onChange }: { value: Values[]; item: Sub[]; onChange: (v: Values[]) => void }) {
  const blank = () => Object.fromEntries(item.map((s) => [s.key, s.type === 'image' ? null : '']))
  return (
    <div className="grid gap-3">
      {value.map((row, i) => (
        <fieldset key={i} className="grid gap-3 rounded border border-ink/10 p-4">
          <legend className="px-1 text-sm text-ink-soft">Item {i + 1}</legend>
          {item.map((s) => (
            <div key={s.key} className="grid gap-1 text-sm">
              <span>{s.label}</span>
              <Input sub={s} value={row[s.key] as Value} onChange={(v) => onChange(value.map((r, j) => (j === i ? { ...r, [s.key]: v } : r)))} />
            </div>
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
