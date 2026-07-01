# QNN Designer — v1 Design Spec

**Date:** 2026-04-18
**Status:** Approved (pending user review of this document)
**Version target:** v1 (MVP). v2+ scope is captured as *designed-for, not-built*.

---

## 1. Overview

QNN Designer is a reusable, React-based questionnaire **designer** and **renderer** module. It lets a non-developer design a multi-page questionnaire with a drag-and-drop canvas, configure per-control validation and cross-page branching logic, preview the working form, and export/import the design as JSON. There is no backend, no authentication, and no multi-user requirement in v1.

A second goal, stated by the user, is to evaluate whether vibe coding can produce a production-ready frontend product. v1 is deliberately scoped to prove the full loop (design → preview → export → import) end-to-end with enough real surface area to judge that question honestly.

### 1.1 Stakeholder decisions (from brainstorming)

| # | Decision                                    | Choice                                                    |
|---|---------------------------------------------|-----------------------------------------------------------|
| 1 | Build phasing                               | MVP first, then extend                                    |
| 2 | Consumption model                           | Monorepo: `packages/designer` library + `apps/demo` app   |
| 3 | UI component library                        | Ant Design (default blue theme)                           |
| 4 | Canvas layout model                         | 12-column responsive grid with snap                       |
| 5 | MVP scope                                   | Approved as proposed (see §3)                             |
| 6 | Persistence                                 | localStorage auto-save + explicit JSON import/export      |
| 6 | State management                            | Zustand (one store for designer, one for runtime)         |
| 6 | Drag-and-drop                               | dnd-kit                                                   |
| 6 | Build tooling                               | Vite + pnpm workspaces + TypeScript                       |
| 6 | Testing                                     | Vitest (unit) + Playwright (e2e) — no coverage target in v1 |
| 6 | Logic-rule UI (v1)                          | Conditions list with structured editors (no visual graph) |
| 7 | Rule engine structure                       | Formal AST + pure-TS interpreter                          |
| 7 | Control type extensibility                  | Plugin registry from day 1                                |

### 1.2 Non-goals (explicit for v1)

- No backend, no auth, no multi-user, no server-side persistence.
- No visual node-graph logic editor (the AST supports it; the graph UI is v2).
- No advanced control types: click-map, matrix/grid, ranking, autosum, file upload, camera/video capture, barcode/QR scan, GPS location, radio-with-custom-images.
- No theming system beyond a single accent colour, font, page background, and width per questionnaire.
- No i18n, no dark mode, no WCAG audit (basic a11y only — see §9.7).
- No versioning, no collaboration, no autosave to a remote.

---

## 2. System architecture

### 2.1 Repo layout

Monorepo, pnpm workspaces, TypeScript throughout.

```
qnndesigner/
├── package.json                 (root; workspaces: packages/*, apps/*)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .eslintrc.cjs, .prettierrc
├── packages/
│   └── designer/                @qnn/designer — the reusable library
│       ├── package.json         exports QuestionnaireDesigner, QuestionnaireRenderer,
│       │                                  schema types, rule engine
│       ├── vite.config.ts       (lib mode; ESM + .d.ts)
│       ├── src/
│       │   ├── index.ts         public surface
│       │   ├── schema/          JSON schema + Zod validators + types
│       │   ├── registry/        control plugin registry + built-in controls
│       │   │   └── controls/    text, textbox, datetime, single, multi, rating, slider
│       │   ├── designer/        the 3-pane editor
│       │   │   ├── Designer.tsx
│       │   │   ├── panes/       Palette, Canvas, Properties, RulesTab, PagesTab
│       │   │   └── hooks/       useDesignerStore, useCanvasDnd, useUndoRedo
│       │   ├── runtime/         preview/render engine (standalone)
│       │   │   ├── Renderer.tsx QuestionnaireRenderer (host-facing)
│       │   │   └── engine.ts    page guards, rule evaluation, state
│       │   ├── rules/           AST types, operators, interpreter, builder utils
│       │   ├── store/           Zustand stores (designer, runtime)
│       │   └── io/              import/export, localStorage hooks, schema migrations
│       └── tests/               Vitest unit tests
└── apps/
    └── demo/                    the deployable demo app
        ├── package.json         depends on @qnn/designer via workspace:*
        ├── vite.config.ts
        └── src/
            ├── App.tsx          routes: /design, /preview
            ├── pages/Designer.tsx, Preview.tsx
            └── main.tsx
```

### 2.2 Public library surface

```ts
// @qnn/designer (index.ts)
export { QuestionnaireDesigner } from './designer/Designer';
export { QuestionnaireRenderer } from './runtime/Renderer';

export type {
  Questionnaire, Page, Row, ControlNode, Rule, Expr, Action,
  ThemeSettings, PageStyle, ControlStyle,
} from './schema';

export { evalExpr, applyActions, createEngine } from './rules';
export { exportQuestionnaire, importQuestionnaire } from './io';
export { ControlRegistry, defaultRegistry, type ControlPlugin } from './registry';
```

Host apps embed either component:

```tsx
<QuestionnaireDesigner
  initial={jsonOrUndefined}
  plugins={[...customPlugins]}    // optional; merged with built-ins
  onChange={(q) => ...}
  onExport={(q, includeLogic) => ...}
/>

<QuestionnaireRenderer
  questionnaire={jsonOrObject}
  plugins={[...customPlugins]}
  onSubmit={(answers) => ...}
  persistDraft={true}              // default true; uses localStorage keyed by questionnaire.id
/>
```

### 2.3 Module boundaries (no cycles)

- `runtime` has **zero** imports from `designer`.
- `registry` has zero imports from `designer` or `runtime`.
- `rules` has zero React imports — pure TypeScript.
- Dependency direction: `designer → { registry, rules, schema, store, io }`, `runtime → { registry, rules, schema, store }`.

Rationale: a host app can ship the renderer bundle without the editor (smaller production payload) by importing from `@qnn/designer/runtime` only (a sub-path export).

---

## 3. MVP scope (v1)

### 3.1 Designer shell

- 3-pane layout: Palette (left), Canvas (centre), Properties (right).
- Multi-page: add, rename, reorder, delete pages.
- 12-column grid canvas with drag-drop and snapping.
- Resize column span; reorder rows.
- Page-level styling: background colour, accent colour, font family, max content width.
- Control-level styling: column span, label size/colour, help text.
- Undo / redo (session-scoped).

### 3.2 Control types (7 built-ins)

| type       | Ant widget used in Renderer       | Notable props                                      | Answerable |
|------------|-----------------------------------|----------------------------------------------------|:----------:|
| `text`     | `<Typography>` / HTML block       | `html: string`                                     |     no     |
| `textbox`  | `<Input>` or `<Input.TextArea>`   | `mode: 'text'\|'textarea'`, `rows`, `minLen`, `maxLen` |  yes    |
| `datetime` | `<DatePicker>` / `<TimePicker>`   | `mode: 'date'\|'time'\|'datetime'`, `format`        |    yes     |
| `single`   | `<Radio.Group>` or `<Select>`     | `renderAs: 'radio'\|'dropdown'`, `options[]`        |    yes     |
| `multi`    | `<Checkbox.Group>`                | `options[]`, `minChecked`, `maxChecked`             |    yes     |
| `rating`   | `<Rate>`                          | `count` (default 5), `allowHalf`                    |    yes     |
| `slider`   | `<Slider>`                        | `min`, `max`, `step`, `marks?`                      |    yes     |

### 3.3 Common control properties

- `alias` — machine name, unique per questionnaire, `^[a-zA-Z_][a-zA-Z0-9_]*$`.
- `friendlyName` — label shown in error messages.
- `required` — boolean flag.
- `helpText` — optional description under the label.
- `placeholder` — optional where applicable.
- `layout.span` — 1..12, column span within its row.
- `style` — width, label colour, label size.

### 3.4 Logic (v1 shape)

- **Per-control validation** — required, min/max length, min/max value, regex pattern, custom error message.
- **Branching rules** — `WHEN [expr] THEN [action+]` with AND/OR grouping, via structured drop-down builders. Cross-page supported (rules reference any alias).
- **Supported actions** — show/hide control, show/hide page (skip), gotoPage override, require/unrequire, fail with message.

### 3.5 Preview

- Runs in-app via `<QuestionnaireRenderer>`.
- Validation and branching live.
- Next / Prev with per-page guard.
- Responsive: desktop + mobile (grid collapses to single column below the `sm` breakpoint).
- Reachable as a modal from the designer (live against current draft) and as `/preview` route in the demo app.

### 3.6 JSON import / export

- Export modal: file name, "Include logic rules" toggle (default on), Export button.
- Import file picker: accepts `.json`, Zod-validates, runs migrations if `schemaVersion < 1`, rejects unknown-future versions with a clear message.
- Exported file is a `Questionnaire` verbatim; re-importing it round-trips byte-equivalent modulo `meta.updatedAt`.

### 3.7 What is designed-for but NOT built in v1

- Advanced controls: click-map, matrix/grid, ranking, autosum, file upload, camera/video, barcode/QR, GPS, radio-with-images.
- Visual node-graph logic editor (React Flow).
- Dark mode, i18n, full accessibility audit, theme presets, autosave/versioning.
- Tablet / phone preview viewports as designer toggles (mobile responsiveness is present at runtime but the designer itself is desktop).

The v1 data model, registry, and rule engine are shaped so these additions don't force rewrites. See §11.

---

## 4. Data model (JSON schema)

All TypeScript types live in `@qnn/designer/schema`. Zod schemas mirror them for runtime validation on import.

### 4.1 Top-level document

```ts
type Questionnaire = {
  schemaVersion: 1;
  id: string;                         // uuid v4
  title: string;
  theme: ThemeSettings;
  pages: Page[];                      // ordered
  rules: Rule[];                      // cross-page rules live at top level
  meta: {
    createdAt: string;                // ISO 8601
    updatedAt: string;                // ISO 8601
    appVersion: string;               // @qnn/designer version stamp
  };
};

type ThemeSettings = {
  accentColor: string;                // hex, default '#1677FF'
  fontFamily: string;                 // CSS font-family, default system stack
  pageBackground: string;             // hex, default '#FFFFFF'
  contentMaxWidth: number;            // px, default 960
};
```

### 4.2 Page and row

```ts
type Page = {
  id: string;
  name: string;
  rows: Row[];
  style?: PageStyle;                  // overrides theme for this page
};

type Row = {
  id: string;
  cols: ControlNode[];                // sum(layout.span) <= 12
};

type PageStyle = Partial<{
  background: string;                 // hex
  paddingY: number;                   // px
  paddingX: number;                   // px
}>;
```

### 4.3 Control node

```ts
type ControlNode<TProps = unknown> = {
  id: string;
  type: ControlType;                  // matches a registered plugin.type
  alias: string;
  friendlyName: string;
  required: boolean;
  helpText?: string;
  placeholder?: string;
  layout: { span: number };           // 1..12
  style?: ControlStyle;
  props: TProps;                      // shape determined by plugin
  validation?: PerControlValidation;
};

type ControlStyle = Partial<{
  labelColor: string;
  labelSize: number;                  // px
  widthOverride: number;              // px override of column width
}>;

type PerControlValidation = Partial<{
  minLen: number;
  maxLen: number;
  minValue: number;
  maxValue: number;
  pattern: string;                    // regex
  message: string;                    // custom error text
}>;
```

`ControlPropsByType` is a discriminated union of each built-in plugin's props shape (documented in §5.4).

### 4.4 Rule (AST)

```ts
type Rule = {
  id: string;
  name?: string;                      // optional, for debugging
  when: Expr;                         // boolean expression
  then: Action[];                     // effects when `when` is true
  else?: Action[];                    // effects when false (inverse)
};

type Expr =
  | { op: 'const'; value: string | number | boolean | null }
  | { op: 'ref'; alias: string }
  | { op: 'and' | 'or'; args: Expr[] }
  | { op: 'not'; arg: Expr }
  | { op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'; args: [Expr, Expr] }
  | { op: 'in' | 'notIn'; value: Expr; set: Expr }
  | { op: 'matches'; value: Expr; pattern: string }
  | { op: 'empty' | 'notEmpty'; arg: Expr }
  | { op: '+' | '-' | '*' | '/'; args: [Expr, Expr] };

type Action =
  | { kind: 'show' | 'hide'; target: { alias: string } | { pageId: string } }
  | { kind: 'require' | 'unrequire'; target: { alias: string } }
  | { kind: 'gotoPage'; pageId: string }
  | { kind: 'skipPage'; pageId: string }
  | { kind: 'fail'; target?: { alias: string }; message: string };
```

### 4.5 Import / export envelope

The exported JSON file is a `Questionnaire`. When the "Include logic rules" toggle is on (default), it is written verbatim. When off, the export writes `rules: []` and omits each control's `validation` block; the top-level `required: boolean` on each control is preserved (it's a structural property of the control, not part of the `validation` block). Re-import restores fully-typed state via Zod — defaulting `rules` to `[]` and `validation` to `undefined` when absent.

### 4.6 Migrations

`io/migrations.ts` maps `schemaVersion: N → N+1`. v1 is version `1`; no prior versions exist. If an import has `schemaVersion > 1`, reject with: "This file was created with a newer version of QNN Designer." If `< 1`, reject with: "Unrecognised schema version."

---

## 5. Control registry (plugin API)

The registry is the single extension point for control types. The editor and runtime never `switch (node.type)`; they iterate the registry.

### 5.1 Plugin interface

```ts
interface ControlPlugin<TProps = unknown> {
  type: string;                         // matches ControlNode.type
  category: 'content' | 'input' | 'advanced';
  label: string;                        // palette label
  icon: ReactNode;                      // palette icon
  description: string;                  // tooltip

  defaultProps: () => TProps;
  defaultNode: () => Partial<ControlNode<TProps>> & { props: TProps };

  PaletteItem?: React.FC;               // optional custom draggable
  CanvasPreview: React.FC<{ node: ControlNode<TProps> }>;
  PropertyEditor: React.FC<{
    node: ControlNode<TProps>;
    onChange: (patch: Partial<ControlNode<TProps>>) => void;
    otherAliases: string[];
  }>;
  Renderer: React.FC<{
    node: ControlNode<TProps>;
    value: unknown;
    onChange: (v: unknown) => void;
    error?: string;
    disabled?: boolean;
  }>;

  validate?: (node: ControlNode<TProps>, value: unknown,
              ctx: ValidationCtx) => string | null;  // null = valid
  toAnswerValue?: (value: unknown) => unknown;       // what goes into rule state
  isValueEmpty?: (value: unknown) => boolean;        // overrides default emptiness check
  isAnswerable: boolean;                              // false = pure content
}
```

### 5.2 Registry class

```ts
class ControlRegistry {
  register(plugin: ControlPlugin): void;              // throws on duplicate unless merge=true
  override(plugin: ControlPlugin): void;              // replaces a plugin by type
  get(type: string): ControlPlugin | undefined;
  all(): ControlPlugin[];
}

export const defaultRegistry: ControlRegistry;       // pre-registered with the 7 built-ins
```

The host-app `plugins` prop on `<QuestionnaireDesigner>` / `<QuestionnaireRenderer>` creates a per-instance derivative of `defaultRegistry` with the extras merged (same `type` replaces). The library never mutates `defaultRegistry` at runtime.

### 5.3 Register-time validation

`register()` throws at registration time if:
- `plugin.type` is empty or duplicates an existing registered plugin (without calling `override`).
- `plugin.Renderer` or `plugin.PropertyEditor` is missing.
- `plugin.isAnswerable` is `true` but `plugin.CanvasPreview` is missing.

The `toAnswerValue` and `isValueEmpty` callbacks are optional; when omitted, the engine uses pass-through (`v => v`) and a default emptiness check (see §7.5). Plugins whose native value shape needs different semantics must supply them — this is a doc-level contract, not strictly enforced at registration.

Failing loudly at registration (not later at render) is intentional: plugin bugs surface at app-bootstrap.

### 5.4 Built-in plugin props shapes (v1)

```ts
// text
type TextProps = { html: string };                        // isAnswerable: false

// textbox
type TextboxProps = { mode: 'text' | 'textarea'; rows?: number };

// datetime
type DatetimeProps = {
  mode: 'date' | 'time' | 'datetime';
  format: string;                                         // e.g. 'DD-MM-YYYY', 'HH:mm'
};

// single
type SingleProps = {
  renderAs: 'radio' | 'dropdown';
  options: { value: string; label: string }[];
};

// multi
type MultiProps = {
  options: { value: string; label: string }[];
};

// rating
type RatingProps = { count: number; allowHalf: boolean };

// slider
type SliderProps = {
  min: number;
  max: number;
  step: number;
  marks?: Record<number, string>;
};
```

### 5.5 Alias uniqueness

The registry does not police aliases. The designer store recomputes `otherAliases` on every mutation and the `PropertyEditor` surfaces an inline error if the alias is empty, malformed, or duplicated. Import also rejects on duplicates. Rules reference controls by alias (not `id`), so rename cascades are explicit (and logged when done).

---

## 6. Canvas model (grid, drag-drop, snapping)

### 6.1 Layout semantics

Each page is an ordered list of rows. Each row is an ordered list of `ControlNode`s, with `layout.span` columns summing to ≤ 12. The grid renders via CSS grid:

```css
.qnn-row { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px; }
.qnn-cell { grid-column: span var(--span); }
@media (max-width: 640px) { .qnn-row { grid-template-columns: 1fr; } }
```

The `640px` breakpoint is themeable via a CSS variable (`--qnn-breakpoint-sm`).

### 6.2 Three gestures (dnd-kit)

**G1. Palette → Canvas (new node).** Drop targets:
- Between rows (horizontal insertion strip between each pair of rows and at top/bottom) → creates a new row at that index, span 12.
- Inside an existing row (either side of each cell) → inserts a cell into that row using `plugin.defaultNode().layout.span` (clamped to remaining free span; if the row has no free columns, the target is disabled).

**G2. Canvas → Canvas (move).** Same drop targets as G1. Moving the last cell out of a row deletes the row.

**G3. Resize.** A handle on the right edge of a selected cell. Dragging resizes `layout.span` in whole-column increments. Neighbour cells in the same row compress proportionally but never below span 1; the resize clamps if it would push any neighbour below 1.

### 6.3 What "snapping" means concretely

- Horizontal snap = whole-column increments (1..12). A floating badge next to the cursor shows the current span ("6 / 12").
- Vertical snap = row boundaries. A 2 px blue line indicator renders between rows while dragging. There are no sub-pixel drop targets.
- Keyboard equivalents (via dnd-kit): arrow keys move selection; `Shift+←/→` changes span ±1; `Alt+↑/↓` moves the cell between rows.

### 6.4 Selection

- Click a cell → selects (right pane switches to its `PropertyEditor`).
- `Esc` / click empty canvas → deselect (right pane shows page-level properties).
- `Delete` / `Backspace` → deletes selected cell; row collapses if empty.
- Multi-select is out of v1. The store supports it internally so v2 can enable it.

### 6.5 Undo / redo

Zustand + [`zundo`](https://github.com/charkour/zundo) for temporal history. Every user mutation pushes one entry; text-typing in property inputs is debounced 500 ms so each word isn't a separate undo step. History is session-scoped (not persisted).

### 6.6 Cross-page drag

The page tab bar lives above the canvas. Dragging a cell over a page tab for > 400 ms activates that tab (hold-to-switch). Dropping in the new page moves the node across pages; its `id` stays stable and rules referencing its `alias` still resolve. The mutation records both source and destination page ids in the undo entry.

### 6.7 Over-span and full-row behaviour

- Over-span drop: if a default-span-6 plugin is dropped into a row with only 4 columns free, the span clamps to 4.
- Full row (span total = 12): horizontal in-row drop targets disable; only between-row targets remain.
- Dragging over the right pane: no-op (only canvas is a drop target).
- Dropping outside the canvas: cancels. For a move, the node stays put.

---

## 7. Rule engine & preview runtime

### 7.1 Runtime state

```ts
type RuntimeState = {
  answers: Record<Alias, unknown>;
  visibility: Record<Alias | PageId, boolean>;
  requireOverrides: Record<Alias, boolean | undefined>;  // undefined = use node.required
  currentPageId: PageId;
  history: PageId[];
  nextOverride: PageId | null;
  validationErrors: Record<Alias, string>;
};
```

### 7.2 Expression interpreter

`evalExpr(expr: Expr, state: RuntimeState): Value` is a pure recursive function. Guarantees:

- `ref` missing or hidden → `undefined`.
- Any comparison with `undefined` on either side → `false` (never throws).
- `and` short-circuits on first `false`, `or` on first `true`.
- `in` / `notIn` require `set` to evaluate to an array (multi-choice answers) or a string; otherwise `false`.
- Arithmetic on non-numbers → `NaN`; `NaN` compared to anything → `false`.
- `matches`: regex is compiled lazily and cached by pattern string. Invalid regex pattern → `false`.
- `empty` → `true` when the argument is `undefined`, `null`, `''`, or an empty array; `false` otherwise. `notEmpty` is its inverse. This is the single source of truth for "empty" throughout the engine — plugins whose native value shape needs a different rule override via `plugin.isValueEmpty` (used at §7.5, not here).
- **The interpreter is total: it never throws on bad data.** Static warnings (unknown alias, obvious type mismatch) are shown in the designer's Rules tab at edit time, not at runtime.

### 7.3 Action application

Per reactive tick, for each rule in **document order**:
- If `when` evaluates true, apply `then`; else apply `else` (if present).
- `show` / `hide` → set `visibility[target]`. Last write wins (later rules override earlier ones — an intentional, document-order precedence).
- `require` / `unrequire` → set `requireOverrides[alias]`. Effective-required = `override ?? node.required`.
- `gotoPage` → set `nextOverride`. Consumed and cleared when the user clicks Next.
- `skipPage` → marks a page hidden. The next-page resolver skips over hidden pages.
- `fail` → contributes to `validationErrors[alias]` (or a page-scoped slot if `target` omitted).

### 7.4 Reactive tick

On every `answers` change the runtime does **one pass** (not fixed-point iteration in v1):

1. Run all rules once against the *previous* visibility.
2. Merge the resulting `visibility`, `requireOverrides`, `validationErrors` into state.
3. Re-render. Hidden controls retain their last answer in state but are treated as `undefined` by rule evaluation, keeping rules idempotent.

**Documented v1 limitation:** rule B that depends on a value hidden by rule A may still read that stale value. Single-pass is the accepted trade-off — simpler mental model, no infinite-loop risk. Revisited in v2 (fixed-point with cycle detection is planned).

### 7.5 Page navigation

- **Prev** — pops `history`. Disabled on the first visited page.
- **Next** — page-exit validation:
  - Every visible control with effective-required = true must have a non-empty value. "Non-empty" is `plugin.isValueEmpty(value) === false`; the default `isValueEmpty` returns `true` for `undefined`, `null`, `''`, and empty arrays. Numeric `0` and boolean `false` are considered non-empty.
  - Each plugin's `validate()` runs and contributes messages.
  - `fail` actions targeting controls on this page block navigation.
  - If all pass: resolve next page — `nextOverride` wins; else next visible page in order; else finish.
- **Submit** — on the last visible page, Next becomes Submit. `onSubmit(answers)` fires; if `persistDraft` is enabled, the runtime draft is cleared.

### 7.6 Rules tab UI (v1)

The right pane gets a **Rules** tab when the page or questionnaire (not a specific control) is selected. Each rule renders as a compact card with structured drop-down editors for condition operands, operators, and action targets. Example mockup:

```
┌─────────────────────────────────────────────────────────────┐
│ Rule: "Hide gender for company respondents"        ⋮ ✎ 🗑  │
│ WHEN                                                        │
│   [respondent_type ▼] [is ▼] ["company" ▼]                  │
│   AND                                                       │
│   [country         ▼] [is in ▼] [US, CA, UK ▼]              │
│ THEN                                                        │
│   [hide ▼] [field: gender ▼]                                │
│   [skip page ▼] [page: demographics ▼]                      │
└─────────────────────────────────────────────────────────────┘
```

A "Test panel" at the top of the Rules tab lets the designer set sample answers and see which rules evaluate true/false live. No free-text expressions, no `eval`, no parsing. The AST is edited directly by the UI.

---

## 8. Persistence, import/export

### 8.1 localStorage

- Designer draft at key `qnn.designer.draft.v1`, written on every mutation with a 300 ms debounce.
- On mount, if a draft exists, show a dismissible banner: *"Restored unsaved work from {timestamp}. [Discard]"*. No modal — starting to edit is implicit acceptance.
- Runtime in-progress answers at key `qnn.runtime.draft.{questionnaireId}.v1`, cleared on `onSubmit` or "Start over."
- `persistDraft` prop on `<QuestionnaireRenderer>` disables runtime persistence (default on).
- On quota-exceeded, silently drop to in-memory mode and surface a banner: *"Auto-save paused; export before closing."* Never throws.

### 8.2 Import / export

- **Export** — top-bar button opens a modal: file name input, "Include logic rules" checkbox (default on), Export. JSON is pretty-printed. When "Include logic rules" is off, the export omits `rules[]` and each control's `validation` block per §4.5; `required` on each control is preserved regardless.
- **Import** — top-bar file picker accepts `.json`. Flow: parse → Zod-validate → run forward migrations if needed → commit to designer store. On any failure, surface a toast with the specific Zod error path, e.g. `pages[2].rows[0].cols[1].alias: Required`. No silent data loss.

### 8.3 Schema versioning

- `schemaVersion: 1` is v1. Any breaking change bumps the version and adds a `v1 → v2` forward migration in `io/migrations.ts`.
- Imports of unknown-future versions are rejected with: *"This file was made with a newer version of QNN Designer."*
- Imports of unrecognised (non-integer, missing, < 1) versions are rejected with: *"Unrecognised schema version."*

---

## 9. Supporting concerns

### 9.1 Demo app (`apps/demo`)

- Routes: `/` (redirects to `/design`), `/design`, `/preview`.
- `/design` renders `<QuestionnaireDesigner>` with a top bar: Preview, Export, Import, Undo, Redo, page tabs.
- `/preview` renders `<QuestionnaireRenderer>` against the current designer draft (read from localStorage). `onSubmit` shows the resulting `answers` JSON in a modal for demo purposes.
- Preview is also reachable as a modal overlay from the designer's Preview button, so draft state is always live.

### 9.2 Testing

**Vitest units** (`packages/designer/tests/`):
- `rules/interpreter` — one test per operator, plus 3–5 realistic expression trees.
- `rules/engine` — action application precedence, `gotoPage` / `skipPage` resolution, required overrides.
- `schema/validate` — happy path + each rejection case for malformed imports.
- `io/migrations` — round-trip export → import preserves the document byte-equivalent (modulo `meta.updatedAt`).
- `store/designer` — add / move / resize / delete mutations, undo / redo correctness.

**Playwright e2e** (`apps/demo/tests/`), three scenarios:
1. Build a 2-page form (4 controls), export, clear, re-import, preview — answers round-trip.
2. Add a rule *"if `age < 18` hide `smoking_pref`"* — verify in preview hiding kicks in reactively.
3. Add a `gotoPage` rule on page 1 — verify Next skips as expected.

No coverage target in v1. Coverage target set when v2 starts.

### 9.3 Error handling & boundaries

- **Designer canvas** wrapped in a React error boundary. A thrown render error in a plugin's `CanvasPreview` replaces that cell with a *"⚠ Could not render (type: X)"* placeholder. The rest of the canvas keeps working; the user can select and fix the bad node in Properties.
- **Runtime** similarly wrapped. A thrown `Renderer` error replaces that control with an error badge and logs to `console.error`. Validation and Next still run.
- **Plugin contract** — missing `Renderer` or `PropertyEditor` fails loudly at `registry.register()` time.
- The rule interpreter never uses try/catch to swallow errors — it's total by construction (§7.2).

### 9.4 Accessibility (v1 floor)

- All dnd-kit gestures have keyboard equivalents (provided by dnd-kit's sensors, verified in tests).
- All Ant form controls in `Renderer`s get `label` and `aria-describedby` (error / help).
- Visible focus ring on all interactive elements.
- Colour contrast ≥ 4.5:1 on text.
- No color-only state (required / error always accompanied by a glyph or text).
- Screen-reader audit is deferred to v2.

### 9.5 Performance (v1 floor)

- Questionnaires of up to 100 controls across 20 pages with 50 rules must re-render in < 16 ms on a mid-range laptop (baseline, not stress).
- `evalExpr` memoised per rule by `(rule.id, answers-hash)` via a small cache cleared on each tick.
- `CanvasPreview` components are `React.memo`-ed and keyed by `node.id`.

### 9.6 Theming (v1 floor)

- Accent, font, page background, content max-width — editable in a Page/Theme properties panel.
- Ant Design's `ConfigProvider` receives `{ token: { colorPrimary: theme.accentColor, fontFamily: theme.fontFamily } }`.
- No dark mode in v1. The Ant theme scaffolding is compatible with adding it later.

### 9.7 Security considerations

- The `text` plugin stores `html: string`. In v1 we sanitise with [`dompurify`](https://github.com/cure53/DOMPurify) before rendering, and we never use `dangerouslySetInnerHTML` outside this sanitised path.
- No `eval`, `new Function`, or string-based expression evaluation anywhere. The rule interpreter operates only on typed AST nodes.
- Imported JSON is treated as untrusted: Zod validation rejects unknown keys at the top level, pages, controls, and rules (strict mode). Unknown plugin `type` values are rendered as the error-placeholder (§9.3), never fall through to `dangerouslySetInnerHTML`.

---

## 10. Key tradeoffs and risks (flagged)

| Area | Tradeoff / Risk | Mitigation |
|------|-----------------|------------|
| Canvas layout | Chose 12-col grid over pixel canvas; loses pixel-level freedom | Spec: "x,y" semantics are (row, col, span); click-map in v2 uses pixel coords *inside its own control* |
| Rule evaluation | Single-pass (no fixed-point); stale reads possible across dependent rules | Documented v1 limit; v2 introduces fixed-point with cycle detection |
| Control extensibility | Plugin registry adds ~1 day of scaffolding up front | Without it, every v2 control type forces core edits |
| Logic UI | Rules list (not graph) in v1 | Same AST powers the v2 graph editor; migration is UI-only |
| Persistence | localStorage is per-browser and unlimited-ish | Quota-exceeded path is graceful (in-memory fallback, banner) |
| `text` plugin HTML | User-supplied HTML is a potential XSS vector | dompurify sanitisation, no other `dangerouslySetInnerHTML` |
| Ant aesthetic | Distinct "Ant look" that's harder to differentiate from other Ant apps | Accepted given the "professional commercial blue" brief; theme token path preserved for later restyling |
| Vibe coding viability | MVP tests whether this scope is buildable with AI-generated code end-to-end | Phased build + localStorage + plugin registry all reduce per-step complexity and give mid-build checkpoints |

---

## 11. v2+ extensibility notes (designed-for, not built)

- **New control types.** Drop a plugin file into `registry/controls/` and `register()`. Built-in plugins and the editor/runtime do not change. Camera / GPS / barcode controls supply mobile-first `Renderer`s using Web APIs or `@capacitor/*`.
- **Visual flow editor.** Replaces the Rules tab UI with a React Flow canvas. Both edit the same `Rule[]` AST; migration is UI-only. Node-graph-to-AST conversion is a tree-flatten.
- **Matrix / grid control.** Registered as one plugin whose `props` hold a nested `ControlNode[][]`. Registry lookup supports recursive types because control nodes are schema-typed not type-registered.
- **Autosum.** Plugin whose `props` hold a reference list of aliases plus an arithmetic `Expr`. The same interpreter evaluates it. No new engine.
- **Click-map.** Plugin whose `props` hold `{ imageUrl, hotspots: { id, shape, coords, value }[] }`. `Renderer` handles hotspot math internally.
- **Fixed-point rule evaluation.** Replace single-pass with iterate-until-stable + cycle detection in `rules/engine`. `Rule` AST unchanged.
- **Multi-select in canvas.** Designer store already supports a set of selected ids; enable in v2 with shift-click and marquee.

---

## 12. Acceptance criteria for v1

A build is v1-done when **all** of the following are true:

1. `pnpm install && pnpm -r build` produces `@qnn/designer` as an ESM + types package and a working `apps/demo` static build.
2. In `apps/demo`, a user can:
   - Drag every built-in control type onto the canvas from the palette.
   - Resize, move, delete, and configure each one in the Properties pane.
   - Add, rename, reorder, and delete pages.
   - Create at least one branching rule and at least one validation rule via the Rules tab.
   - Use the Test panel to verify rule truth against sample answers.
   - Hit Preview and complete the form; branching / validation behave correctly.
   - Export the design (with and without logic), re-import it, and see the restored state match.
3. The Vitest suite passes (see §9.2).
4. The Playwright suite passes its 3 scenarios (see §9.2).
5. Designer and runtime are free of console errors on a clean build.
6. No `eval`, no `new Function`, no unsanitised `dangerouslySetInnerHTML` outside the `text` plugin's dompurify path.
7. Grid canvas collapses to single-column below the `sm` breakpoint; this is visually verified on a mobile viewport in preview.

---

## 13. Open items tracked for the implementation plan

These are minor follow-ons for the writing-plans skill, not design gaps:

- Exact file-by-file plan breakdown per package.
- CI workflow (GitHub Actions / GitLab CI) — deferred until the user specifies the host.
- Deployment target for the demo app (Netlify / Vercel / static S3 / Pages) — deferred.
- Lint/format config specifics (`airbnb` vs `standard` vs custom) — will default to `@typescript-eslint/recommended` + `eslint-plugin-react` unless user indicates otherwise in the plan phase.
- Exact dompurify configuration profile for the `text` plugin.
