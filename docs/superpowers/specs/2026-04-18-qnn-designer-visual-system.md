# QNN Designer — Visual System Spec

**Date:** 2026-04-18
**Status:** Shipped in v0.1.0 (commit `2d626d6`).

---

## 1. Aesthetic direction

**Refined professional designer tool.** The reference points are Linear,
Figma, Notion, Raycast: dense but breathable, hairline borders, layered
surfaces, crisp typography, and one accent colour used sparingly for
interactive and selected states.

Deliberate non-goals:
- No gradients as decoration (one subtle gradient on the brand mark and
  one hairline shimmer on the canvas — everything else is solid).
- No drop shadows on every element — shadows are reserved for the top
  bar (floating-header signal) and the canvas (document-card signal).
- No dark mode in v1. `color-scheme: light` is set explicitly so the
  browser chrome matches.

## 2. Design tokens

All values live as CSS variables in
`packages/designer/src/designer/styles.css`. Consumers may override at
any scope.

```
--qnn-bg                 #f7f8fa    page background
--qnn-surface            #ffffff    side panels, top bar, cells, palette items
--qnn-surface-muted      #f3f5f8    subtle hover / palette icon chip bg
--qnn-canvas-bg          #eef1f6    main (centre) pane background
--qnn-hairline           #eceef3    1-px divider lines
--qnn-border             #dfe3eb    cell hover border
--qnn-border-strong      #c9cfdb    reserved (e.g. future tooltip borders)
--qnn-ink                #1a202c    primary text
--qnn-ink-soft           #4a5568    secondary text
--qnn-ink-muted          #6b7280    tertiary / caption text
--qnn-accent             #1677ff    AntD blue — sole accent
--qnn-accent-hover       #4096ff    press / lift states
--qnn-accent-weak        rgba(22,119,255, 0.08)    soft fills
--qnn-accent-border      rgba(22,119,255, 0.35)    hairline over accent
--qnn-shadow-xs          1-step elevation (topbar)
--qnn-shadow-sm          2-step (cell on selected)
--qnn-shadow-md          3-step (canvas card)
--qnn-shadow-lg          4-step (reserved — modals)
--qnn-ease               cubic-bezier(0.2, 0, 0, 1)     global easing
```

Do not introduce new palette values without adding them here first.

## 3. Typography

- **Body / UI**: `IBM Plex Sans` (Google Fonts — weights 400 / 500 / 600 / 700).
  Fallback stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
  sans-serif`.
- **Mono / code**: `IBM Plex Mono` (Google Fonts — 400 / 500).
- **Font features**: `cv11`, `ss01`, `ss03` enabled in `body` to get the
  more editorial character set.
- **Smoothing**: `-webkit-font-smoothing: antialiased` + `text-rendering:
  optimizeLegibility`.

Loaded via `<link rel="stylesheet">` in `apps/demo/index.html` with a
`preconnect` on `fonts.googleapis.com` and `fonts.gstatic.com` for
first-paint speed.

## 4. AntD theme tokens

Wrapped at the demo root in `ConfigProvider`:

```ts
token: {
  colorPrimary: '#1677FF',
  colorInfo: '#1677FF',
  colorBgLayout: '#f7f8fa',
  colorBorderSecondary: '#eceef3',
  borderRadius: 8,
  borderRadiusLG: 10,
  borderRadiusSM: 6,
  controlHeight: 34,
  fontFamily: IBM_PLEX_STACK,
  fontSize: 14,
  wireframe: false,
},
components: {
  Button: { controlHeight: 34, paddingInline: 14, fontWeight: 500 },
  Input: { controlHeight: 34 },
  Select: { controlHeight: 34 },
  Modal: { borderRadiusLG: 12 },
},
```

This, together with `antd/dist/reset.css` imported at the root, produces
consistent form density. Keep `borderRadius: 8` — it's what links the
AntD surface to our custom chrome (palette cards, cells, canvas).

## 5. Component patterns

### Top bar (`.qnn-topbar`)

- Fixed 56 px height. Flex row: brand · title input · spacer · action cluster.
- Bottom hairline + `shadow-xs` for a "floating header" cue.
- **Brand** = a 28×28 rounded square (`.qnn-brand-mark`) with a
  dark-to-light blue gradient and a small white "Q"-like glyph, paired
  with a two-line wordmark ("QNN Designer" / "Questionnaire builder").
- **Title input** blends with the bar (transparent border) until hover or
  focus, then surfaces AntD focus styling.

### Page tabs (`.qnn-pagetabs`)

- Underline-style active indicator (2 px `--qnn-accent`), not a pill.
- Tab is a `<div role="tab">` with `aria-selected`. Using `<button>` would
  collide with the "Page" action button in `getByRole('button', …)` test
  queries; role=tab is the semantically correct primitive anyway.
- Delete "×" appears only on hover for pages beyond the first.

### Palette (`.qnn-palette-*`)

- Section headings are small uppercase labels with a trailing hairline
  rule.
- Items are mini-cards with an icon chip (`--qnn-surface-muted` bg, accent
  icon colour), label, and a hover-lift of 1 px + `3 px` accent glow.

### Canvas (`.qnn-canvas`)

- Max width 960 px, centred in `--qnn-canvas-bg` pane.
- White card with `shadow-md`, `border-radius: 12px`, hairline border.
- Pseudo-element `::before` draws a subtle blue hairline along the top
  edge for depth without a full shadow.

### Cells (`.qnn-cell`)

- Hover: `--qnn-border` (slightly stronger than hairline).
- Selected: `--qnn-accent` border + `3 px` accent-weak glow + `shadow-sm`.
  No CSS `outline` — it doesn't respect border-radius.
- Drag-hover: `--qnn-accent-border` hairline.

### Row drop zones (`.qnn-row-gap`)

- 8 px tall idle, 32 px tall + accent-weak fill + dashed accent outline
  when active. Smooth 150 ms transition.

### Scrollbars

- Custom thin (10 px), transparent track, thumb that only appears on pane
  hover. Webkit-only; Firefox falls back to its native thin scrollbars.

## 6. Motion

- **Easing**: `cubic-bezier(0.2, 0, 0, 1)` (`--qnn-ease`) everywhere.
- **Durations**: 120 ms for hover/border changes, 150 ms for size changes
  (row gap, selected state). Anything longer starts to feel laggy in a
  dense editor.
- **No entrance animations** — the editor appears instantly. Animations
  are reserved for state transitions the user initiates.

## 7. Accessibility posture (v1)

- `color-scheme: light` declared on `:root`.
- AntD provides focus rings on all interactive controls. Custom elements
  (palette items, page tabs) inherit or declare their own.
- `aria-label` on the title input placeholder, brand wordmark, page tab
  close "×", and duplicated Export buttons (topbar vs modal) to keep
  accessible-name queries unambiguous.
- `role="tab"` + `aria-selected` on page tabs.
- **Gaps** (to be fixed in v0.2): Tab order inside the 3-pane layout is
  not curated; there's no global `Esc` handler; there's no visible focus
  ring distinct from AntD's default on the custom palette cards.

## 8. Files touched by the visual system

- `apps/demo/index.html` — Google Fonts link + preconnect.
- `apps/demo/src/main.tsx` — `antd/dist/reset.css` import + ConfigProvider
  tokens.
- `apps/demo/src/styles.css` — body font stack + smoothing + font-features.
- `packages/designer/src/designer/styles.css` — all tokens + every
  custom class.
- `packages/designer/src/designer/TopBar.tsx` — brand wordmark markup.
- `packages/designer/src/designer/panes/PageTabs.tsx` — underline tabs.
- `packages/designer/src/designer/panes/PalettePane.tsx` — icon chips +
  grouped headings.
- `packages/designer/src/designer/panes/PropertiesPane.tsx` — section
  titles.

## 9. Principles for future changes

1. **New design values go in `:root` first**, then consume via `var()`.
2. **Blue is scarce.** If you find yourself reaching for
   `--qnn-accent` a third time in the same component, the first two
   are probably wrong.
3. **Elevation is rare.** One shadow per region: topbar, canvas, any
   overlay. Never stacked.
4. **Hairlines over borders.** `--qnn-hairline` is the default divider.
   `--qnn-border` is for hover / hints.
5. **AntD tokens first.** If you're about to override AntD styling,
   first check whether adjusting the `ConfigProvider` token would do it
   globally.
