# Dark / Light Mode Toggle — Design

**Date:** 2026-04-19
**Status:** Approved, pending implementation
**Scope:** Demo-only quick toggle. Not a full library theming system.

## Goal

Add a one-click way to flip the QNN Designer demo between light and dark appearance. Ship a minimal dark token set in the library so any consumer can opt in by setting `html[data-theme="dark"]`, but introduce no new public theming API.

A full `ThemeProvider`, exported tokens, and migrations remain reserved for the planned `library-theming-core` set.

## Non-Goals

- No `ThemeProvider` React component.
- No tokens exposed in the public library API beyond the existing `--qnn-*` CSS custom properties.
- No dark-mode audit of the `Renderer` output beyond what it inherits from CSS variables.
- No schema migrations or persistence of theme per questionnaire.
- No three-state (light / dark / system) picker — two-state toggle only.
- No automated tests beyond existing build / typecheck / lint passing.

## User-Facing Behavior

1. First visit: app loads in **light** mode.
2. User clicks the sun / moon icon button in the topbar (between Redo and Import).
3. Entire UI — including AntD widgets, canvas, panes, and the demo shell body — flips to dark.
4. Choice persists across reloads via `localStorage`.
5. Tooltip on the button: "Switch to dark mode" / "Switch to light mode".
6. Button has an `aria-label` and `data-testid="topbar-theme"` for e2e consistency.

## Architecture

### State

A tiny hook in the library, used both by the TopBar button and by the demo's `main.tsx`:

```ts
// packages/designer/src/designer/hooks/useThemeMode.ts
export type ThemeMode = 'light' | 'dark';
export function useThemeMode(): [ThemeMode, (m: ThemeMode) => void];
```

Implementation notes:

- Reads `localStorage['qnn.theme.mode.v1']` on mount (key conforms to the project's `qnn.<scope>.<...>.v<n>` convention).
- Defaults to `'light'` if unset or invalid.
- `setMode(m)` writes to `localStorage`, sets `document.documentElement.dataset.theme = m`, and notifies subscribers.
- Subscriber model: a module-level `Set<Dispatch<SetStateAction<ThemeMode>>>`; every hook instance subscribes on mount, unsubscribes on unmount. This keeps the TopBar button and the demo's AntD-algorithm selector in sync without pulling in a store.
- On first mount, it also applies `document.documentElement.dataset.theme` once so the attribute reflects state even when no component has called `setMode` yet.

### Library TopBar Button

Added to `packages/designer/src/designer/TopBar.tsx` between the Redo button and the ImportButton:

```tsx
<Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
  <Button
    data-testid="topbar-theme"
    icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
    aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
  />
</Tooltip>
```

Icons: `SunOutlined` and `MoonOutlined` from `@ant-design/icons` (confirmed present in v5.6.1).

### Dark Token Block

Added to `packages/designer/src/designer/styles.css`:

```css
[data-theme='dark'] {
  color-scheme: dark;

  /* Surfaces */
  --qnn-bg: #0f1419;
  --qnn-surface: #1a1f2e;
  --qnn-surface-muted: #242b3d;
  --qnn-canvas-bg: #151a24;

  /* Hairlines */
  --qnn-hairline: #2a3142;
  --qnn-border: #3a4256;
  --qnn-border-strong: #4d5670;

  /* Text */
  --qnn-ink: #e6e9ef;
  --qnn-ink-soft: #b4bac8;
  --qnn-ink-muted: #8b92a3;

  /* Accent — same #1677FF family works in both */
  --qnn-accent: #1677ff;
  --qnn-accent-hover: #4096ff;
  --qnn-accent-weak: rgba(22, 119, 255, 0.16);
  --qnn-accent-border: rgba(22, 119, 255, 0.5);

  /* Shadows — deeper to read on near-black surfaces */
  --qnn-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.4);
  --qnn-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.3);
  --qnn-shadow-md: 0 1px 2px rgba(0, 0, 0, 0.35), 0 6px 20px rgba(0, 0, 0, 0.4);
  --qnn-shadow-lg: 0 2px 4px rgba(0, 0, 0, 0.35), 0 14px 40px rgba(0, 0, 0, 0.55);
}
```

Every surface, border, ink, and canvas in the existing styles already references these tokens, so no other selectors need edits.

### Demo AntD Algorithm Swap

`apps/demo/src/main.tsx` changes from a static `ConfigProvider` to a small wrapper that subscribes to `useThemeMode()`:

```tsx
function ThemedRoot({ children }: { children: ReactNode }) {
  const [mode] = useThemeMode();
  return (
    <ConfigProvider
      theme={{
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { /* unchanged */ },
        components: { /* unchanged */ },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
```

### Demo body styles

`apps/demo/src/styles.css` currently hardcodes `body { background: #f7f8fa; color: #1a202c }` and `:root { color-scheme: light }`. These are replaced with CSS-variable references so dark mode doesn't show a white flash behind the shell:

```css
:root {
  --qnn-breakpoint-sm: 640px;
}
body {
  background: var(--qnn-bg);
  color: var(--qnn-ink);
}
```

The `color-scheme` declaration lives in the `[data-theme='dark']` block (dark) and implicitly `normal` otherwise; the browser default is fine for light.

### Public export

`packages/designer/src/index.ts` re-exports `useThemeMode` and the `ThemeMode` type so the demo can import it via `@qnn/designer` (per the repo rule that the demo never reaches into relative library paths).

## Data Flow

```
[Button click in TopBar]
        |
        v
useThemeMode.setMode('dark')
        |
        +-- localStorage.setItem('qnn.theme.mode.v1', 'dark')
        +-- document.documentElement.dataset.theme = 'dark'
        +-- notify all useThemeMode() subscribers
                          |
                          +--> TopBar re-renders with moon -> sun icon
                          +--> ThemedRoot re-renders, AntD algorithm swaps
                                      |
                                      v
                          All AntD components re-theme in-place.
                          [data-theme='dark'] CSS block activates,
                          flipping every --qnn-* token.
```

## Error Handling

- `localStorage` unavailable (private mode, disabled storage): the hook catches `getItem` / `setItem` errors, logs a single `console.warn`, and falls back to in-memory state. The toggle still works for the session.
- Unknown value in `localStorage`: treated as `'light'`.
- SSR safety: not a concern — the demo is Vite CSR-only, but the hook checks `typeof window !== 'undefined'` before touching `document` / `localStorage` so the library stays SSR-safe for future consumers.

## Files Changed

| File | Change | Est. LOC |
|---|---|---|
| `packages/designer/src/designer/hooks/useThemeMode.ts` | New hook | ~35 |
| `packages/designer/src/designer/TopBar.tsx` | Add theme button, import icons + hook | ~8 |
| `packages/designer/src/designer/styles.css` | Dark token block | ~30 |
| `packages/designer/src/index.ts` | Re-export `useThemeMode`, `ThemeMode` | ~2 |
| `apps/demo/src/main.tsx` | Wrap `ConfigProvider` in `ThemedRoot` | ~15 |
| `apps/demo/src/styles.css` | Replace hardcoded colors with CSS vars | ~4 |

## Verification Plan

Before claiming done:

1. `pnpm build` succeeds.
2. `pnpm typecheck` clean.
3. `pnpm lint` clean.
4. Manual: load demo, click toggle — canvas, palette, inspector, topbar, AntD menus, modals, tooltips all flip. Reload — mode persists. Clear `localStorage` — mode returns to light.
5. Manual: confirm no white flash on reload in dark mode (body background should be dark before React hydrates — acceptable to flash *once* at module load; not a blocker for this scope).

## Open Questions

None.
