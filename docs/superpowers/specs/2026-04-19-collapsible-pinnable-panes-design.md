# Collapsible & Pinnable Palette / Inspector Panes — Design

Date: 2026-04-19
Scope: `packages/designer`

## Goal

Make the Palette (left) and Inspector (right) panes of the QNN Designer
collapsible, with an option to pin them open. When a pane is unpinned and
opened, it floats over the canvas; when pinned, it docks into the shell and
shrinks the canvas. State persists across reloads.

## Decisions

| Topic | Choice |
| --- | --- |
| Pin model | Manual collapse + overlay-vs-dock (Notion/Slack-style). Pinned ⇒ docks and consumes grid space. Unpinned-but-open ⇒ overlays the canvas. |
| Default state | Both panes start collapsed. Inspector auto-opens when a control is selected. |
| Persistence | Both pin state and open/closed state persisted to `localStorage`. |
| Collapsed access | Always-visible 36px edge rail on each side with a click-to-expand tab (icon + vertical label). |
| Closing | Re-click the rail tab, or click the pane's collapse (X) button in its header. Clicking the canvas does NOT close the pane. |
| Inspector auto-open | When a control is selected and Inspector is closed, auto-open it (overlay if unpinned, docked if pinned). |
| Mobile | Same model as desktop. The current `<960px` vertical-stack rule is removed. |
| Keyboard | No global Esc handler (would conflict with "canvas clicks don't close"). Pin/collapse buttons and the rail tab are focusable `<button>`s. |

## State model

A new module `packages/designer/src/designer/hooks/useLayoutPrefs.ts`
exposes:

```ts
type PaneId = 'palette' | 'inspector';

type PanePrefs = { pinned: boolean; open: boolean };
type LayoutPrefs = { palette: PanePrefs; inspector: PanePrefs };

function useLayoutPrefs(): {
  prefs: LayoutPrefs;
  togglePin: (pane: PaneId) => void;       // does NOT change open
  setOpen: (pane: PaneId, open: boolean) => void; // does NOT change pinned
};
```

- Storage key: `qnn:layoutPrefs:v1` (versioned for future migrations).
- Defaults: both panes `{ pinned: false, open: false }`.
- Lives outside the Zustand `designer` store. Rationale: this is per-user
  UI preference, not document state, and must be excluded from undo/redo
  and from `onChange(questionnaire)` notifications.
- Resilience: if `localStorage` is unavailable (private mode, SSR), the
  hook falls back to in-memory state. If stored JSON is corrupted or its
  shape doesn't match, defaults are used and the bad value is overwritten
  on the next write.

## Inspector auto-open

Inside `DesignerShell`, an effect subscribes to the designer store's
`selection.controlId`. Whenever `controlId` transitions from `null` to a
non-null value (or from one id to another), it calls
`setOpen('inspector', true)`. This applies regardless of pin state — when
unpinned, the pane overlays; when pinned, it stays docked and merely
updates contents.

## Components & file changes

### New files

- `packages/designer/src/designer/hooks/useLayoutPrefs.ts` — the hook
  described above.
- `packages/designer/src/designer/panes/PaneRail.tsx` — the always-visible
  36px rail tab.
  ```ts
  type PaneRailProps = {
    side: 'left' | 'right';
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    pulsing?: boolean;
  };
  ```
- `packages/designer/src/designer/panes/PaneFrame.tsx` — wraps a pane's
  content with a header (title + pin button + collapse button).
  ```ts
  type PaneFrameProps = {
    title: string;
    pinned: boolean;
    onTogglePin: () => void;
    onClose: () => void;
    children: React.ReactNode;
  };
  ```

### Modified files

- `packages/designer/src/designer/Designer.tsx` (`DesignerShell`):
  reads `useLayoutPrefs`, computes layout-state classes on `.qnn-shell`,
  and renders for each side: a `<PaneRail>` (always) plus, when
  `prefs[pane].open`, a `<PaneFrame>` wrapping the existing pane content.
  Adds the auto-open effect for Inspector.
- `packages/designer/src/designer/panes/PalettePane.tsx` and
  `panes/PropertiesPane.tsx`: remove their internal `qnn-pane-title`
  heading — `PaneFrame` owns the header now. Otherwise unchanged.
- `packages/designer/src/designer/styles.css`:
  - Rewrite `.qnn-shell` grid template to be data-driven by pin/open
    state. Collapsed = `36px 1fr 36px`. Pinned-open palette = `288px 1fr
    36px` (and analogously for inspector / both pinned).
  - Add `.qnn-rail`, `.qnn-rail--pulsing`, `.qnn-pane-frame`,
    `.qnn-pane-frame--docked`, `.qnn-pane-frame--overlay`, header styles.
  - Add transitions on grid template width and overlay
    `transform: translateX`. Both ~200ms with `var(--qnn-ease)`. Wrapped
    in `@media (prefers-reduced-motion: no-preference)`.
  - Remove the `@media (max-width: 960px)` block that switched the shell
    to a single-column stack — the same rail+overlay model now applies on
    mobile.

### Unchanged

- `packages/designer/src/store/designer.ts` — domain store untouched.
- `packages/designer/src/designer/hooks/useCanvasDnd.ts` — drag-and-drop
  is unaffected; palette items keep `useDraggable`, so dragging from an
  unpinned overlay onto the canvas works without extra logic.
- All control plugins, the registry, schema, rules, and IO layers.

## Visual & interaction details

### Rail (`.qnn-rail`)

- 36px wide vertical strip; `var(--qnn-surface)` background; hairline
  border on the canvas-facing edge.
- Contains a single `<button>` rail tab: an icon plus a 90°-rotated label
  ("Palette" or "Inspector").
- Hover: accent border + weak accent background.
- `.qnn-rail--pulsing`: 1.2s CSS keyframe (subtle accent pulse) applied
  when the Inspector's selection changes while it's closed. The auto-open
  rule means this is normally invisible; it's a fallback for the case
  where the user has explicitly closed the Inspector after a selection.

### Pane frame header

- Sits above the existing pane content.
- Left: pane title.
- Right: two icon buttons.
  - **Pin** — `PushpinOutlined` from `@ant-design/icons`. Filled / accent
    when pinned, outlined / muted when not. Tooltip: "Pin pane" / "Unpin
    pane".
  - **Collapse** — `CloseOutlined`. Tooltip: "Collapse".

### Pinned vs unpinned rendering

- Pinned-open: pane is laid out in its grid track via
  `.qnn-pane-frame--docked`. Canvas shrinks to fit.
- Unpinned-open: pane is `position: absolute`, anchored to the rail's
  inner edge, full shell height, `var(--qnn-shadow-lg)`, z-index above
  the canvas. The grid track stays at 36px so the canvas geometry does
  not shift. Pane width matches the docked size (288 / 344).

### Animation

- Width transitions on the grid template (200ms,
  `var(--qnn-ease)`).
- Overlays slide in via `transform: translateX(...)` over the same
  duration.
- Both disabled when `prefers-reduced-motion: reduce`.

### Edge cases

- **Drag from unpinned overlay onto canvas**: overlay stays mounted
  through the drag because canvas clicks don't close it; existing dnd
  works unchanged.
- **Both panes pinned-open on a narrow viewport**: grid template is
  `288px 1fr 344px` regardless of viewport width. If `1fr` collapses
  below the canvas's intrinsic content width, `main`'s existing scroll
  handles it. No special collapse-on-narrow rule.

## Testing

The existing test suite is Vitest unit-only — no React Testing Library or
Playwright in `tests/`. New tests follow that pattern.

### Unit tests

`packages/designer/tests/designer/useLayoutPrefs.test.ts`:

- Defaults when `localStorage` is empty: both panes `{ pinned: false,
  open: false }`.
- `togglePin('palette')` flips `palette.pinned`, leaves `palette.open` and
  inspector untouched, and persists.
- `setOpen('inspector', true)` flips `inspector.open`, leaves
  `inspector.pinned` and palette untouched, and persists.
- After a write, re-mounting the hook reads the prior value back.
- Corrupted JSON in `localStorage` (`'not-json'`) falls back to defaults
  without throwing and is overwritten on the next write.
- Stored object missing fields (`{}`) falls back to defaults.

### Manual / dev verification (in a browser)

1. Clear `localStorage`. Reload. Both rails visible; canvas full-width
   (within its `max-width: 960px`).
2. Click palette rail tab. Palette overlays; canvas geometry unchanged.
3. Click rail tab again. Palette closes.
4. Open palette, click pin. Palette docks; canvas shrinks. Reload. Still
   docked-open.
5. Drag a control from an unpinned-open palette overlay onto the canvas.
   Drop succeeds; overlay stays open.
6. With Inspector closed, click a control on the canvas. Inspector
   auto-opens with the right contents.
7. Click a different control. Inspector contents update; pane stays open.
8. Click empty canvas. Inspector stays open. Click X (or rail tab) to
   close it.
9. Pin Inspector, reload. Inspector docked-open with no selection.
10. Resize viewport to <640px. Rails still present; overlays cover most
    of the canvas. Drag/select still work.

### Out of scope

- React Testing Library / Playwright integration tests for the auto-open
  + drag flow. No harness exists today; adding one is a separate piece
  of work.
