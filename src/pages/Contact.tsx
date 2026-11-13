import { useState, type FormEvent } from 'react'
import { api, ApiError, instagramUrl, telUrl, usePageMeta, useSite } from '../lib/site'
import { d, Label, Lines } from '../components/ui'

const TYPES = ['Architecture', 'Interior design', 'The Finishing Touch', 'Something else']

export default function Contact() {
  const site = useSite()
  usePageMeta('Contact — The Cornerstone Architect', 'Start a conversation about your home. The Cornerstone Architect, Bengaluru, Karnataka.')
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'sent' | 'error'; message?: string; errors?: Record<string, string> }>({ status: 'idle' })
  const preset = new URLSearchParams(location.search).get('service') === 'finishing-touch' ? 'The Finishing Touch' : ''

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const body = Object.fromEntries(new FormData(e.currentTarget))
    setState({ status: 'sending' })
    try {
      await api('/api/enquiries', { method: 'POST', json: body })
      setState({ status: 'sent' })
    } catch (err) {
      const ae = err instanceof ApiError ? err : null
      setState({ status: 'error', message: ae?.message ?? 'We couldn’t send your message. Please check your connection, or email us directly.', errors: ae?.errors })
    }
  }

  if (!site.ready) return null
  const c = site.content.contact
  const err = state.errors ?? {}

  return (
    <section className="wrap grid gap-16 pb-28 pt-[calc(var(--header-h)+4rem)] md:grid-cols-12 md:gap-8 md:pb-40 md:pt-[calc(var(--header-h)+7rem)]">
      <div className="md:col-span-5">
        <Label className="mb-6 text-umber"><span data-reveal className="inline-block">Contact</span></Label>
        <Lines as="h1" text={'Begin a\nconversation'} className="t-h1" />
        <p className="mt-8 max-w-sm text-ink-soft" data-reveal style={d(2)}>
          Tell us a little about your home and what you have in mind. We’ll reply to arrange a first conversation.
        </p>
        <dl className="mt-14 grid gap-7" data-reveal style={d(3)}>
          <div className="rule pt-4">
            <dt className="t-label text-umber">Email</dt>
            <dd className="mt-2 text-lg"><a className="link-line" href={`mailto:${c.email}`}>{c.email}</a></dd>
          </div>
          <div className="rule pt-4">
            <dt className="t-label text-umber">Phone</dt>
            <dd className="mt-2 text-lg"><a className="link-line" href={telUrl(c.phone)}>{c.phone}</a></dd>
          </div>
          <div className="rule pt-4">
            <dt className="t-label text-umber">Instagram</dt>
            <dd className="mt-2 text-lg"><a className="link-line" href={instagramUrl(c.instagram)} target="_blank" rel="noopener noreferrer">@{c.instagram.replace(/^@/, '')}</a></dd>
          </div>
          <div className="rule pt-4">
            <dt className="t-label text-umber">Studio</dt>
            <dd className="mt-2 text-lg">{c.location}</dd>
          </div>
        </dl>
      </div>

      <div className="md:col-span-6 md:col-start-7 md:pt-4" data-reveal style={d(2)}>
        {state.status === 'sent' ? (
          <div role="status" className="bg-linen p-10 md:p-14">
            <p className="t-script text-6xl text-umber">Thank you</p>
            <p className="t-h3 mt-4">Your message has been received.</p>
            <p className="mt-4 text-ink-soft">We’ll be in touch soon. For anything urgent, call {c.phone}.</p>
            <button type="button" className="cta mt-10" onClick={() => setState({ status: 'idle' })}>
              <span className="cta-line" /> Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="grid gap-8" aria-describedby="form-status">
            <Field name="name" label="Your name" autoComplete="name" required error={err.name} />
            <div className="grid gap-8 sm:grid-cols-2">
              <Field name="email" label="Email" type="email" autoComplete="email" required error={err.email} />
              <Field name="phone" label="Phone (optional)" type="tel" autoComplete="tel" />
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="t-label text-ink-soft">Enquiry about</span>
                <select name="projectType" defaultValue={preset} className="field appearance-none bg-[length:10px] bg-[right_.25rem_center] bg-no-repeat">
                  <option value="">Choose one</option>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <Field name="location" label="Project location" autoComplete="address-level2" />
            </div>
            <Field name="message" label="About your project" textarea required error={err.message} />
            {/* Honeypot: hidden from people and assistive tech. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <button type="submit" className="btn bg-ink text-ivory hover:!bg-umber hover:!border-umber disabled:opacity-60" disabled={state.status === 'sending'}>
                {state.status === 'sending' ? 'Sending…' : 'Send enquiry'}
              </button>
              <p id="form-status" role="alert" className="text-sm text-cornerstone">
                {state.status === 'error' ? state.message : ''}
              </p>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

function Field({ name, label, error, textarea, ...rest }: { name: string; label: string; error?: string; textarea?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${name}`
  const common = { id, name, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-err` : undefined, required: rest.required, className: 'field' }
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="t-label text-ink-soft">{label}{rest.required && <span aria-hidden="true"> *</span>}</label>
      {textarea ? <textarea {...common} rows={6} /> : <input {...common} {...rest} />}
      {error && <p id={`${id}-err`} className="text-sm text-cornerstone">{error}</p>}
    </div>
  )
}
