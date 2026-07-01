# Arithmetic field control — design

**Date:** 2026-04-20
**Status:** Approved (brainstorming complete, ready for implementation planning)

## Goal

Add a new `arithmetic` control plugin that lets designers build a formula
over other fields in the questionnaire and displays the computed value at
runtime. The formula is a nested expression tree assembled in the Properties
pane via an inline builder.

## Scope decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Expression complexity | **Nested groups with parentheses** (full tree, standard precedence falls out of tree shape) |
| Operand source | **Any control, coerced to `Number(...)`** — `rating`, `slider`, `textbox`, and other arithmetic fields; non-numeric strings → `0` |
| Chaining arithmetic fields | **Allowed**, with runtime cycle detection |
| Display formatting | Configurable decimal places + optional prefix + optional suffix |
| Builder placement | Inline in the Properties pane (same surface as existing control editors) |

## Non-goals

- No dedicated "number input" control in this scope. Users enter numbers in
  `textbox` today; arithmetic coerces.
- No unary operators, functions (`min`, `max`, `round`), or per-operator
  short-circuiting. Only `+ - * /`.
- No runtime editing of the formula. Designers configure it, runtime
  displays it.

## Architecture

### New plugin

File: `packages/designer/src/registry/controls/arithmetic.tsx`

```ts
export interface ArithmeticProps {
  /** Root of the expression tree. `null` until the designer configures it. */
  expression: Expr | null;
  /** Decimal places for display via `toFixed`. Undefined = show raw. */
  decimals?: number;
  /** Literal string prefixed to the formatted value (e.g. "$"). */
  prefix?: string;
  /** Literal string suffixed after the formatted value (e.g. "kg"). */
  suffix?: string;
}

const arithmeticPlugin: ControlPlugin<ArithmeticProps> = {
  type: 'arithmetic',
  category: 'advanced',
  label: 'Arithmetic',
  icon: <CalculatorOutlined />,
  description: 'Compute a value from other fields and display it.',
  isAnswerable: false,

  defaultProps: () => ({ expression: null }),
  defaultNode: () => ({
    type: 'arithmetic',
    friendlyName: 'Total',
    required: false,
    layout: { span: 12 },
    props: { expression: null },
  }),

  CanvasPreview, PropertyEditor, Renderer,
};
```

Registered in the default registry at
`packages/designer/src/registry/controls/index.ts`.

### Schema reuse

No new schema types. The plugin's `expression` prop uses the existing `Expr`
union from `packages/designer/src/schema/types.ts`, specifically:

- `{ op: 'ref'; alias: Alias }`
- `{ op: 'const'; value: number }` (we restrict `value` to number at the
  plugin layer; the schema `Expr.const.value` is `string | number | boolean |
  null` and validates loosely via `z.unknown()`)
- `{ op: '+' | '-' | '*' | '/'; args: [Expr, Expr] }`

Any other `Expr` variant (logical ops, comparisons, `in`, `matches`, etc.)
is disallowed by the plugin's TypeScript types and the builder will never
emit them. The evaluator silently treats unexpected nodes as `0`.

### Evaluator

New pure module: `packages/designer/src/registry/controls/arithmetic/evaluate.ts`

```ts
export type ArithNode =
  | { op: 'const'; value: number }
  | { op: 'ref'; alias: string }
  | { op: '+' | '-' | '*' | '/'; args: [ArithNode, ArithNode] };

export function evalArith(node: ArithNode | null, answers: Record<string, unknown>): number | null {
  if (!node) return null;
  const v = evalInner(node, answers);
  return Number.isFinite(v) ? v : null;
}
```

Rules:
- `const`: `Number(value)` — NaN becomes `0`.
- `ref`: `Number(answers[alias])` — NaN/undefined becomes `0`.
- Binary: recurse both sides; on `/` with RHS `=== 0` return `NaN` (which
  collapses to `null` at the top level).

### Cycle detection

File: `packages/designer/src/registry/controls/arithmetic/cycles.ts`

```ts
export function findArithmeticCycles(
  questionnaire: Questionnaire,
): Set<string>;  // returns aliases of arithmetic fields that participate in a cycle
```

Builds a directed graph: for each arithmetic control, collect the set of
`ref` aliases in its expression. Edge = "depends on". Run Tarjan /
iterative DFS, return the union of all SCCs with size > 1 (plus self-loops).

At runtime, the arithmetic `Renderer` calls this once per evaluation pass
(the result is cheap to compute and page-scoped state changes are
infrequent) and, if the current field's alias is in the cycle set, renders
`—` without evaluating. A `console.warn` is emitted once per cycle detection
to help the designer spot the misconfiguration.

Non-cyclic arithmetic fields evaluate normally even when other fields on
the page are cyclic.

### Runtime read of `answers`

The plugin's `Renderer` needs more than its own `value`; it needs every
referenced alias's value. The existing `ControlPluginRendererProps` passes
only `{ node, value, onChange, error, disabled }`.

**Change:** extend the type with one optional field:

```ts
export interface ControlPluginRendererProps<TProps> {
  node: ControlNode<TProps>;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  disabled?: boolean;
  /** Full answer map, for cross-field computation. Populated by the
   *  framework; existing plugins can ignore it. */
  answers?: Record<string, unknown>;
}
```

`Renderer.tsx` passes `answers={state.answers}` to every `ControlField`.
Existing plugins compile unchanged (the prop is optional).

The arithmetic Renderer also needs the full questionnaire to run cycle
detection. For that it reads from the runtime store via a new optional
prop `questionnaire?: Questionnaire` on `ControlPluginRendererProps`,
populated the same way.

Alternative considered: inject both via React context so the plugin
signature stays lean. Rejected for this iteration because it adds a
framework concept for a single plugin; two optional props is lighter.

### Writing the computed value to `answers`

After the arithmetic Renderer computes `result`, a `useEffect` fires
`onChange(result)` iff `result !== value` — doing the write in an effect
rather than inline during render avoids the React "setState during render"
anti-pattern. This keeps `answers[alias]` in sync so rules and downstream
arithmetic fields see the current number. Dependency guard on the effect
(`[result, value]`) guarantees we don't loop.

## Builder UI

Component: `ArithmeticBuilder` in
`packages/designer/src/registry/controls/arithmetic/ArithmeticBuilder.tsx`.

Rendered inside `PropertyEditor` below the standard common fields.

### Node rendering

Each `ArithNode` is rendered by a recursive `<NodeEditor node onChange />`
component. Three cases:

**Constant node** — single compact row:

```
┌──────────────────────────────────────────┐
│ [Number ▼]  [ 0 ]                    ⋯  │
└──────────────────────────────────────────┘
```

- Left segment: `Select` with options `Field` / `Number` / `Group`.
  Changing selection replaces the current node with a default of the new
  kind (a const `0`, a ref with empty alias, or a group `op=+` with two
  const-`0` children).
- Middle: `InputNumber` for the numeric literal.
- Right: `⋯` menu — `Wrap in group (+)` / `Wrap in group (-)` etc. /
  `Delete` (disabled on root).

**Ref node** — similar:

```
┌──────────────────────────────────────────┐
│ [Field ▼]   [ alias ▼ ]              ⋯  │
└──────────────────────────────────────────┘
```

- The alias picker is an AntD `Select` of all aliases in the current
  questionnaire **excluding** the arithmetic field's own alias (to prevent
  trivial self-reference through the UI). Arithmetic fields' aliases are
  labeled with a small `calc` tag so designers know they're chaining.
  Cycle detection still runs at runtime as a safety net — imported JSON
  or longer cycles (A→B→A) bypass the picker check.

**Binary-op node** — stacked, with a left border denoting the group:

```
┌── group ─────────────────────────────────┐
│    [ + ▼ ]                            ⋯  │
│                                          │
│    ┌──────────────────────────────────┐  │
│    │ [Field ▼] [ price ▼ ]         ⋯  │  │
│    └──────────────────────────────────┘  │
│                                          │
│    ┌──────────────────────────────────┐  │
│    │ [Number ▼] [ 1.2 ]            ⋯  │  │
│    └──────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Visual: a wrapping `<div class="qnn-arith-group">` with a 2-px left border
in the accent color, 12-px left padding, and 8-px vertical padding.
Children are `NodeEditor` recursively.

The `⋯` menu on a group adds **Unwrap (keep LHS)** as the only extra
action.

### Format section

Below the tree:

- **Decimals** — `InputNumber` 0–6, allow clear for "raw".
- **Prefix** — `Input` (placeholder "$").
- **Suffix** — `Input` (placeholder "kg").

### Preview line

One-line muted text under the format section:

```
= (price + tax) × qty
```

Built by stringifying the tree with parentheses on every binary op and
replacing refs with their alias. If the expression is `null`, shows
"Build a formula above to see the result."

No live-computed value in the designer preview — answers are blank at
design time and showing `0` is confusing next to a formula. The canvas
CanvasPreview shows the formatted zero-result sample instead (see below).

## Canvas preview

The `CanvasPreview` component displays the friendly name and a muted line
showing what the runtime will look like, using the configured
prefix/decimals/suffix over a `0`:

```
Total
──────────────
$0.00
```

If `expression === null` it renders a dashed placeholder: `— not configured —`.

## Runtime preview (the displayed value)

The `Renderer` renders inside the existing `.qnn-preview-field` card
(no special styling needed beyond that — same hover/focus card as other
controls). Structure:

```
┌─ qnn-preview-field ─────────────────────┐
│ Total                                    │   <- friendly name, small
│ $1,250.00                                │   <- computed value, larger
└──────────────────────────────────────────┘
```

Number formatting: `Intl.NumberFormat(undefined, { minimumFractionDigits:
decimals, maximumFractionDigits: decimals })` when `decimals` is set, else
`String(result)`. Thousands separators come for free from `Intl`.

Unconfigured (`expression === null`) or invalid (`result === null`):
renders `—` in muted color.

## Persistence & import/export

No changes needed — `ArithmeticProps` serializes as plain JSON because
`Expr` is already JSON-serializable. The `schemaVersion` stays `1`.

## Tests

### Unit — evaluator (`arithmetic/evaluate.test.ts`)

1. `const 5` → `5`.
2. `ref price` with `answers.price = '12.5'` → `12.5`.
3. `ref missing` → `0` (and not `NaN` or `null`).
4. `1 + 2` → `3`.
5. `(2 + 3) * 4` (tree, not parsing) → `20`.
6. `10 / 0` → `null`.
7. `ref a + ref b` with string answers `'1.5'`, `'2.5'` → `4`.
8. `null` node → `null`.

### Unit — cycle detection (`arithmetic/cycles.test.ts`)

1. No arithmetic fields → empty set.
2. Two arithmetic fields, no refs between them → empty set.
3. `A` refs `B` (rating), `B` not arithmetic → empty set.
4. `A` refs `B`, `B` refs `A` (both arithmetic) → `{A, B}`.
5. `A` refs itself → `{A}`.
6. `A` refs `B`, `B` refs `C`, `C` refs `A` → `{A, B, C}`.
7. `A` refs `B`, `B` non-cyclic arithmetic → empty set; `A` evaluates.

### Unit — plugin registration (`registry/builtins.test.ts` addition)

- `defaultRegistry.get('arithmetic')` returns a plugin.
- `arithmetic` is in `BUILT_IN_PLUGINS`.

### Unit — builder component (`ArithmeticBuilder.test.tsx`)

- Initial state (expression null): shows a "Start with" affordance that
  creates a default const-0 root on click.
- Convert const → ref: node kind changes, alias picker appears, value
  preserved if possible (kept as 0 on kind change).
- Wrap-in-group: original node becomes LHS, new const-0 RHS appears,
  operator defaults to `+`.
- Unwrap group: replaces parent with its LHS.
- Delete on nested node: replaces with const-0 placeholder in parent.
- Preview string reflects current tree (`(price + tax)`).

### E2E (`apps/demo/tests/arithmetic.e2e.ts`)

- Drop `textbox` × 2 and `arithmetic` × 1.
- In the textbox property editors, set aliases `price` and `qty`.
- Select the arithmetic control.
- Build `price * qty` in the builder (root: group `*`; LHS: ref `price`;
  RHS: ref `qty`).
- Open Preview. Type `5` and `3`. Assert the arithmetic field shows `15`.
- Set decimals=2 and prefix=`$`. Assert display is `$15.00`.

## Files touched

| Path | Change |
|---|---|
| `packages/designer/src/registry/types.ts` | Extend `ControlPluginRendererProps` with optional `answers`, `questionnaire`. |
| `packages/designer/src/registry/controls/arithmetic.tsx` | New plugin. |
| `packages/designer/src/registry/controls/arithmetic/evaluate.ts` | Pure evaluator. |
| `packages/designer/src/registry/controls/arithmetic/cycles.ts` | Cycle detection. |
| `packages/designer/src/registry/controls/arithmetic/ArithmeticBuilder.tsx` | Builder UI. |
| `packages/designer/src/registry/controls/index.ts` | Register plugin in default registry. |
| `packages/designer/src/runtime/Renderer.tsx` | Pass `answers` + `questionnaire` to `ControlField`. |
| `packages/designer/src/runtime/ControlField.tsx` | Forward new optional props to the plugin's `Renderer`. |
| `packages/designer/src/designer/styles.css` | Optional styling for `.qnn-arith-group`. |
| `packages/designer/tests/...` | Unit tests listed above. |
| `apps/demo/tests/arithmetic.e2e.ts` | E2E listed above. |

## Risks / open questions

- **Evaluation inside render.** Calling `onChange` during render is a React
  anti-pattern. We'll use `useEffect` to write back on `result` change.
  This creates one extra render per arithmetic field when an operand
  changes, which is acceptable.
- **Alias picker shows ALL aliases, not just numeric-typed.** Users
  picking a `single` or `multi` alias will see `0` at runtime because
  `Number('yes')` is `NaN`. Decision: ship as-is for now, add a subtle
  type label in the picker so users see what they're picking. A
  strict-mode that filters the picker to numeric types can come later.
- **Designer-time preview has no live answer values.** Accepted — we
  show the formatted zero so the designer sees shape + units, not a
  computed result.
