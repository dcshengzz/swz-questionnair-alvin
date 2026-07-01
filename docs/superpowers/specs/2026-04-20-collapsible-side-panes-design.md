# Collapsible palette and inspector panes — design

**Date:** 2026-04-20
**Scope:** `packages/designer` (library) + minimal demo/test wiring in `apps/demo`.

## Goal

Let the user collapse the left (Palette) and right (Inspector/Properties) panes of `QuestionnaireDesigner` to a thin **icon rail** so the canvas can use more width, and restore the pane by clicking any rail affordance. Per-pane state persists to `localStorage`.

## Non-goals

- Drag-to-resize pane widths.
- Custom pane layouts or docking.
- Controlled/prop-based collapse API for library consumers (deferred — the shell owns the state).
- Undo/redo integration (collapse is view state, not document state).
- Keyboard shortcuts for collapse.

## Architecture

Collapse state lives in `DesignerShell` (`packages/designer/src/designer/Designer.tsx`). No changes to the Zustand designer store.

Introduce a small hook:

```ts
// packages/designer/src/designer/hooks/usePaneCollapsed.ts
export function usePaneCollapsed(storageKey: string, initial?: boolean): [boolean, (next: boolean) => void];
```

- Reads initial value lazily from `localStorage.getItem(storageKey)` (value: `"1"` / `"0"`), falling back to `initial ?? false`.
- SSR-safe: guards `typeof window`.
- Writes back on every change; swallows `localStorage` errors (private mode / disabled) with a `console.warn`, matching `useThemeMode`.
- Simpler than `useThemeMode`: no cross-instance singleton/subscriber pattern, since pane collapse is per-`DesignerShell` view state and there's no DOM-level side effect to keep in sync.
- Storage keys (versioned to match existing `qnn.theme.mode.v1` convention): `qnn.pane.palette.collapsed.v1`, `qnn.pane.inspector.collapsed.v1`.

`DesignerShell` calls the hook twice, then passes `collapsed` + `setCollapsed` into the corresponding pane slot.

## Layout

The shell already uses a CSS grid (`styles.css` `.qnn-shell`). Collapse switches `grid-template-columns` via data-attributes on the shell wrapper.

| State                         | `grid-template-columns` |
| ----------------------------- | ----------------------- |
| Default                       | `288px 1fr 344px`       |
| Left collapsed                | `44px 1fr 344px`        |
| Right collapsed               | `288px 1fr 44px`        |
| Both collapsed                | `44px 1fr 44px`         |

Implementation: put `data-left-collapsed` and/or `data-right-collapsed` on `.qnn-shell`; CSS selectors override the default grid columns.

Below the existing `max-width: 960px` responsive breakpoint the shell already stacks to `1fr` and strips side borders. At that width the collapse controls and rails are **hidden** (the stack takes over); the attributes remain but have no visual effect. No new mobile behavior.

## Components

### `PaletteRail`

Rendered inside `<aside class="qnn-left">` when `paletteCollapsed === true`. The rail replaces the palette content entirely.

Vertical stack:

1. Expand chevron (top). Clicking sets `paletteCollapsed = false`.
2. Category icons — one per non-empty category in the registry: **content**, **input**, **advanced**. Icon is reused from a representative plugin in that category, or a fixed icon per category if we want stable glyphs (decision: fixed per category — see "Rail icon choices" below).

Clicking a category icon:

- Sets `paletteCollapsed = false`.
- Scrolls the matching `.qnn-palette-group[data-category="{cat}"]` into view via `scrollIntoView({ behavior: 'smooth', block: 'start' })`, on the next frame (after layout settles).

To support scroll-into-view, `PalettePane` adds `data-category={cat}` to each `.qnn-palette-group`.

### `InspectorRail`

Rendered inside `<aside class="qnn-right">` when `inspectorCollapsed === true`. The rail replaces the inspector content entirely.

Vertical stack:

1. Expand chevron (top). Clicking sets `inspectorCollapsed = false`.
2. Status glyph:
   - **Filled dot** when `selection.controlId` is set (something to inspect).
   - **Hollow dot** when nothing is selected.
   - Clicking either expands.

### Collapse chevrons on expanded panes

Each expanded pane gets a small chevron button in its existing title row. The current title element is:

```
<h3 className="qnn-pane-title">Palette</h3>
<h3 className="qnn-pane-title">Inspector</h3> or <h3 className="qnn-pane-title">Properties</h3>
```

Refactor each pane's header into a flex row (`.qnn-pane-title-row`) with the `h3` on the left and a `.qnn-pane-collapse-btn` on the right. The button fires the corresponding `setCollapsed(true)`.

Collapse chevrons live inside the pane components, not in `DesignerShell`. The shell passes `onCollapse` down.

### Rail icon choices

Fixed per category (stable glyphs, don't churn when registry changes):

- **content** — `FileTextOutlined`
- **input** — `EditOutlined`
- **advanced** — `AppstoreOutlined`

(Using `@ant-design/icons` — already a transitive dep via AntD.)

Inspector rail uses a simple `<span>` styled as a dot via CSS (no icon font needed).

## Data flow

```
DesignerShell
  ├─ [paletteCollapsed, setPaletteCollapsed] = usePaneCollapsed('qnn:pane:palette-collapsed')
  ├─ [inspectorCollapsed, setInspectorCollapsed] = usePaneCollapsed('qnn:pane:inspector-collapsed')
  ├─ <aside class="qnn-left">
  │    ├─ paletteCollapsed ? <PaletteRail registry onExpand={() => setPaletteCollapsed(false)} />
  │    │                   : <PalettePane registry onCollapse={() => setPaletteCollapsed(true)} />
  ├─ <main><CanvasPane /></main>
  └─ <aside class="qnn-right">
       ├─ inspectorCollapsed ? <InspectorRail hasSelection={...} onExpand={() => setInspectorCollapsed(false)} />
       │                     : <PropertiesPane registry onCollapse={() => setInspectorCollapsed(true)} />
```

`hasSelection` is read from the store via `useDesignerStore` inside `InspectorRail` (same pattern as `PropertiesPane`), not passed as a prop — keeps the shell from re-rendering on every selection change.

`.qnn-shell` gets its attributes from the shell:

```tsx
<div
  className="qnn-shell"
  data-left-collapsed={paletteCollapsed ? '' : undefined}
  data-right-collapsed={inspectorCollapsed ? '' : undefined}
>
```

## CSS additions (`packages/designer/src/designer/styles.css`)

New rules (all tokens already defined in `:root` / `[data-theme='dark']`):

```css
/* Collapsed grid columns */
.qnn-shell[data-left-collapsed] { grid-template-columns: 44px 1fr 344px; }
.qnn-shell[data-right-collapsed] { grid-template-columns: 288px 1fr 44px; }
.qnn-shell[data-left-collapsed][data-right-collapsed] { grid-template-columns: 44px 1fr 44px; }

/* Rail container */
.qnn-pane-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 0;
}
/* Replaces the default pane padding when collapsed — override via data-attr */
.qnn-shell[data-left-collapsed]  > aside.qnn-left  { padding: 0; }
.qnn-shell[data-right-collapsed] > aside.qnn-right { padding: 0; }

/* Rail button (chevron + category icons + status dot container) */
.qnn-pane-rail-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--qnn-ink-muted);
  cursor: pointer;
  transition:
    background 0.12s var(--qnn-ease),
    border-color 0.12s var(--qnn-ease),
    color 0.12s var(--qnn-ease);
}
.qnn-pane-rail-btn:hover {
  background: var(--qnn-surface-muted);
  border-color: var(--qnn-hairline);
  color: var(--qnn-accent);
}
.qnn-pane-rail-btn:focus-visible {
  outline: 2px solid var(--qnn-accent);
  outline-offset: 1px;
}

/* Inspector status dot */
.qnn-inspector-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid var(--qnn-ink-muted);
  background: transparent;
}
.qnn-inspector-dot[data-selected] {
  background: var(--qnn-accent);
  border-color: var(--qnn-accent);
}

/* Pane title row (title + collapse chevron) */
.qnn-pane-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 4px;
}
.qnn-pane-collapse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--qnn-ink-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s var(--qnn-ease), color 0.12s var(--qnn-ease);
}
.qnn-pane-collapse-btn:hover {
  background: var(--qnn-surface-muted);
  color: var(--qnn-ink);
}
```

At the `<= 960px` breakpoint: hide `.qnn-pane-rail` and `.qnn-pane-collapse-btn`, and re-assert the stacked grid so the new attribute selectors don't win on specificity. The existing media query sets `grid-template-columns: 1fr` on `.qnn-shell` (specificity `0,1,0`), but the new `.qnn-shell[data-left-collapsed]` rules are `0,2,0` — higher specificity, so they'd override even inside the media query. Fix by adding an explicit override inside the existing `@media (max-width: 960px)` block:

```css
@media (max-width: 960px) {
  .qnn-shell,
  .qnn-shell[data-left-collapsed],
  .qnn-shell[data-right-collapsed],
  .qnn-shell[data-left-collapsed][data-right-collapsed] {
    grid-template-columns: 1fr;
  }
  .qnn-pane-rail,
  .qnn-pane-collapse-btn {
    display: none;
  }
}
```

## Accessibility

- Each rail button and collapse chevron has `aria-label`:
  - Expand chevron: `"Expand palette"` / `"Expand inspector"`.
  - Collapse chevron: `"Collapse palette"` / `"Collapse inspector"`.
  - Category icons: `"Expand palette and scroll to {cat}"`.
  - Status dot: `"Expand inspector"`.
- All rail buttons are native `<button>` — keyboard-focusable, Enter/Space activate.
- Focus management: when expanding via a rail click, do **not** steal focus away from the button; the pane becomes visible but focus stays on the (now-hidden) rail's replacement position. Acceptable tradeoff; revisit only if testing shows confusion.

## Public surface

No new exports from `@qnn/designer` are required. The feature is entirely internal to `QuestionnaireDesigner`. `localStorage` usage is opt-out-less; this matches existing `useThemeMode`.

## Files to touch

**New:**

- `packages/designer/src/designer/hooks/usePaneCollapsed.ts`
- `packages/designer/src/designer/panes/PaletteRail.tsx`
- `packages/designer/src/designer/panes/InspectorRail.tsx`
- `apps/demo/tests/pane-collapse.spec.ts`

**Modified:**

- `packages/designer/src/designer/Designer.tsx` — wire hooks, data attributes, rail vs pane switching.
- `packages/designer/src/designer/panes/PalettePane.tsx` — title-row wrapper + collapse chevron, `data-category` attribute on groups, accept `onCollapse`.
- `packages/designer/src/designer/panes/PropertiesPane.tsx` — title-row wrapper + collapse chevron on both title variants, accept `onCollapse`.
- `packages/designer/src/designer/styles.css` — rail + collapsed grid styles, responsive hide.

## Testing

**Playwright (`apps/demo/tests/pane-collapse.spec.ts`):**

1. Collapse palette via chevron → `.qnn-shell` has `data-left-collapsed`; rail is visible; canvas container wider than baseline.
2. Click the "input" category icon on the palette rail → pane expanded; `[data-category="input"]` scrolled into view (`.isIntersectingViewport()` or bounding-box check).
3. Collapse inspector with a selected control → `.qnn-inspector-dot[data-selected]` rendered.
4. Collapse inspector with no selection → `.qnn-inspector-dot:not([data-selected])`.
5. Reload after collapsing both panes → both still collapsed (localStorage round-trip).

Manual check during implementation: dark mode — all rail affordances read correctly against `--qnn-surface` in both themes.

## Risks / open questions

- **Scroll target:** when the palette has very long content, `scrollIntoView` on a group may push the group above the pane's scroll container. The group containers are children of the `<aside>` scroll container (`overflow: auto`), so the browser will scroll the `<aside>`, not the window. Verified by inspection of existing `.qnn-shell > aside` CSS.
- **Rail content overflow:** 3 category icons + chevron is 4 buttons × 32px = ~140px of height. Fits comfortably. If more categories are added later, a vertical overflow with thin scrollbar is acceptable (out of scope now).
- **Theme-driven re-renders:** the shell already re-renders on theme toggles via `useThemeMode`. Adding two more `usePaneCollapsed` hooks is additive; no perf concern.

## Completion criteria

- Clicking collapse chevron on either pane shrinks that column to 44px and shows the rail.
- Clicking any rail affordance expands the pane.
- Clicking a palette category icon on the rail also scrolls that group into view.
- State persists across a page reload in both Chromium and Firefox (via Playwright default project).
- Dark mode reads correctly.
- Existing E2E + typecheck + lint all green.
