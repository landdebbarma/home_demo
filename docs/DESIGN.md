# The Cornerstone Architect — Design Direction

Internal working document. Establishes the direction before build; the code is the source of truth after that.

## 1. Research method & limitations

- Browser automation was **not available** in this session (Chrome extension not connected), so transitions and scroll behaviour could not be watched live.
- Instead, every highlighted reference and the main secondary ones were downloaded (HTML + primary stylesheets) and inspected for real font stacks, colour variables, easing curves and animation libraries. Observations below marked *(code)* come from that inspection; anything about *feel* of motion is inferred from code, not observed.
- Studio a+d was marked "unable to access" by the client; not inspected.

## 2. Reference analysis (highest priority six)

| Reference | What the client liked | What the code shows |
|---|---|---|
| Cathie Hong | minimal look, layout, colours, transitions | Squarespace; heading face Orpheus Pro (classical serif). Palette vars *(code)*: base `hsl(47 32% 88%)` warm cream, ink `hsl(40 35% 24%)` olive-brown, accent `hsl(24 32% 45%)` clay. Clip-path polygon reveals and expo-out curves `cubic-bezier(.19,1,.22,1)` |
| Kathleen Lin | personal About intro, colour, fonts, transitions, big background image | Showit; Garamond Premier (regular + italic) with Futura. Navy-ink `rgb(49 58 70)`, copper `rgb(212 158 119)`, dusty rose `rgb(187 156 148)` |
| ArShe | warm-neutral palette, neat, smooth transitions | **Cormorant Garamond + Manrope**. cream `oklch(97% .011 89)`, sand `oklch(90% .024 80)`, ink `oklch(24% .008 60)`, clay accent. Easing `cubic-bezier(.22,1,.36,1)` |
| S'thetic | title font | **Cormorant Garamond + DM Sans**; swup page transitions + AOS scroll reveals |
| Studio McGee | palette, font style | Cormorant Garamond, Jost, Lora. `#2c2c2c` ink, `#f2ede7` / `#f9f7f4` warm whites, `#563929` brown. Background video on home |
| Beige | palette, cursive, brand presentation | display "Americana" + script "Amania" + Work Sans; taupe `oklch(72% .022 60)`. Client would pick a *different* script |

Secondary: Azimetri (liked palette/big images/fonts) — `#faf6ef` paper, `#1e1a16` ink, `#8e7960`/`#52412f` browns, 900ms opacity fades on `cubic-bezier(.16,1,.3,1)`. Olson Kundig — background video. McGhee Studios — architect "story". Nesva — magazine-style writing. Zufolo — Cormorant Garamond + Barlow. Maura O'Malley — layout and About.

## 3. Recurring patterns

1. **One classical light serif for display** (Cormorant Garamond appears in 4 of 6 favourites) paired with **one clean geometric/grotesk sans**.
2. **Warm paper backgrounds**, never pure white; brown-black ink, never pure black.
3. Large single images doing the work; text sits beside or over them with lots of air.
4. Slow, expo-out easing; opacity + small translate; clip-path image reveals.
5. Personal, first-person About.

Avoid (client negatives): monotonous repeated layouts (Arushi), too many fonts (Nyne), cold gallery-white minimalism (Pawson, Snøhetta, BIG), template feel (Wix/Colorlib lists).

## 4. Direction

**Warm editorial minimalism.** A printed-monograph feel: paper tones, generous margins, a single classical serif at large sizes, and photography given full width.

### Typography (3 families, strictly limited roles)
- **Cormorant Garamond** 300/400 + italic — all headings and editorial pull-quotes.
- **Jost** 300/400/500 — body, navigation, labels. Geometric like the logo's wordmark and Kathleen Lin's Futura.
- **Allison** (script) — *only* for the "by Jeanne" signature and at most one editorial accent per page. Echoes the brochure's hand-script.

Scale (fluid, clamp): display 3.2→9rem, h1 2.6→5.5rem, h2 2→3.6rem, h3 1.4→2rem, lead 1.15→1.5rem, body 1rem/1.7, label 0.72rem caps tracked 0.22em.

### Colour
| Token | Hex | Use |
|---|---|---|
| ivory | `#F5F1EA` | page background |
| linen | `#ECE5D9` | alternate sections |
| sand | `#DCCFBC` | rules, image placeholders |
| taupe | `#A39383` | muted labels on dark |
| umber | `#6B5646` | brochure title brown — display accents |
| ink-soft | `#5E544B` | secondary text (6.4:1 on ivory) |
| ink | `#2A2420` | text, dark sections |
| cornerstone | `#961A1F` | logo red — tiny accents only (dots, active markers) |

### Layout
12-column grid, 1440px max content, outer gutter clamp(20px, 5vw, 80px). Sections alternate composition: full-bleed image → offset text/image → horizontal numbered list → dark band → split. No card UI; thin 1px rules instead.

### Motion tokens
| Token | Value |
|---|---|
| `--dur-fast` | 200ms (hover, underline) |
| `--dur-base` | 550ms (UI, menu) |
| `--dur-reveal` | 1000ms (image clip reveal) |
| `--dur-section` | 1200ms (hero, page enter) |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` (ArShe) |
| `--ease-expo` | `cubic-bezier(.16,1,.3,1)` (Azimetri/Cathie) |
| `--ease-inout` | `cubic-bezier(.65,0,.35,1)` |

- **Page transitions:** native View Transitions API — outgoing page fades/lifts, incoming rises in; project cover image morphs from grid into the detail hero (shared element). Falls back to instant swap.
- **First load:** short logo curtain (~1.3s, once per session).
- **Scroll:** IntersectionObserver reveals — clip-path inset for images, fade-up for text, staggered lines. No scroll hijacking, no parallax beyond a slow hero scale.
- `prefers-reduced-motion`: all of the above disabled.

## 5. Content gaps (placeholders, editable in admin)
- **No project photography supplied.** Sample projects are seeded using brochure imagery and are explicitly titled "Sample Project"; replace via the admin.
- No portrait of Ar. Jeanne Joseph; no verified professional background → shown as labelled placeholders.
- No video footage → hero is a still image (video can be added later).
- Brochure imagery is used on The Finishing Touch page as supplied.
