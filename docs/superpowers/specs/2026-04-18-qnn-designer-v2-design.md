# QNN Designer — v0.2 Design Spec

**Date:** 2026-04-18
**Status:** Draft — scopes the next release after v0.1.0 MVP.
**Target version:** `0.2.0`.

---

## 1. Overview

v0.2 is the production-hardening release. v0.1.0 proved the full
design → preview → export → import loop end-to-end; v0.2 fills in the
rough edges (keyboard UX, error containment, a11y, cross-page drag),
exercises the plugin API with one non-trivial custom control, and adds
user-facing theme editing plus answer export — the smallest set of
features that take the product from "working MVP" to "credibly
shippable".

### 1.1 Stakeholder decisions

Carried forward from v0.1.0 unchanged:
- Monorepo (`packages/designer` + `apps/demo`), pnpm, Vite, TypeScript.
- Ant Design 5 + Zustand + zundo + dnd-kit + Zod + dayjs + dompurify.
- Testing: Vitest (unit, TDD for pure modules) + Playwright (e2e).

New for v0.2: nothing structural. This release deepens v0.1.0 rather
than changing direction.

### 1.2 Non-goals (explicit)

Still deferred to v0.3+:
- Visual flow editor (React Flow node graph).
- Multi-select in canvas (shift-click + marquee).
- Dark mode and full theming beyond accent / font / background / width.
- Advanced controls: file upload, signature, camera, GPS, barcode,
  click-map, matrix, autosum.
- i18n (string table + per-control overrides).
- Server-side persistence / collaboration.
- Fixed-point rule evaluation (single-pass tick remains).
- WCAG audit to a specific level — "basic a11y pass" is enough.

---

## 2. Scope

### 2.1 Polish (must-land)

1. **Designer-root error boundary.** A class component wrapped around
   the entire `QuestionnaireDesigner` that catches runtime exceptions
   from the designer tree (not the plugin tree — that's the per-cell
   boundary shipped in v0.1.0) and renders a "Something broke — reload
   or discard draft?" recovery UI. Must expose a `resetKey` prop so the
   host can force a remount.

2. **Esc to deselect.** A global keydown listener on the designer shell
   that clears `selection.controlId` when `Escape` is pressed unless the
   active element is inside an input, textarea, or contenteditable host.

3. **Keyboard shortcuts.**
   - `⌘Z` / `Ctrl+Z` → undo
   - `⌘⇧Z` / `Ctrl+Shift+Z` → redo
   - `Delete` / `Backspace` with a cell selected → `deleteControl`
   - `Esc` → deselect (above)
   - **Scoped** to the designer shell; suppressed inside editable text
     fields via the same guard as Esc.

4. **Accessibility pass.**
   - Every custom-rendered interactive element has a visible focus ring
     (not just AntD's default).
   - Palette cards become focusable (`tabIndex=0`) and Space/Enter
     triggers the same behaviour as drag-drop pickup into the next empty
     row, as a keyboard fallback.
   - Page-tab close "×" gets a real accessible name
     (`aria-label="Delete {page name}"`).
   - Canvas drop zones get `role="region"` with `aria-label`.
   - `axe-core` smoke test on the demo designer route — zero critical
     or serious violations.

5. **Lint-clean repo.** `pnpm lint` passes with no warnings. v0.1.0 left
   a few `argsIgnorePattern: '^_'` fixtures that pass strict mode but
   not lint; we clean those up.

### 2.2 Cross-page drag (§6.6 from v1 spec)

When a control is being dragged, hovering a page tab for ~500 ms switches
to that page while keeping the drag alive; the user can drop into the
new page's canvas. Scope boundaries:

- **In scope**: dragging a canvas cell across pages (not palette).
- **In scope**: the timing threshold (500 ms) is a v0.2 constant; in
  v0.3 we can expose it via plugin / config.
- **Out of scope**: dragging pages themselves to reorder via drag
  (already possible via `reorderPages` API; UI is v0.3).

### 2.3 One advanced plugin — `currency`

A non-trivial custom plugin shipped in `registry/controls/currency.tsx`
and registered in the default registry. Exercises:

- Custom `props`: `{ currency: 'USD' | 'EUR' | 'GBP'; min?: number;
  max?: number }`.
- `validate()`: min/max bounds plus "required but empty" via
  `isValueEmpty` fallback.
- `toAnswerValue()`: coerces string input to `number` before the
  runtime answers map sees it.
- `isValueEmpty()`: `typeof v !== 'number'` (answers the designer's
  "required" check before a number has been typed).
- AntD `InputNumber` with `prefix` — demonstrates the prefix/suffix
  pattern for plugin authors.

Also: extend [`docs/INTEGRATION.md`](../../INTEGRATION.md) walkthrough
to reference this plugin.

### 2.4 Theme customization UI

A new `Theme` tab on the Inspector (alongside Page / Rules) when no
control is selected. Fields:

- **Accent colour**: AntD `ColorPicker` → writes to
  `questionnaire.theme.accentColor`. Also propagates to the designer's
  own `ConfigProvider` for live preview of form controls.
- **Font family**: `Select` with 3 presets (IBM Plex Sans,
  system-ui, Georgia/serif) plus a "Custom" text input.
- **Page background**: colour picker; applies to the preview modal
  and runtime page.
- **Max content width**: `InputNumber` (480–1440, step 40).

Edits are store mutations through a new `updateTheme(patch)` action on
`designerStore`, which goes through the undo history.

### 2.5 Runtime answers export

`<QuestionnaireRenderer>` gains an opt-in `exportable` prop. When set,
the final Submit button's dropdown menu reveals:

- "Submit" (default)
- "Download answers (JSON)"
- "Download answers (CSV)"

CSV format: one row per answer, `alias,friendlyName,value`. Arrays
(multi-select) join with `; `. Dates serialise ISO.

JSON format: `{ questionnaireId, submittedAt, answers: Record<Alias, unknown> }`.

The existing `onSubmit(answers)` callback still fires on Submit, unchanged.

---

## 3. Data model changes

**None in schema v1.** Everything in §2 works with the existing
`Questionnaire` document. Cross-page drag is UI-only. Theme edits
already have a target (`theme: ThemeSettings`). The currency plugin is
just another `ControlNode`.

Schema version stays `1`. `io/migrations.ts` remains a stub — the first
migration will land when we need it.

---

## 4. Public-API changes

### 4.1 Additions

- `QuestionnaireDesigner` gains:
  - `onError?: (error: Error, errorInfo: { componentStack: string }) => void`
    — called by the root error boundary before it renders fallback UI.
  - `resetKey?: unknown` — bumping this value clears the root error
    state and remounts the designer.

- `QuestionnaireRenderer` gains:
  - `exportable?: boolean` (default `false`) — enables answers export.

- New store action `designerStore.updateTheme(patch: Partial<ThemeSettings>)`.

### 4.2 Public CSS classes (for theme overrides)

Existing `.qnn-*` classes documented in
[`visual-system`](./2026-04-18-qnn-designer-visual-system.md) become the
supported theming surface. Nothing renamed.

### 4.3 No breaking changes

v0.2 is a minor bump. Anything on the v0.1.0 surface continues to work
unchanged.

---

## 5. Testing strategy

### 5.1 Unit tests (new)

- `rules/interpreter.test.ts` — unchanged.
- `registry/controls/currency.test.ts` — `validate()` and
  `toAnswerValue()` behaviours.
- `store/designer.test.ts` — new test for `updateTheme` + undo/redo.
- `designer/keyboard.test.ts` — keyboard-shortcut dispatcher hook,
  tested with `@testing-library/react`.

### 5.2 E2E (new Playwright scenarios)

- `apps/demo/tests/keyboard.e2e.ts` — undo / redo / delete / Esc.
- `apps/demo/tests/cross-page-drag.e2e.ts` — hold-to-switch gesture.
- `apps/demo/tests/theme.e2e.ts` — pick an accent colour, confirm
  `--ant-color-primary` updates on the preview modal.
- `apps/demo/tests/answers-export.e2e.ts` — fill a form in preview,
  click "Download CSV", assert filename + first row.

### 5.3 a11y

- `@axe-core/playwright` injected into the existing
  `roundtrip.e2e.ts` after the designer loads. Fails the test on any
  critical / serious violation.

### 5.4 Targets

- All v0.1.0 tests continue to pass unchanged.
- Net-new unit tests: ≥ 12.
- Net-new e2e tests: 4.
- Lint: `pnpm lint` zero warnings, zero errors.

---

## 6. Rollout & risk

- Feature-flag the cross-page drag behaviour via an opt-in prop
  `QuestionnaireDesigner({ experimentalCrossPageDrag?: boolean })` for
  the first iteration, flip on by default before tagging v0.2.0.
- Theme tab is always on — no flag.
- Currency plugin is registered in the default registry; it's additive.
- Answers export is opt-in via `exportable` prop — no behaviour change
  for existing callers.

### 6.1 Known risks

- **Keyboard shortcuts inside AntD Modal** may not receive events if
  focus is trapped in the modal. Tests must cover modal-open cases
  explicitly.
- **ColorPicker ↔ ConfigProvider live update** requires re-rendering the
  designer's AntD root on theme change. The simplest path is to key the
  internal `ConfigProvider` on `questionnaire.theme.accentColor`.
- **Cross-page drag + dnd-kit auto-scroll**: dnd-kit's default scroll
  behaviour may conflict with the tab-hover switch. Reference tests
  are the v0.1.0 canvas scenarios — none break.
- **axe-core finding volume**: likely some AntD-default violations we
  can't fix (e.g., input-label associations in `Form.Item` sometimes
  miss). Scope to "critical + serious"; "moderate" is v0.3.

---

## 7. Acceptance criteria

v0.2 is done when, from a clean checkout:

1. `pnpm install && pnpm build` completes cleanly.
2. `pnpm test` reports ≥ 86 unit tests passing.
3. `pnpm test:e2e` reports ≥ 7 scenarios passing (3 v1 + 4 v2).
4. `pnpm lint` reports zero errors and zero warnings.
5. `pnpm typecheck` exits cleanly.
6. Designer at `/design`:
   - Undo / Redo / Delete / Esc keyboard shortcuts work as specified.
   - Accent-colour change on the Theme tab flows into the preview modal
     immediately.
   - Dragging a cell over another page tab for ~500 ms switches pages
     with the drag still active; dropping lands the cell there.
   - Triggering an exception inside a non-plugin component shows the
     root-error recovery UI with a functioning "Reset" button.
7. Renderer at `/preview` with `exportable` set:
   - JSON and CSV download buttons produce correctly-formatted files.
8. Currency plugin appears in the palette, can be placed, configured
   (USD / EUR / GBP), and validates min/max at runtime.

---

## 8. Tradeoffs

- **Single-pass tick stays.** Fixed-point is still "bigger than we
  need" — the only scenarios that actually exercise chained rules are
  narrow, and single-pass is correct under `re-tick on next input`
  semantics. Revisit in v0.3 if users hit it.
- **Theme tab is live but scoped.** We intentionally don't expose
  corner rounding, shadow intensity, or per-page theming in v0.2. The
  surface area explodes quickly and needs a design UX pass we haven't
  done.
- **Keyboard shortcuts use `⌘ on Mac, Ctrl on others` detected by
  `navigator.platform`.** Not perfect (Chromebook?), but v0.2 parity
  with Figma/Linear expectations is enough.
- **axe-core at "critical + serious" only.** Going tighter means
  vendoring AntD patches; not worth it for v0.2.

---

## 9. Open items

1. Decide whether `exportable` on the renderer should be a boolean or an
   object like `{ json?: boolean; csv?: boolean }` for finer opt-in.
   Leaning boolean for v0.2.
2. Cross-page drag hover delay — tested value of 500 ms is a guess;
   might tune to 400 ms after real-device testing.
3. Should `updateTheme` be one action or split into
   `setAccentColor` / `setFontFamily` / `setPageBackground` /
   `setContentMaxWidth`? One action = simpler API and fewer undo
   entries per interaction. Going with one.
