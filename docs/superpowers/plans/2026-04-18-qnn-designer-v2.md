# QNN Designer v0.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the v0.1.0 MVP into a credibly shippable release —
keyboard UX, error containment, accessibility, cross-page drag, one
non-trivial plugin, theme editing, and answer export. See
[`docs/superpowers/specs/2026-04-18-qnn-designer-v2-design.md`](../specs/2026-04-18-qnn-designer-v2-design.md)
for the approved spec.

**Architecture:** No structural changes. All work lands in the existing
`packages/designer` + `apps/demo` surfaces. Schema version stays at `1`.

**Tech stack:** Unchanged from v0.1.0 — React 18, TS 5.6, AntD 5,
Zustand 5 + zundo, @dnd-kit/*, Zod 3, Vite 5, Vitest 2, Playwright 1,
pnpm 9. Added dev-dep: `@axe-core/playwright` for a11y smoke tests.

**Testing philosophy:** Same as v1. Pure-TS changes are TDD-first; React
changes are pinned by e2e. Keyboard / a11y / theme get dedicated
Playwright scenarios.

**Parallelism hints:** Tasks are grouped by phase; Phases 1–5 must land
sequentially (each depends on the previous store / registry surface).
Within a phase, the "Parallel-safe" callout at the end of each phase
lists task ids that can be dispatched concurrently.

---

## Phase 0 — Pre-flight

### Task 1: Add `@axe-core/playwright` dev-dep

**Files:**
- Modify: `apps/demo/package.json` (devDependencies)
- Run: `pnpm install`

- [ ] **Step 1.** Add `"@axe-core/playwright": "^4.9.0"` to
      `apps/demo/package.json` under `devDependencies`.
- [ ] **Step 2.** Run `pnpm install`. Lockfile updates.
- [ ] **Step 3.** Commit:
      `git add apps/demo/package.json pnpm-lock.yaml && git commit -m "chore(demo): add @axe-core/playwright for a11y tests"`.

### Task 2: Lint sweep — zero-warning baseline

**Files:**
- Modify any file flagged by `pnpm lint`.

- [ ] **Step 1.** Run `pnpm lint` and capture the full output.
- [ ] **Step 2.** Fix every warning and error. Prefer real fixes over
      eslint-disable comments; only suppress when the lint rule is
      genuinely wrong for our context.
- [ ] **Step 3.** Re-run `pnpm lint`. Zero warnings, zero errors.
- [ ] **Step 4.** Run `pnpm test` + `pnpm --filter @qnn/designer typecheck`
      — no regressions.
- [ ] **Step 5.** Commit: `chore: lint-clean repo (zero warnings baseline)`.

---

## Phase 1 — Keyboard shortcuts + Esc to deselect

### Task 3: Keyboard-shortcut hook

**Files:**
- Create: `packages/designer/src/designer/hooks/useKeyboardShortcuts.ts`
- Create: `packages/designer/tests/designer/keyboardShortcuts.test.ts`

- [ ] **Step 1.** Write failing test covering:
      - `Cmd+Z` / `Ctrl+Z` fires the passed `onUndo`.
      - `Cmd+Shift+Z` / `Ctrl+Shift+Z` fires `onRedo`.
      - `Delete` and `Backspace` fire `onDelete` only when `hasSelection`
        is true.
      - `Escape` fires `onDeselect`.
      - Events are ignored when `target` is inside an `<input>`,
        `<textarea>`, or element with `contenteditable`.

- [ ] **Step 2.** Implement
      `useKeyboardShortcuts({ onUndo, onRedo, onDelete, onDeselect, hasSelection })`
      as a `useEffect` attaching / detaching a `keydown` listener on
      `window`. Platform detection via
      `navigator.platform.toLowerCase().includes('mac')`.

- [ ] **Step 3.** All tests green. Typecheck clean.

- [ ] **Step 4.** Commit:
      `feat(designer): useKeyboardShortcuts hook with TDD`.

### Task 4: Wire shortcuts into the designer shell

**Files:**
- Modify: `packages/designer/src/designer/Designer.tsx`

- [ ] **Step 1.** Inside `DesignerShell`, call `useKeyboardShortcuts`
      with handlers sourced from `store.getState()`:
      - `onUndo` → `store.getState().undo()`
      - `onRedo` → `store.getState().redo()`
      - `onDelete` → read `selection.controlId`; call
        `deleteControl({ pageId: currentPage.id, controlId })`.
      - `onDeselect` → `store.getState().selectControl(null)`.
      - `hasSelection` → `Boolean(selection.controlId)`.

- [ ] **Step 2.** Typecheck clean; unit tests pass; existing e2e pass.

- [ ] **Step 3.** Commit:
      `feat(designer): wire keyboard shortcuts into shell`.

### Task 5: E2E — keyboard scenarios

**Files:**
- Create: `apps/demo/tests/keyboard.e2e.ts`

- [ ] **Step 1.** Scenarios (each a `test(...)`):
      - "undo/redo via keyboard reverts and reapplies a drop"
      - "Delete removes selected cell"
      - "Escape deselects"
      - "Shortcuts ignored inside the title input"
- [ ] **Step 2.** All four pass.
- [ ] **Step 3.** Commit: `test(e2e): keyboard shortcuts coverage`.

**Parallel-safe within Phase 1:** Tasks 3, 4, 5 are sequential (4 needs
3, 5 needs 4).

---

## Phase 2 — Error boundary at the designer root

### Task 6: `DesignerErrorBoundary` component

**Files:**
- Create: `packages/designer/src/util/DesignerErrorBoundary.tsx`
- Create: `packages/designer/tests/util/DesignerErrorBoundary.test.tsx`

- [ ] **Step 1.** Write failing test using `@testing-library/react`:
      - A child that throws renders the fallback.
      - `onError` prop receives the error + info.
      - Bumping `resetKey` clears the error state.

- [ ] **Step 2.** Implement as a React class component.
      `state = { error: Error | null }`. `componentDidCatch` captures
      error; `componentDidUpdate` compares `resetKey` to clear state.
      Fallback UI: AntD `Result` + `Button` that re-throws so hosts
      can supply their own fallback via the `onError` callback.

- [ ] **Step 3.** Export from `src/util/index.ts` (create if not exists).
- [ ] **Step 4.** Tests pass, typecheck clean.
- [ ] **Step 5.** Commit: `feat(designer): root error boundary with reset key`.

### Task 7: Wire `DesignerErrorBoundary` into `QuestionnaireDesigner`

**Files:**
- Modify: `packages/designer/src/designer/Designer.tsx`

- [ ] **Step 1.** Accept new props
      `onError?: (error, info) => void` and `resetKey?: unknown` on
      `QuestionnaireDesignerProps`.
- [ ] **Step 2.** Wrap the entire `<DesignerShell>` in
      `<DesignerErrorBoundary {...{ onError, resetKey }}>`.
- [ ] **Step 3.** Typecheck clean; all existing tests pass.
- [ ] **Step 4.** Commit: `feat(designer): wire root error boundary`.

### Task 8: Update exports + docs

**Files:**
- Modify: `packages/designer/src/index.ts`
- Modify: `docs/API.md`

- [ ] **Step 1.** Export `DesignerErrorBoundary` type (not the class —
      consumers get access via the wrapped designer).
- [ ] **Step 2.** Update the `<QuestionnaireDesigner>` prop table in
      `docs/API.md` to mention `onError` + `resetKey`.
- [ ] **Step 3.** Commit: `docs(api): document onError and resetKey`.

**Parallel-safe within Phase 2:** Tasks 6, 7, 8 sequential.

---

## Phase 3 — Accessibility pass

### Task 9: Focus rings + keyboard focus on palette items

**Files:**
- Modify: `packages/designer/src/designer/panes/PalettePane.tsx`
- Modify: `packages/designer/src/designer/styles.css`

- [ ] **Step 1.** `PaletteItem` becomes focusable (`tabIndex={0}`).
      Add `:focus-visible` style in `styles.css`:
      ```css
      .qnn-palette-item:focus-visible {
        outline: 2px solid var(--qnn-accent);
        outline-offset: 2px;
      }
      ```
- [ ] **Step 2.** Space / Enter on a focused palette item dispatches
      a new store action `addControlAtEnd({ plugin })` that inserts the
      control at the end of the current page (keyboard DnD fallback).
      Implement `addControlAtEnd` in the designer store.
- [ ] **Step 3.** Typecheck; existing tests pass; add a unit test for
      `addControlAtEnd`.
- [ ] **Step 4.** Commit:
      `feat(a11y): keyboard-accessible palette with focus ring`.

### Task 10: a11y polish on tabs, buttons, drop zones

**Files:**
- Modify: `packages/designer/src/designer/panes/PageTabs.tsx`
- Modify: `packages/designer/src/designer/panes/CanvasPane.tsx`
- Modify: `packages/designer/src/designer/styles.css`

- [ ] **Step 1.** Page-tab close "×" gets
      `aria-label={`Delete ${p.name}`}`. Canvas drop zones get
      `role="region"` with `aria-label="Canvas drop target"`. Page tabs
      get `tabIndex={0}` and Enter activates them.
- [ ] **Step 2.** Add a `:focus-visible` style for `.qnn-pagetab` and
      `.qnn-cell` in `styles.css`.
- [ ] **Step 3.** Existing e2e still pass; no new scenarios needed here.
- [ ] **Step 4.** Commit: `feat(a11y): labels and focus rings on tabs/dropzones`.

### Task 11: axe-core smoke in roundtrip e2e

**Files:**
- Modify: `apps/demo/tests/roundtrip.e2e.ts`
- Modify: `apps/demo/tests/helpers.ts`

- [ ] **Step 1.** In `helpers.ts`, add `async function expectNoA11yViolations(page, ...)`
      that runs `new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa'])
        .analyze()` and asserts `result.violations.filter(v =>
        ['critical', 'serious'].includes(v.impact)).length === 0`.
- [ ] **Step 2.** Call `expectNoA11yViolations(page)` after the
      designer page has rendered in `roundtrip.e2e.ts`.
- [ ] **Step 3.** Fix any critical / serious violation raised (likely
      candidates: missing `main` landmark in `DesignerRoute`, AntD
      color-contrast on secondary text — bump `--qnn-ink-muted` a
      shade if needed).
- [ ] **Step 4.** All e2e pass.
- [ ] **Step 5.** Commit: `test(a11y): axe-core smoke in roundtrip`.

**Parallel-safe within Phase 3:** Tasks 9 and 10 can run in parallel
after dispatch; Task 11 must come last.

---

## Phase 4 — Cross-page drag

### Task 12: Hover-delay hook for page tabs

**Files:**
- Create: `packages/designer/src/designer/hooks/useHoverDelay.ts`
- Create: `packages/designer/tests/designer/useHoverDelay.test.ts`

- [ ] **Step 1.** Write failing test: the hook returns handlers that,
      on `pointerenter`, start a timer; on `pointerleave`, clear the
      timer; when the timer fires, calls the passed callback. Uses
      `vi.useFakeTimers()`.
- [ ] **Step 2.** Implement `useHoverDelay(callback, delayMs = 500)`.
- [ ] **Step 3.** Tests pass, typecheck clean.
- [ ] **Step 4.** Commit:
      `feat(designer): useHoverDelay hook with fake-timer tests`.

### Task 13: Page-tab drag-switch wiring

**Files:**
- Modify: `packages/designer/src/designer/panes/PageTabs.tsx`
- Modify: `packages/designer/src/designer/Designer.tsx`
- Modify: `packages/designer/src/designer/hooks/useCanvasDnd.ts`

- [ ] **Step 1.** In `useCanvasDnd`, expose `isDragging: boolean`.
- [ ] **Step 2.** Pass `isDragging` down to `PageTabs`. When `true`,
      each tab wires `useHoverDelay(() => store.getState().selectPage(p.id))`
      onto its pointer events.
- [ ] **Step 3.** Add a subtle `.qnn-pagetab-dragtarget` class (blue
      1-px bottom underline at 50% opacity) while a drag is active.
- [ ] **Step 4.** Typecheck clean; existing e2e pass.
- [ ] **Step 5.** Commit:
      `feat(designer): cross-page drag via 500ms hover on page tabs`.

### Task 14: E2E cross-page-drag scenario

**Files:**
- Create: `apps/demo/tests/cross-page-drag.e2e.ts`

- [ ] **Step 1.** Scenario: place a `textbox` on Page 1, add Page 2,
      start dragging the textbox, hover Page 2 tab for > 500 ms, drop
      onto the new page's canvas — assert the textbox is gone from
      Page 1 and present on Page 2.
- [ ] **Step 2.** Scenario passes. All prior e2e still pass.
- [ ] **Step 3.** Commit: `test(e2e): cross-page drag scenario`.

**Parallel-safe within Phase 4:** 12 and 13 can go parallel once 12 is
designed; 14 must come last.

---

## Phase 5 — Currency plugin

### Task 15: Implement `currency` plugin

**Files:**
- Create: `packages/designer/src/registry/controls/currency.tsx`
- Modify: `packages/designer/src/registry/controls/index.ts`
- Create: `packages/designer/tests/registry/controls/currency.test.ts`

- [ ] **Step 1.** Write failing test covering `validate()`
      (min/max), `toAnswerValue()` (string → number), and
      `isValueEmpty()` (`typeof v !== 'number'`).
- [ ] **Step 2.** Implement plugin per spec §2.3. `CanvasPreview`
      shows a disabled `InputNumber` with `prefix={currency}`.
      `PropertyEditor` exposes a `Radio.Group` for currency choice and
      min/max `InputNumber`s. `Renderer` uses AntD `InputNumber` with
      `prefix` and sets `status="error"` on validation failure.
- [ ] **Step 3.** Register the plugin in `controls/index.ts` via the
      default registry (`BUILT_IN_PLUGINS` array).
- [ ] **Step 4.** Unit tests pass, typecheck clean. Full unit suite:
      existing + currency tests.
- [ ] **Step 5.** Commit:
      `feat(controls): add currency plugin with min/max validation`.

### Task 16: Document currency plugin in INTEGRATION.md

**Files:**
- Modify: `docs/INTEGRATION.md`

- [ ] **Step 1.** Replace the "Writing a custom plugin" walkthrough's
      illustrative `currency` example with a pointer to the real
      `@qnn/designer/registry/controls/currency.tsx` file and a
      stripped-down code snippet showing just the interesting bits
      (`toAnswerValue`, `isValueEmpty`).
- [ ] **Step 2.** Commit:
      `docs(integration): reference real currency plugin`.

**Parallel-safe within Phase 5:** 15 and 16 sequential (16 references 15).

---

## Phase 6 — Theme customization UI

### Task 17: `updateTheme` store action

**Files:**
- Modify: `packages/designer/src/store/designer.ts`
- Modify: `packages/designer/tests/store/designer.test.ts`

- [ ] **Step 1.** Add test: `updateTheme({ accentColor: '#ff0000' })`
      patches `questionnaire.theme.accentColor`, stamps `updatedAt`,
      and is undoable.
- [ ] **Step 2.** Implement `updateTheme` alongside other mutators.
      Goes through the same `stamp({ ...q, theme: { ...q.theme, ...patch } })`
      + `set` pattern.
- [ ] **Step 3.** Add `updateTheme` to the `DesignerActions` interface.
      Typecheck + tests clean.
- [ ] **Step 4.** Commit:
      `feat(store): updateTheme mutator with undo support`.

### Task 18: `ThemeTab` component + Inspector integration

**Files:**
- Create: `packages/designer/src/designer/panes/ThemeTab.tsx`
- Modify: `packages/designer/src/designer/panes/PropertiesPane.tsx`

- [ ] **Step 1.** `ThemeTab` uses AntD `Form` with:
      - `ColorPicker` for `accentColor`
      - `Select` for `fontFamily` (3 presets + "Custom…" revealing an
        `Input`)
      - `ColorPicker` for `pageBackground`
      - `InputNumber` for `contentMaxWidth` (480–1440, step 40)
      Each commits via `updateTheme` on change.
- [ ] **Step 2.** In `PropertiesPane`, when no control is selected,
      the `Tabs` now has three items: Page, Theme, Rules. (Page becomes
      the first tab; Theme is new.)
- [ ] **Step 3.** Live-preview: the designer's internal `ConfigProvider`
      (if any — else wrap the shell in one) is keyed on
      `theme.accentColor` so accent changes re-render AntD components
      with the new primary token.
- [ ] **Step 4.** Typecheck + existing e2e clean.
- [ ] **Step 5.** Commit:
      `feat(designer): ThemeTab for accent, font, background, width`.

### Task 19: E2E — theme round-trip

**Files:**
- Create: `apps/demo/tests/theme.e2e.ts`

- [ ] **Step 1.** Scenario: open designer, switch to Theme tab, pick an
      accent colour (e.g. #e11d48 via the AntD color picker's hex
      input), open Preview modal, assert a primary button inside the
      modal has `background-color` computed to the new accent.
- [ ] **Step 2.** Scenario passes. Commit:
      `test(e2e): theme-tab accent colour propagates to preview`.

**Parallel-safe within Phase 6:** 17 blocks 18; 19 last.

---

## Phase 7 — Runtime answers export

### Task 20: CSV / JSON serialisers

**Files:**
- Create: `packages/designer/src/runtime/serializers.ts`
- Create: `packages/designer/tests/runtime/serializers.test.ts`

- [ ] **Step 1.** Write failing tests:
      - `answersToJson(questionnaire, answers)` returns
        `{ questionnaireId, submittedAt, answers }` with ISO timestamps.
      - `answersToCsv(questionnaire, answers)` returns a CSV string
        with header `alias,friendlyName,value` and correct quoting:
        commas inside values wrapped in `"..."`, internal `"`
        doubled, arrays joined with `; `, dates ISO.
- [ ] **Step 2.** Implement both. Pure TS. No external dep.
- [ ] **Step 3.** Tests pass.
- [ ] **Step 4.** Commit:
      `feat(runtime): answers serialisers (JSON + CSV)`.

### Task 21: `exportable` prop + Submit dropdown

**Files:**
- Modify: `packages/designer/src/runtime/PageNavigation.tsx`
- Modify: `packages/designer/src/runtime/Renderer.tsx`

- [ ] **Step 1.** Add `exportable?: boolean` to
      `QuestionnaireRendererProps`. Default `false`.
- [ ] **Step 2.** When `exportable` and on the final page,
      `PageNavigation` renders an AntD `Dropdown.Button` instead of a
      plain `Button`:
      - Primary action: "Submit" (fires `onSubmit(answers)`).
      - Menu: "Download answers (JSON)" + "Download answers (CSV)".
      Each menu item triggers a client-side download via a
      `Blob` + `URL.createObjectURL`.
- [ ] **Step 3.** Typecheck clean; existing e2e pass.
- [ ] **Step 4.** Commit:
      `feat(runtime): exportable flag with JSON/CSV answer download`.

### Task 22: E2E — answers export

**Files:**
- Create: `apps/demo/tests/answers-export.e2e.ts`
- Modify: `apps/demo/src/routes/PreviewRoute.tsx` (set `exportable`)

- [ ] **Step 1.** Scenario:
      - Build a 2-control questionnaire (textbox + multi) in the
        designer, save draft.
      - Open `/preview`, fill both, click the Submit dropdown, pick
        "Download answers (CSV)".
      - Assert Playwright's download event has filename matching
        `answers-<questionnaireId>-*.csv` and the first line is the
        expected header.
- [ ] **Step 2.** Scenario passes.
- [ ] **Step 3.** Commit: `test(e2e): answers export scenario`.

**Parallel-safe within Phase 7:** 20 blocks 21; 22 last.

---

## Phase 8 — Release prep

### Task 23: Changelog + version bump

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `packages/designer/package.json` (version `0.2.0`)
- Modify: `apps/demo/package.json` (version `0.2.0`)
- Modify: `packages/designer/src/version.ts` (export updated)

- [ ] **Step 1.** Add a `[0.2.0]` section to `CHANGELOG.md`
      summarising Phases 1–7. Reference commit SHAs if desired.
- [ ] **Step 2.** Bump versions.
- [ ] **Step 3.** Rebuild both packages, confirm version string in the
      built bundles.
- [ ] **Step 4.** Commit: `chore: release v0.2.0`.

### Task 24: Final acceptance run

- [ ] `pnpm install && pnpm build` — clean.
- [ ] `pnpm test` — ≥ 86 unit tests passing.
- [ ] `pnpm test:e2e` — ≥ 7 scenarios passing.
- [ ] `pnpm lint` — zero warnings, zero errors.
- [ ] `pnpm typecheck` — clean.
- [ ] Manual smoke at `/design` and `/preview` (see spec §7 acceptance).

If anything fails, fix and re-run. If the fix is non-trivial, land it
as its own commit and note the regression in the changelog.

### Task 25: Tag and handoff

- [ ] `git tag v0.2.0`
- [ ] Update `docs/ROADMAP.md`: move shipped items from "Next up" to
      "Shipped", draft the next "Next up" section.
- [ ] Commit: `docs(roadmap): roll forward after v0.2.0 release`.

---

## Parallelism hints (for subagent-driven execution)

Safe-to-parallelise groupings (do NOT parallelise across groups —
finish one group before starting the next):

- **Group A (sequential):** Tasks 1, 2.
- **Group B (sequential):** Tasks 3 → 4 → 5.
- **Group C (sequential):** Tasks 6 → 7 → 8.
- **Group D:** Tasks 9 & 10 in parallel, then 11.
- **Group E (sequential):** Tasks 12 → 13 → 14.
- **Group F (sequential):** Tasks 15 → 16.
- **Group G (sequential):** Tasks 17 → 18 → 19.
- **Group H (sequential):** Tasks 20 → 21 → 22.
- **Group I (sequential):** Tasks 23 → 24 → 25.

When dispatching parallel subagents, include in each prompt:
- The exact files that task touches (and only those).
- A list of files the task must NOT touch.
- The acceptance command to run before returning
  (`pnpm --filter @qnn/designer test -- <path>` or similar).

---

## Spec coverage map

Cross-check that every v0.2 spec section has tasks.

| Spec § | Topic | Tasks |
|---|---|---|
| 2.1.1 | Designer-root error boundary | 6, 7, 8 ✓ |
| 2.1.2 | Esc to deselect | 3, 4 ✓ |
| 2.1.3 | Keyboard shortcuts | 3, 4, 5 ✓ |
| 2.1.4 | Accessibility pass | 9, 10, 11 ✓ |
| 2.1.5 | Lint-clean repo | 2 ✓ |
| 2.2 | Cross-page drag | 12, 13, 14 ✓ |
| 2.3 | Currency plugin | 15, 16 ✓ |
| 2.4 | Theme UI | 17, 18, 19 ✓ |
| 2.5 | Answers export | 20, 21, 22 ✓ |
| 6 | Release | 23, 24, 25 ✓ |

No open holes.

---

## Execution handoff

Plan complete and saved to this file. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per
task, review between tasks, respect the parallelism groups above.

**2. Inline execution** — straight-line via `superpowers:executing-plans`,
single session.

Previous session shipped v0.1.0 across 42 commits + 1 merge. The branch
to work from is `main`; create a feature branch `feat/qnn-designer-v2`
before starting Task 1.
