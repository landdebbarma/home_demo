import { useState, type CSSProperties } from 'react'

type Chip = { name: string; hex: string }
type Palette = { name: string; note: string; chips: [Chip, Chip, Chip, Chip]; wall: string; floor: string; sofa: string }

// chips: [accent (cushions, art), secondary (rug, throw), wood, dark (frames, legs, lamp)]
const PALETTES: Palette[] = [
  {
    name: 'Refined Earth', note: 'Earthy greens, warm taupes and rich neutrals — the palette from our mood board.',
    chips: [{ name: 'Sage', hex: '#8C9A72' }, { name: 'Taupe', hex: '#A88B74' }, { name: 'Walnut', hex: '#5A4232' }, { name: 'Charcoal', hex: '#3B3B3A' }],
    wall: '#EEE8DE', floor: '#C4A27F', sofa: '#E8DFD0',
  },
  {
    name: 'Coastal Linen', note: 'Washed blues and soft linen for light, airy rooms.',
    chips: [{ name: 'Sea glass', hex: '#8FA9AC' }, { name: 'Mist', hex: '#C3CFCC' }, { name: 'Driftwood', hex: '#A08C74' }, { name: 'Slate', hex: '#4D5A5E' }],
    wall: '#F2F0EB', floor: '#D2BFA3', sofa: '#ECE6DA',
  },
  {
    name: 'Terracotta Sun', note: 'Baked clay and warm sand for sunlit spaces.',
    chips: [{ name: 'Terracotta', hex: '#C46A48' }, { name: 'Sand', hex: '#DDB892' }, { name: 'Teak', hex: '#8A5A3B' }, { name: 'Cocoa', hex: '#3E2E27' }],
    wall: '#F2E7DA', floor: '#B98B62', sofa: '#E9DCC9',
  },
  {
    name: 'Olive Grove', note: 'Deep olive and stone — grounded, calm and quietly rich.',
    chips: [{ name: 'Olive', hex: '#6F7451' }, { name: 'Moss', hex: '#A3A07A' }, { name: 'Oak', hex: '#9C7A54' }, { name: 'Forest', hex: '#2F3428' }],
    wall: '#ECE8DC', floor: '#BFA27C', sofa: '#DCD4C1',
  },
  {
    name: 'Blush Clay', note: 'Muted blush and rose clay for a soft, intimate warmth.',
    chips: [{ name: 'Blush', hex: '#D8B4A4' }, { name: 'Rose clay', hex: '#B27F6E' }, { name: 'Ash wood', hex: '#B79C82' }, { name: 'Mauve', hex: '#5E4644' }],
    wall: '#F5EDE6', floor: '#CDB397', sofa: '#EFE5DC',
  },
]

/** Switchable palettes previewed on an illustrated room. Colours crossfade via CSS fill transitions. */
export default function PaletteStudio() {
  const [active, setActive] = useState(0)
  const p = PALETTES[active]
  const [accent, second, wood, dark] = p.chips.map((c) => c.hex)
  const vars = { '--wall': p.wall, '--floor': p.floor, '--sofa': p.sofa, '--accent': accent, '--second': second, '--wood': wood, '--dark': dark } as CSSProperties

  return (
    <div className="mt-20 grid gap-10 md:mt-28 lg:grid-cols-12 lg:gap-8" data-reveal>
      <div className="lg:col-span-4">
        <p className="t-label text-umber">Try a palette</p>
        <p className="mt-4 max-w-sm text-[.95rem] leading-7 text-ink-soft">Choose a palette to see how the same room changes character.</p>
        <ul className="mt-6 grid grid-cols-2 gap-2 lg:mt-8 lg:grid-cols-1" role="list">
          {PALETTES.map((x, i) => (
            <li key={x.name}>
              <button
                type="button"
                aria-pressed={i === active}
                onClick={() => setActive(i)}
                className={`flex h-full w-full flex-col items-start gap-2 border px-3 py-3 text-left transition-colors duration-200 lg:flex-row lg:items-center lg:gap-4 lg:px-4 ${
                  i === active ? 'border-ink bg-ivory' : 'border-ink/10 hover:border-ink/40'
                }`}
              >
                <span className="flex shrink-0" aria-hidden="true">
                  {x.chips.map((c) => <span key={c.hex} className="h-7 w-5" style={{ background: c.hex }} />)}
                </span>
                <span className="t-label text-ink">{x.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <figure className="lg:col-span-8">
        <svg viewBox="0 0 800 520" role="img" aria-labelledby="palette-caption" className="palette-room block h-auto w-full" style={vars}>
          {/* wall + arched niche */}
          <rect width="800" height="400" style={{ fill: 'var(--wall)' }} />
          <path d="M250 400V190a150 150 0 0 1 300 0v210z" style={{ fill: 'color-mix(in srgb, var(--wall) 86%, var(--second))' }} />
          {/* art */}
          <rect x="345" y="150" width="110" height="130" style={{ fill: 'var(--dark)' }} />
          <rect x="352" y="157" width="96" height="116" style={{ fill: 'color-mix(in srgb, var(--wall) 70%, #fff)' }} />
          <circle cx="388" cy="205" r="26" style={{ fill: 'var(--accent)' }} />
          <path d="M360 262c24-30 50-38 82-24v29h-82z" style={{ fill: 'var(--second)' }} />
          {/* floor + skirting + rug */}
          <rect y="400" width="800" height="120" style={{ fill: 'var(--floor)' }} />
          <rect y="396" width="800" height="6" style={{ fill: 'color-mix(in srgb, var(--wall) 80%, var(--dark))' }} />
          <ellipse cx="400" cy="468" rx="320" ry="36" style={{ fill: 'color-mix(in srgb, var(--second) 55%, var(--wall))' }} />
          {/* floor lamp */}
          <ellipse cx="140" cy="466" rx="26" ry="6" style={{ fill: 'var(--dark)' }} />
          <rect x="138" y="215" width="4" height="252" style={{ fill: 'var(--dark)' }} />
          <path d="M108 222h64l-12-52h-40z" style={{ fill: 'color-mix(in srgb, var(--wall) 55%, #fff)' }} />
          <ellipse cx="140" cy="226" rx="70" ry="22" style={{ fill: '#fff', opacity: 0.18 }} />
          {/* sofa */}
          <rect x="236" y="298" width="328" height="86" rx="24" style={{ fill: 'var(--sofa)' }} />
          <rect x="222" y="356" width="356" height="62" rx="18" style={{ fill: 'color-mix(in srgb, var(--sofa) 90%, var(--dark))' }} />
          <rect x="208" y="328" width="48" height="92" rx="20" style={{ fill: 'var(--sofa)' }} />
          <rect x="544" y="328" width="48" height="92" rx="20" style={{ fill: 'var(--sofa)' }} />
          <rect x="226" y="418" width="10" height="16" style={{ fill: 'var(--dark)' }} />
          <rect x="564" y="418" width="10" height="16" style={{ fill: 'var(--dark)' }} />
          {/* cushions + throw */}
          <rect x="262" y="316" width="78" height="58" rx="14" transform="rotate(-6 301 345)" style={{ fill: 'var(--accent)' }} />
          <rect x="346" y="318" width="70" height="54" rx="14" transform="rotate(4 381 345)" style={{ fill: 'color-mix(in srgb, var(--accent) 45%, var(--sofa))' }} />
          <rect x="462" y="316" width="78" height="58" rx="14" transform="rotate(6 501 345)" style={{ fill: 'var(--accent)' }} />
          <path d="M544 330h44v62c-14 10-30 10-44 0z" style={{ fill: 'var(--second)' }} />
          {/* coffee table + vase */}
          <ellipse cx="400" cy="444" rx="98" ry="15" style={{ fill: 'var(--wood)' }} />
          <rect x="384" y="447" width="32" height="26" style={{ fill: 'color-mix(in srgb, var(--wood) 75%, var(--dark))' }} />
          <path d="M386 431c-4-18 6-26 14-26s18 8 14 26z" style={{ fill: 'color-mix(in srgb, var(--wall) 60%, #fff)' }} />
          <path d="M400 406c-4-22-16-34-30-42M400 406c6-20 18-30 32-34M400 406v-40" className="stroke-[3]" style={{ stroke: 'var(--dark)', fill: 'none' }} />
          {/* plant */}
          <path d="M640 470l-10-58h76l-10 58z" style={{ fill: 'var(--wood)' }} />
          {[[-38, 640, 360], [-12, 660, 330], [16, 684, 336], [42, 700, 368], [-60, 630, 392], [62, 712, 396]].map(([r, x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="16" ry="44" transform={`rotate(${r} ${x} ${y})`} style={{ fill: i % 2 ? '#7F9160' : '#6A7C4E' }} />
          ))}
        </svg>
        <figcaption id="palette-caption" aria-live="polite" className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <span>
            <span className="t-h3 block">{p.name}</span>
            <span className="mt-2 block text-[.95rem] leading-7 text-ink-soft">{p.note}</span>
          </span>
          <span className="flex gap-4">
            {p.chips.map((c) => (
              <span key={c.hex} className="grid justify-items-start gap-1.5">
                <span className="h-10 w-10" style={{ background: c.hex }} aria-hidden="true" />
                <span className="text-xs text-ink-soft">{c.name}</span>
              </span>
            ))}
          </span>
        </figcaption>
      </figure>
    </div>
  )
}
