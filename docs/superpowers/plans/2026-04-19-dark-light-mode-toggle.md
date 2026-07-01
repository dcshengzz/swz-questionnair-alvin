# Dark / Light Mode Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sun/moon button to the library TopBar that flips the demo between light and dark mode, persisting the choice in localStorage.

**Architecture:** A small `useThemeMode` hook in the library tracks a `'light' | 'dark'` value in `localStorage['qnn.theme.mode.v1']`, mirrors it onto `document.documentElement.dataset.theme`, and notifies subscribers via a module-level subscriber set. The library's `styles.css` gains a `[data-theme='dark']` block that remaps every `--qnn-*` token to its dark equivalent. The demo wraps its `ConfigProvider` in a small subscriber that switches AntD's algorithm (`defaultAlgorithm` ↔ `darkAlgorithm`) from the same hook.

**Tech Stack:** React 18 + TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Ant Design 5.24 + `@ant-design/icons` 5.6, Vite, pnpm monorepo. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-19-dark-light-mode-toggle-design.md`

**Testing approach:** Per the spec's non-goals, no new automated unit / e2e tests. Verification between tasks relies on `pnpm typecheck`, `pnpm lint`, `pnpm build`, and a final manual smoke test in the preview server. Commit after each logical unit.

---

## Task 1: Add dark CSS token block to library styles

**Files:**
- Modify: `packages/designer/src/designer/styles.css` (append after the existing `:root { ... }` block around line 42)

- [ ] **Step 1: Append the dark-mode token block**

Open `packages/designer/src/designer/styles.css`. After the closing `}` of the existing `:root { ... }` block (the one that defines `--qnn-bg`, etc.), and before the `/* ========= Top bar ... */` comment block, insert:

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

  /* Accent — #1677FF family works in both modes; weak/border opacity bumped for dark */
  --qnn-accent: #1677ff;
  --qnn-accent-hover: #4096ff;
  --qnn-accent-weak: rgba(22, 119, 255, 0.16);
  --qnn-accent-border: rgba(22, 119, 255, 0.5);

  /* Shadows — deeper alpha reads on near-black surfaces */
  --qnn-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.4);
  --qnn-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.3);
  --qnn-shadow-md: 0 1px 2px rgba(0, 0, 0, 0.35), 0 6px 20px rgba(0, 0, 0, 0.4);
  --qnn-shadow-lg: 0 2px 4px rgba(0, 0, 0, 0.35), 0 14px 40px rgba(0, 0, 0, 0.55);
}
```

No other rules in the file should change — every surface, border, ink, and shadow already references these tokens.

- [ ] **Step 2: Verify build still succeeds**

Run: `pnpm --filter @qnn/designer build`
Expected: builds, `dist/style.css` size increases slightly.

- [ ] **Step 3: Commit**

```bash
git add packages/designer/src/designer/styles.css
git -c user.email=alandroid63@gmail.com -c user.name=fiatminimalist commit -m "$(cat <<'EOF'
feat(designer): dark-mode tokens under [data-theme='dark']

Mirrors every --qnn-* surface/border/ink/shadow token for a dark
palette. No rules reference the tokens differently — existing
selectors automatically re-theme when the attribute flips.
EOF
)"
```

---

## Task 2: Create the `useThemeMode` hook

**Files:**
- Create: `packages/designer/src/designer/hooks/useThemeMode.ts`

- [ ] **Step 1: Create the hook file**

Write `packages/designer/src/designer/hooks/useThemeMode.ts` with exactly this content:

```ts
import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'qnn.theme.mode.v1';

type Subscriber = (mode: ThemeMode) => void;
const subscribers = new Set<Subscriber>();

let currentMode: ThemeMode = 'light';
let initialized = false;

function readInitial(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyToDom(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset['theme'] = mode;
}

function ensureInitialized(): void {
  if (initialized) return;
  initialized = true;
  currentMode = readInitial();
  applyToDom(currentMode);
}

function setModeGlobal(next: ThemeMode): void {
  ensureInitialized();
  if (next === currentMode) return;
  currentMode = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode, disabled); fall back to in-memory.
      console.warn('[qnn] localStorage unavailable; theme will not persist.');
    }
  }
  applyToDom(next);
  subscribers.forEach((fn) => fn(next));
}

export function useThemeMode(): [ThemeMode, (m: ThemeMode) => void] {
  ensureInitialized();
  const [mode, setLocal] = useState<ThemeMode>(currentMode);

  useEffect(() => {
    const sub: Subscriber = (m) => setLocal(m);
    subscribers.add(sub);
    // Resync in case currentMode changed between render and effect.
    if (currentMode !== mode) setLocal(currentMode);
    return () => {
      subscribers.delete(sub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [mode, setModeGlobal];
}
```

Notes for the implementer:
- `document.documentElement.dataset['theme']` uses bracket notation because `noUncheckedIndexedAccess` flags `dataset.theme` as possibly undefined on read; write access is fine either way, but bracket form reads consistently.
- `ensureInitialized()` is called both in module code paths (via `setModeGlobal`) and at the top of the hook so the `[data-theme]` attribute is set before the first paint even if no component calls `setMode` first.
- The `eslint-disable-next-line` is necessary because `mode` is intentionally read once on mount to resync, not tracked as a dep.

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: no errors.

- [ ] **Step 3: Verify lint passes**

Run: `pnpm lint`
Expected: no warnings, no errors (the disable comment should be scoped tightly enough).

- [ ] **Step 4: Commit**

```bash
git add packages/designer/src/designer/hooks/useThemeMode.ts
git -c user.email=alandroid63@gmail.com -c user.name=fiatminimalist commit -m "$(cat <<'EOF'
feat(designer): useThemeMode hook for light/dark toggle

Module-level subscriber model keeps library and demo subscribers
in sync without a store. Reads qnn.theme.mode.v1 from localStorage
on first use, mirrors the value to html[data-theme], and degrades
gracefully to in-memory state when storage is unavailable.
EOF
)"
```

---

## Task 3: Re-export the hook from the library public API

**Files:**
- Modify: `packages/designer/src/index.ts`

- [ ] **Step 1: Add the export**

Open `packages/designer/src/index.ts`. After the existing `export { QuestionnaireDesigner } ...` / `export type { QuestionnaireDesignerProps } ...` pair at the top, add two lines so the top of the file reads:

```ts
export { QuestionnaireDesigner } from './designer/Designer';
export type { QuestionnaireDesignerProps } from './designer/Designer';
export { useThemeMode } from './designer/hooks/useThemeMode';
export type { ThemeMode } from './designer/hooks/useThemeMode';
```

(Leave the rest of the file untouched.)

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: no errors.

- [ ] **Step 3: Verify the library builds and emits types**

Run: `pnpm --filter @qnn/designer build`
Expected: builds. The `[vite:dts]` line should still appear; no need to inspect the `.d.ts` but it must not error.

- [ ] **Step 4: Commit**

```bash
git add packages/designer/src/index.ts
git -c user.email=alandroid63@gmail.com -c user.name=fiatminimalist commit -m "$(cat <<'EOF'
feat(designer): export useThemeMode and ThemeMode

Public surface for consumers (including the demo) to subscribe to
and set the current theme mode without reaching into internal paths.
EOF
)"
```

---

## Task 4: Add the theme toggle button to the TopBar

**Files:**
- Modify: `packages/designer/src/designer/TopBar.tsx`

- [ ] **Step 1: Update the imports at the top of the file**

Replace the existing imports block (lines 1-8) with:

```tsx
import { useState } from 'react';
import { Button, Input, Space, Tooltip } from 'antd';
import {
  ExportOutlined,
  EyeOutlined,
  MoonOutlined,
  RedoOutlined,
  SunOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import type { ControlRegistry } from '../registry/ControlRegistry';
import { useDesignerStore } from './hooks/useDesignerStore';
import { useThemeMode } from './hooks/useThemeMode';
import { ExportDialog } from './dialogs/ExportDialog';
import { ImportButton } from './dialogs/ImportButton';
import { PreviewModal } from './dialogs/PreviewModal';
```

- [ ] **Step 2: Read the theme hook inside the component**

Inside the `TopBar` component body, just after `const store = useDesignerStore();` add:

```tsx
const [themeMode, setThemeMode] = useThemeMode();
```

- [ ] **Step 3: Insert the toggle button between the Redo tooltip and `<ImportButton />`**

Locate the `<Space size={6}> ... </Space>` block. Between the Redo `<Tooltip>...</Tooltip>` closing and `<ImportButton />`, insert:

```tsx
<Tooltip title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
  <Button
    data-testid="topbar-theme"
    aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    icon={themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
    onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
  />
</Tooltip>
```

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: no errors.

- [ ] **Step 5: Verify lint passes**

Run: `pnpm lint`
Expected: no warnings, no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/designer/TopBar.tsx
git -c user.email=alandroid63@gmail.com -c user.name=fiatminimalist commit -m "$(cat <<'EOF'
feat(designer): sun/moon theme toggle in TopBar

Icon-only button between Redo and Import, matching the existing
topbar pattern. aria-label and data-testid=topbar-theme keep it
consistent with the rest of the toolbar for future e2e coverage.
EOF
)"
```

---

## Task 5: Wire the demo to swap AntD's algorithm on theme change

**Files:**
- Modify: `apps/demo/src/main.tsx`

- [ ] **Step 1: Replace the file contents**

Overwrite `apps/demo/src/main.tsx` with:

```tsx
import React from 'react';
import type { ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { useThemeMode } from '@qnn/designer';
import App from './App';
import 'antd/dist/reset.css';
import './styles.css';
import '@qnn/designer/style.css';

const fontStack =
  "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

function ThemedRoot({ children }: { children: ReactNode }) {
  const [mode] = useThemeMode();
  return (
    <ConfigProvider
      theme={{
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677FF',
          colorInfo: '#1677FF',
          colorBgLayout: mode === 'dark' ? '#0f1419' : '#f7f8fa',
          colorBorderSecondary: mode === 'dark' ? '#2a3142' : '#eceef3',
          borderRadius: 8,
          borderRadiusLG: 10,
          borderRadiusSM: 6,
          controlHeight: 34,
          fontFamily: fontStack,
          fontSize: 14,
          wireframe: false,
        },
        components: {
          Button: { controlHeight: 34, paddingInline: 14, fontWeight: 500 },
          Input: { controlHeight: 34 },
          Select: { controlHeight: 34 },
          Modal: { borderRadiusLG: 12 },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemedRoot>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemedRoot>
  </React.StrictMode>,
);
```

Two small changes worth noting for the implementer:
- `colorBgLayout` and `colorBorderSecondary` are overridden per-mode so AntD's dark algorithm uses surfaces that match our dark `--qnn-*` palette (otherwise AntD picks its own near-blacks that clash with the canvas).
- The conditional-spread pattern (`...(value !== undefined ? { value } : {})`) isn't needed here because every token is always defined.

- [ ] **Step 2: Verify demo typechecks**

Run: `pnpm --filter @qnn/demo typecheck`
Expected: no errors.

- [ ] **Step 3: Verify lint passes**

Run: `pnpm lint`
Expected: no warnings, no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/demo/src/main.tsx
git -c user.email=alandroid63@gmail.com -c user.name=fiatminimalist commit -m "$(cat <<'EOF'
feat(demo): switch AntD algorithm on theme mode change

ThemedRoot subscribes to useThemeMode and swaps between
defaultAlgorithm and darkAlgorithm, with two token overrides
(colorBgLayout, colorBorderSecondary) so AntD surfaces match
the dark --qnn-* palette.
EOF
)"
```

---

## Task 6: Replace hardcoded demo body colors with CSS variables

**Files:**
- Modify: `apps/demo/src/styles.css`

- [ ] **Step 1: Rewrite the file**

Overwrite `apps/demo/src/styles.css` with:

```css
:root {
  --qnn-breakpoint-sm: 640px;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
}

body {
  font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    sans-serif;
  font-feature-settings: 'cv11', 'ss01', 'ss03';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  background: var(--qnn-bg);
  color: var(--qnn-ink);
}

code,
kbd,
samp,
pre {
  font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

Removed: the hardcoded `background: #f7f8fa` / `color: #1a202c` on `body`, and the `color-scheme: light` on `:root` — `color-scheme` is now driven by the library's dark block.

- [ ] **Step 2: Build the full workspace to confirm nothing regressed**

Run: `pnpm build`
Expected: both `@qnn/designer` and `@qnn/demo` build cleanly.

- [ ] **Step 3: Commit**

```bash
git add apps/demo/src/styles.css
git -c user.email=alandroid63@gmail.com -c user.name=fiatminimalist commit -m "$(cat <<'EOF'
feat(demo): route body background/color through --qnn-* tokens

Removes the light-only hardcodes that would leak a white
backdrop in dark mode. color-scheme now lives in the library's
[data-theme='dark'] block, not :root.
EOF
)"
```

---

## Task 7: Final verification

**Files:** none modified.

- [ ] **Step 1: Run the full gauntlet**

Run these in order; every one must pass:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Expected: no errors or warnings on any of the three.

- [ ] **Step 2: Start the preview server**

Run: `pnpm --filter @qnn/demo preview`
Expected: server listens on `0.0.0.0:4173` (or next free port). Note the URL it prints.

- [ ] **Step 3: Manual smoke test**

Open the printed URL. Verify, in order:

1. App loads in **light** mode. Topbar shows a moon icon next to Redo.
2. Click the moon. Entire UI — topbar, palette, canvas, inspector, body — turns dark. Icon becomes a sun.
3. Drop a control from the palette onto the canvas. Drag handles, hover states, and selection outlines all read clearly in dark mode.
4. Open Export modal; it and its buttons render correctly in dark.
5. Open Preview modal; the runtime pane renders legibly in dark.
6. Hard-reload the page. Mode persists (still dark, sun icon).
7. Click the sun. Everything flips back to light. Hard-reload: still light.
8. Open DevTools → Application → Local Storage. Confirm `qnn.theme.mode.v1` reflects the current mode (`'light'` or `'dark'`).
9. Clear that key, reload — mode resets to light.

If any of these fail, stop and triage before claiming done. Things most likely to regress: AntD Modal / Tooltip rendering in a portal outside the `ConfigProvider` subtree — if a modal looks wrong in dark mode it's probably because React 18 StrictMode double-mounted something; double-check `ThemedRoot` wraps `BrowserRouter`.

- [ ] **Step 4: Stop the preview server**

Kill the preview process (Ctrl+C in its terminal, or `TaskStop` on the background task). No commit for this task — it's verification only.

---

## Out of scope (explicit)

- No `ThemeProvider` React component, no public token map in the library API.
- No dark-mode audit of `Renderer` output beyond CSS variable inheritance.
- No schema migrations or per-questionnaire theme persistence.
- No three-state (light / dark / system) picker.
- No new Vitest or Playwright tests.

These belong to the planned `library-theming-core` set.
