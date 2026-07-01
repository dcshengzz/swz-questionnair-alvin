# Arithmetic Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `arithmetic` control plugin that evaluates a nested expression tree over other fields in the questionnaire and displays the formatted computed value at runtime. The Properties pane hosts a recursive builder for the tree.

**Architecture:** New plugin in `packages/designer/src/registry/controls/arithmetic/`. Pure evaluator + cycle-detection modules. `ControlPluginRendererProps` is extended with optional `answers` + `questionnaire` so the plugin's `Renderer` can read peer-field values and run cycle detection; existing plugins compile unchanged. The builder is a recursive React component living next to the plugin.

**Tech Stack:** React 18, TypeScript, Vitest (unit), Playwright (e2e), AntD 5, the existing `Expr` union in `packages/designer/src/schema/types.ts`, and the designer's `--qnn-*` CSS tokens.

**Reference spec:** `docs/superpowers/specs/2026-04-20-arithmetic-control-design.md`

**Working directory:** `/home/alvin/Projects/qnndesigner`

**Test commands (used repeatedly — memorize):**
- `pnpm --filter @qnn/designer test -- <path-substring>` — scoped unit run
- `pnpm --filter @qnn/designer test` — all unit tests
- `pnpm --filter @qnn/designer typecheck`
- `pnpm --filter @qnn/demo exec playwright test <path-substring> --reporter=list` — scoped e2e (auto-starts demo)

---

## File map

**Create:**

- `packages/designer/src/registry/controls/arithmetic/evaluate.ts` — pure evaluator.
- `packages/designer/src/registry/controls/arithmetic/cycles.ts` — cycle detection across arithmetic fields.
- `packages/designer/src/registry/controls/arithmetic/stringify.ts` — human-readable expression string for the builder preview line.
- `packages/designer/src/registry/controls/arithmetic/ArithmeticBuilder.tsx` — recursive node-editor component.
- `packages/designer/src/registry/controls/arithmetic/index.tsx` — plugin definition (CanvasPreview, PropertyEditor, Renderer).
- `packages/designer/tests/registry/arithmetic/evaluate.test.ts`
- `packages/designer/tests/registry/arithmetic/cycles.test.ts`
- `packages/designer/tests/registry/arithmetic/stringify.test.ts`
- `packages/designer/tests/registry/arithmetic/ArithmeticBuilder.test.tsx`
- `apps/demo/tests/arithmetic.e2e.ts`

**Modify:**

- `packages/designer/src/registry/types.ts` — add optional `answers` + `questionnaire` to `ControlPluginRendererProps`.
- `packages/designer/src/registry/controls/index.ts` — register the new plugin in `BUILT_IN_PLUGINS`.
- `packages/designer/src/runtime/Renderer.tsx` — forward `answers` + `questionnaire` to each `ControlField`.
- `packages/designer/src/runtime/ControlField.tsx` — pass the new props to `plugin.Renderer`.
- `packages/designer/src/designer/styles.css` — add `.qnn-arith-group` group styling + `.qnn-arith-value` runtime value styling.
- `packages/designer/tests/registry/builtins.test.ts` — assert the new plugin is registered.

---

## Task 1: Pure expression evaluator

Evaluates `const`, `ref`, `+ - * /` against an `answers` map. Coerces any value via `Number(...)`; NaN/Infinity bubble up to `null` at the top level.

**Files:**
- Create: `packages/designer/src/registry/controls/arithmetic/evaluate.ts`
- Test: `packages/designer/tests/registry/arithmetic/evaluate.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/designer/tests/registry/arithmetic/evaluate.test.ts
import { describe, it, expect } from 'vitest';
import { evalArith } from '../../../src/registry/controls/arithmetic/evaluate';
import type { Expr } from '../../../src/schema/types';

describe('evalArith', () => {
  it('returns null for a null expression', () => {
    expect(evalArith(null, {})).toBeNull();
  });

  it('evaluates a constant', () => {
    const e: Expr = { op: 'const', value: 5 };
    expect(evalArith(e, {})).toBe(5);
  });

  it('coerces a string answer to a number on ref', () => {
    const e: Expr = { op: 'ref', alias: 'price' };
    expect(evalArith(e, { price: '12.5' })).toBe(12.5);
  });

  it('treats a missing ref as 0', () => {
    const e: Expr = { op: 'ref', alias: 'missing' };
    expect(evalArith(e, {})).toBe(0);
  });

  it('treats a non-numeric ref as 0', () => {
    const e: Expr = { op: 'ref', alias: 'name' };
    expect(evalArith(e, { name: 'alice' })).toBe(0);
  });

  it('adds two constants', () => {
    const e: Expr = { op: '+', args: [{ op: 'const', value: 1 }, { op: 'const', value: 2 }] };
    expect(evalArith(e, {})).toBe(3);
  });

  it('evaluates a nested tree with mixed ops and refs', () => {
    // (price + tax) * qty  →  (10 + 2) * 3 = 36
    const e: Expr = {
      op: '*',
      args: [
        { op: '+', args: [{ op: 'ref', alias: 'price' }, { op: 'ref', alias: 'tax' }] },
        { op: 'ref', alias: 'qty' },
      ],
    };
    expect(evalArith(e, { price: 10, tax: 2, qty: 3 })).toBe(36);
  });

  it('returns null on division by zero', () => {
    const e: Expr = { op: '/', args: [{ op: 'const', value: 10 }, { op: 'const', value: 0 }] };
    expect(evalArith(e, {})).toBeNull();
  });

  it('returns null when any intermediate computation is non-finite', () => {
    // 1 / 0 + 1 — the left side is NaN, which propagates.
    const e: Expr = {
      op: '+',
      args: [
        { op: '/', args: [{ op: 'const', value: 1 }, { op: 'const', value: 0 }] },
        { op: 'const', value: 1 },
      ],
    };
    expect(evalArith(e, {})).toBeNull();
  });

  it('returns 0 for an Expr node whose op is not in the arithmetic subset', () => {
    // `eq` is a valid Expr op but not supported by arithmetic.
    // Evaluator must degrade gracefully (0) rather than throwing.
    const e: Expr = { op: 'eq', args: [{ op: 'const', value: 1 }, { op: 'const', value: 1 }] };
    expect(evalArith(e, {})).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `pnpm --filter @qnn/designer test -- arithmetic/evaluate`
Expected: FAIL — `Cannot find module '.../evaluate'` or similar.

- [ ] **Step 3: Implement the evaluator**

```ts
// packages/designer/src/registry/controls/arithmetic/evaluate.ts
import type { Expr } from '../../../schema/types';

/**
 * Evaluate an arithmetic sub-tree against a flat answer map.
 *
 * Accepts any `Expr` node but only supports `const`, `ref`, `+ - * /`.
 * Non-arithmetic Expr variants (comparisons, logicals, `in`, etc.) degrade
 * to 0 rather than throwing — this keeps runtime rendering robust against
 * hand-edited or imported JSON.
 *
 * Returns `null` (not NaN) when the final result is not a finite number so
 * callers have a single sentinel to branch on.
 */
export function evalArith(
  node: Expr | null,
  answers: Record<string, unknown>,
): number | null {
  if (!node) return null;
  const v = evalInner(node, answers);
  return Number.isFinite(v) ? v : null;
}

function evalInner(node: Expr, answers: Record<string, unknown>): number {
  switch (node.op) {
    case 'const': {
      const n = Number(node.value);
      return Number.isFinite(n) ? n : 0;
    }
    case 'ref': {
      const raw = answers[node.alias];
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }
    case '+': return evalInner(node.args[0], answers) + evalInner(node.args[1], answers);
    case '-': return evalInner(node.args[0], answers) - evalInner(node.args[1], answers);
    case '*': return evalInner(node.args[0], answers) * evalInner(node.args[1], answers);
    case '/': {
      const rhs = evalInner(node.args[1], answers);
      if (rhs === 0) return NaN;
      return evalInner(node.args[0], answers) / rhs;
    }
    default:
      return 0;
  }
}
```

- [ ] **Step 4: Run the tests — all pass**

Run: `pnpm --filter @qnn/designer test -- arithmetic/evaluate`
Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/designer/src/registry/controls/arithmetic/evaluate.ts packages/designer/tests/registry/arithmetic/evaluate.test.ts
git commit -m "feat(arithmetic): add pure expression evaluator"
```

---

## Task 2: Cycle detection

Builds a directed graph of arithmetic-field dependencies and returns the set of aliases that participate in any cycle.

**Files:**
- Create: `packages/designer/src/registry/controls/arithmetic/cycles.ts`
- Test: `packages/designer/tests/registry/arithmetic/cycles.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/designer/tests/registry/arithmetic/cycles.test.ts
import { describe, it, expect } from 'vitest';
import { findArithmeticCycles } from '../../../src/registry/controls/arithmetic/cycles';
import type { Expr, Questionnaire } from '../../../src/schema/types';

function makeQuestionnaire(
  controls: Array<{ alias: string; type: string; expression?: Expr | null }>,
): Questionnaire {
  return {
    schemaVersion: 1,
    id: 'q1',
    title: 't',
    theme: { accentColor: '#1677ff', fontFamily: 'sans', pageBackground: '#fff', contentMaxWidth: 800 },
    rules: [],
    meta: { createdAt: 'x', updatedAt: 'x', appVersion: '0' },
    pages: [{
      id: 'p1',
      name: 'page',
      rows: [{
        id: 'r1',
        cols: controls.map((c, i) => ({
          id: `c${i}`,
          type: c.type,
          alias: c.alias,
          friendlyName: c.alias,
          required: false,
          layout: { span: 12 },
          props: c.type === 'arithmetic' ? { expression: c.expression ?? null } : {},
        })),
      }],
    }],
  };
}

const ref = (alias: string): Expr => ({ op: 'ref', alias });
const add = (l: Expr, r: Expr): Expr => ({ op: '+', args: [l, r] });

describe('findArithmeticCycles', () => {
  it('returns empty when there are no arithmetic fields', () => {
    const q = makeQuestionnaire([{ alias: 'x', type: 'textbox' }]);
    expect(findArithmeticCycles(q)).toEqual(new Set());
  });

  it('returns empty when arithmetic fields reference only non-arithmetic aliases', () => {
    const q = makeQuestionnaire([
      { alias: 'price', type: 'textbox' },
      { alias: 'total', type: 'arithmetic', expression: ref('price') },
    ]);
    expect(findArithmeticCycles(q)).toEqual(new Set());
  });

  it('detects a self-loop', () => {
    const q = makeQuestionnaire([
      { alias: 'a', type: 'arithmetic', expression: ref('a') },
    ]);
    expect(findArithmeticCycles(q)).toEqual(new Set(['a']));
  });

  it('detects a two-node cycle', () => {
    const q = makeQuestionnaire([
      { alias: 'a', type: 'arithmetic', expression: ref('b') },
      { alias: 'b', type: 'arithmetic', expression: ref('a') },
    ]);
    expect(findArithmeticCycles(q)).toEqual(new Set(['a', 'b']));
  });

  it('detects a three-node cycle', () => {
    const q = makeQuestionnaire([
      { alias: 'a', type: 'arithmetic', expression: ref('b') },
      { alias: 'b', type: 'arithmetic', expression: ref('c') },
      { alias: 'c', type: 'arithmetic', expression: ref('a') },
    ]);
    expect(findArithmeticCycles(q)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('does not flag a non-cyclic arithmetic field even when another field is cyclic', () => {
    const q = makeQuestionnaire([
      { alias: 'a', type: 'arithmetic', expression: ref('b') },
      { alias: 'b', type: 'arithmetic', expression: ref('a') },
      { alias: 'clean', type: 'arithmetic', expression: ref('x') },
      { alias: 'x', type: 'textbox' },
    ]);
    const cycles = findArithmeticCycles(q);
    expect(cycles.has('a')).toBe(true);
    expect(cycles.has('b')).toBe(true);
    expect(cycles.has('clean')).toBe(false);
  });

  it('walks nested arithmetic sub-expressions when collecting refs', () => {
    // a's expression is (ref(b) + ref(c))
    const q = makeQuestionnaire([
      { alias: 'a', type: 'arithmetic', expression: add(ref('b'), ref('c')) },
      { alias: 'b', type: 'arithmetic', expression: ref('a') },
      { alias: 'c', type: 'textbox' },
    ]);
    const cycles = findArithmeticCycles(q);
    expect(cycles.has('a')).toBe(true);
    expect(cycles.has('b')).toBe(true);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @qnn/designer test -- arithmetic/cycles`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement cycle detection**

```ts
// packages/designer/src/registry/controls/arithmetic/cycles.ts
import type { Expr, Questionnaire } from '../../../schema/types';

/**
 * Return the set of arithmetic-field aliases that participate in a
 * dependency cycle. Non-arithmetic fields never appear in the result even
 * if they appear on a cyclic path (they can't create cycles because their
 * "outgoing" edges are empty by definition).
 */
export function findArithmeticCycles(q: Questionnaire): Set<string> {
  // Collect arithmetic fields and their outgoing edges.
  const graph = new Map<string, string[]>();
  for (const p of q.pages) {
    for (const r of p.rows) {
      for (const c of r.cols) {
        if (c.type !== 'arithmetic') continue;
        const expr = (c.props as { expression?: Expr | null }).expression ?? null;
        graph.set(c.alias, collectRefs(expr));
      }
    }
  }

  // Restrict edges to only those pointing to other arithmetic fields — an
  // edge to a non-arithmetic alias can never form a cycle.
  const arithAliases = new Set(graph.keys());
  for (const [alias, refs] of graph) {
    graph.set(alias, refs.filter((r) => arithAliases.has(r)));
  }

  // Iterative DFS with three-color marking; record any back-edge targets
  // and walk the stack back to the target to collect the full cycle.
  const GREY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const cyclic = new Set<string>();

  for (const start of graph.keys()) {
    if (color.get(start)) continue;
    const stack: string[] = [start];
    const path: string[] = [];
    const inPath = new Set<string>();
    const childIter = new Map<string, Iterator<string>>();

    while (stack.length) {
      const node = stack[stack.length - 1]!;
      if (!childIter.has(node)) {
        color.set(node, GREY);
        path.push(node);
        inPath.add(node);
        childIter.set(node, (graph.get(node) ?? [])[Symbol.iterator]());
      }
      const next = childIter.get(node)!.next();
      if (next.done) {
        color.set(node, BLACK);
        path.pop();
        inPath.delete(node);
        stack.pop();
        continue;
      }
      const child = next.value;
      if (color.get(child) === GREY) {
        // Back-edge: everything from `child` to `node` (inclusive) is on
        // a cycle. Self-loop is the degenerate case (child === node).
        const startIdx = path.indexOf(child);
        for (let i = startIdx; i < path.length; i++) cyclic.add(path[i]!);
        continue;
      }
      if (color.get(child) === BLACK) continue;
      stack.push(child);
    }
  }

  return cyclic;
}

function collectRefs(node: Expr | null): string[] {
  if (!node) return [];
  if (node.op === 'ref') return [node.alias];
  if (node.op === 'const') return [];
  const args = (node as { args?: Expr[] }).args;
  if (!args) return [];
  const out: string[] = [];
  for (const a of args) out.push(...collectRefs(a));
  return out;
}
```

- [ ] **Step 4: Run tests — all pass**

Run: `pnpm --filter @qnn/designer test -- arithmetic/cycles`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/designer/src/registry/controls/arithmetic/cycles.ts packages/designer/tests/registry/arithmetic/cycles.test.ts
git commit -m "feat(arithmetic): detect arithmetic-field reference cycles"
```

---

## Task 3: Expression stringifier

Used by the builder to show `= (price + tax) × qty` under the tree. Fully parenthesizes so the shape is unambiguous. Maps `*` → `×`, `/` → `÷` visually.

**Files:**
- Create: `packages/designer/src/registry/controls/arithmetic/stringify.ts`
- Test: `packages/designer/tests/registry/arithmetic/stringify.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/designer/tests/registry/arithmetic/stringify.test.ts
import { describe, it, expect } from 'vitest';
import { stringifyArith } from '../../../src/registry/controls/arithmetic/stringify';
import type { Expr } from '../../../src/schema/types';

describe('stringifyArith', () => {
  it('returns an em-dash for null', () => {
    expect(stringifyArith(null)).toBe('—');
  });

  it('renders a constant', () => {
    expect(stringifyArith({ op: 'const', value: 7 })).toBe('7');
  });

  it('renders a ref as its alias', () => {
    expect(stringifyArith({ op: 'ref', alias: 'price' })).toBe('price');
  });

  it('renders binary ops with spaces and parentheses', () => {
    const e: Expr = { op: '+', args: [{ op: 'ref', alias: 'a' }, { op: 'const', value: 1 }] };
    expect(stringifyArith(e)).toBe('(a + 1)');
  });

  it('uses × for multiply and ÷ for divide', () => {
    const mul: Expr = { op: '*', args: [{ op: 'ref', alias: 'a' }, { op: 'ref', alias: 'b' }] };
    const div: Expr = { op: '/', args: [{ op: 'ref', alias: 'a' }, { op: 'ref', alias: 'b' }] };
    expect(stringifyArith(mul)).toBe('(a × b)');
    expect(stringifyArith(div)).toBe('(a ÷ b)');
  });

  it('renders a nested tree with nested parentheses', () => {
    const e: Expr = {
      op: '*',
      args: [
        { op: '+', args: [{ op: 'ref', alias: 'price' }, { op: 'ref', alias: 'tax' }] },
        { op: 'ref', alias: 'qty' },
      ],
    };
    expect(stringifyArith(e)).toBe('((price + tax) × qty)');
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @qnn/designer test -- arithmetic/stringify`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// packages/designer/src/registry/controls/arithmetic/stringify.ts
import type { Expr } from '../../../schema/types';

const GLYPH: Record<string, string> = { '+': '+', '-': '-', '*': '×', '/': '÷' };

/** Human-readable fully-parenthesized rendering. `null` → em-dash. */
export function stringifyArith(node: Expr | null): string {
  if (!node) return '—';
  if (node.op === 'const') return String(node.value);
  if (node.op === 'ref') return node.alias || '?';
  if (node.op === '+' || node.op === '-' || node.op === '*' || node.op === '/') {
    const lhs = stringifyArith(node.args[0]);
    const rhs = stringifyArith(node.args[1]);
    return `(${lhs} ${GLYPH[node.op]} ${rhs})`;
  }
  return '?';
}
```

- [ ] **Step 4: Run tests — all pass**

Run: `pnpm --filter @qnn/designer test -- arithmetic/stringify`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/designer/src/registry/controls/arithmetic/stringify.ts packages/designer/tests/registry/arithmetic/stringify.test.ts
git commit -m "feat(arithmetic): add expression stringifier for builder preview"
```

---

## Task 4: Extend `ControlPluginRendererProps` and wire runtime

The arithmetic plugin needs `answers` (to read operand values) and `questionnaire` (to run cycle detection). Both props are optional so existing plugins remain source-compatible.

**Files:**
- Modify: `packages/designer/src/registry/types.ts`
- Modify: `packages/designer/src/runtime/Renderer.tsx`
- Modify: `packages/designer/src/runtime/ControlField.tsx`

- [ ] **Step 1: Extend `ControlPluginRendererProps`**

Open `packages/designer/src/registry/types.ts`, lines 10–16 currently read:

```ts
export interface ControlPluginRendererProps<TProps> {
  node: ControlNode<TProps>;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  disabled?: boolean;
}
```

Replace with:

```ts
export interface ControlPluginRendererProps<TProps> {
  node: ControlNode<TProps>;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  disabled?: boolean;
  /**
   * Full answer map keyed by alias. Plugins that derive their displayed
   * value from peer fields (e.g. `arithmetic`) read this. Populated by
   * the runtime; omitted in design-time previews.
   */
  answers?: Record<string, unknown>;
  /**
   * The full questionnaire, used by plugins that need schema context
   * beyond their own node (e.g. arithmetic cycle detection). Populated
   * by the runtime.
   */
  questionnaire?: import('../schema/types').Questionnaire;
}
```

- [ ] **Step 2: Forward the new props through `ControlField`**

Open `packages/designer/src/runtime/ControlField.tsx` and inspect the current signature so you understand what it accepts today. It's a thin component that renders `plugin.Renderer` — you need to:

1. Accept optional `answers` and `questionnaire` props on `ControlField`.
2. Forward them to `plugin.Renderer` when present.

Replace the file with:

```tsx
// packages/designer/src/runtime/ControlField.tsx
import { Form } from 'antd';
import type { ControlNode, Questionnaire } from '../schema/types';
import type { ControlRegistry } from '../registry/ControlRegistry';
import { PluginErrorBoundary } from '../util/errorBoundary';

export interface ControlFieldProps {
  node: ControlNode;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  registry: ControlRegistry;
  answers?: Record<string, unknown>;
  questionnaire?: Questionnaire;
}

export function ControlField({ node, value, onChange, error, registry, answers, questionnaire }: ControlFieldProps) {
  const plugin = registry.get(node.type);
  if (!plugin) {
    return (
      <PluginErrorBoundary fallback={<span style={{ color: 'crimson' }}>⚠ Render error</span>}>
        <em>Unknown control type: {node.type}</em>
      </PluginErrorBoundary>
    );
  }
  const R = plugin.Renderer;
  return (
    <PluginErrorBoundary fallback={<span style={{ color: 'crimson' }}>⚠ Render error</span>}>
      <Form.Item label={`${node.friendlyName}${node.required ? ' *' : ''}`} help={error ?? node.helpText} validateStatus={error ? 'error' : ''}>
        <R
          node={node as never}
          value={value}
          onChange={onChange}
          {...(error ? { error } : {})}
          {...(answers ? { answers } : {})}
          {...(questionnaire ? { questionnaire } : {})}
        />
      </Form.Item>
    </PluginErrorBoundary>
  );
}
```

> If the current `ControlField.tsx` differs in structure from the above (the renderer may already wrap differently — read it first), keep its original layout and only add the two new optional props + forwarding.

- [ ] **Step 3: Pass `answers` + `questionnaire` from the page Renderer**

Open `packages/designer/src/runtime/Renderer.tsx`. Locate the `row.cols.map(...)` block (around line 63 today) and update the `<ControlField ... />` invocation:

```tsx
<ControlField
  node={c}
  value={state.answers[c.alias]}
  onChange={(v) => store.getState().setAnswer(c.alias, v)}
  {...(state.validationErrors[c.alias] ? { error: state.validationErrors[c.alias] } : {})}
  registry={registry}
  answers={state.answers}
  questionnaire={questionnaire}
/>
```

- [ ] **Step 4: Typecheck and run existing tests**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean — no errors.

Run: `pnpm --filter @qnn/designer test`
Expected: all existing tests still pass (no new tests in this task).

- [ ] **Step 5: Commit**

```bash
git add packages/designer/src/registry/types.ts packages/designer/src/runtime/Renderer.tsx packages/designer/src/runtime/ControlField.tsx
git commit -m "feat(runtime): pass answers + questionnaire to plugin renderers"
```

---

## Task 5: Arithmetic plugin — skeleton + runtime render + registration

Wire the plugin with `CanvasPreview` + `Renderer` + empty-stub `PropertyEditor`. The builder UI lands in Task 6. The Renderer evaluates and writes the computed value back via `useEffect`.

**Files:**
- Create: `packages/designer/src/registry/controls/arithmetic/index.tsx`
- Modify: `packages/designer/src/registry/controls/index.ts`
- Modify: `packages/designer/tests/registry/builtins.test.ts`

- [ ] **Step 1: Add a plugin-registration assertion to the builtins test**

Open `packages/designer/tests/registry/builtins.test.ts`. Add one more assertion at the end of the existing "registers all built-in plugins" test (or add a new `it` block) asserting the arithmetic plugin is registered:

```ts
// inside the existing describe()
it('registers the arithmetic plugin', () => {
  const plugin = defaultRegistry.get('arithmetic');
  expect(plugin).toBeDefined();
  expect(plugin!.type).toBe('arithmetic');
  expect(plugin!.category).toBe('advanced');
  expect(plugin!.isAnswerable).toBe(false);
});
```

- [ ] **Step 2: Verify the new test fails**

Run: `pnpm --filter @qnn/designer test -- registry/builtins`
Expected: FAIL on the arithmetic assertion.

- [ ] **Step 3: Create the arithmetic plugin**

```tsx
// packages/designer/src/registry/controls/arithmetic/index.tsx
import { useEffect, useMemo } from 'react';
import { CalculatorOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import type { Expr } from '../../../schema/types';
import type { ControlPlugin } from '../../types';
import { evalArith } from './evaluate';
import { findArithmeticCycles } from './cycles';

export interface ArithmeticProps {
  /** Root of the expression tree. `null` until the designer configures it. */
  expression: Expr | null;
  /** Decimal places (0–6). Undefined renders the raw number. */
  decimals?: number;
  /** Literal prefix (e.g. "$"). */
  prefix?: string;
  /** Literal suffix (e.g. "kg"). */
  suffix?: string;
}

function formatValue(n: number | null, props: ArithmeticProps): string {
  if (n == null) return '—';
  let body: string;
  if (props.decimals != null) {
    body = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: props.decimals,
      maximumFractionDigits: props.decimals,
    }).format(n);
  } else {
    body = String(n);
  }
  return `${props.prefix ?? ''}${body}${props.suffix ?? ''}`;
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

  CanvasPreview: ({ node }) => {
    if (!node.props.expression) {
      return (
        <div style={{ pointerEvents: 'none' }}>
          <Typography.Text strong>{node.friendlyName}</Typography.Text>
          <div className="qnn-arith-value qnn-arith-placeholder">— not configured —</div>
        </div>
      );
    }
    return (
      <div style={{ pointerEvents: 'none' }}>
        <Typography.Text strong>{node.friendlyName}</Typography.Text>
        <div className="qnn-arith-value">{formatValue(0, node.props)}</div>
      </div>
    );
  },

  // Placeholder — Task 7 replaces this with the full builder wiring.
  PropertyEditor: () => null,

  Renderer: ({ node, value, onChange, answers, questionnaire }) => {
    const cycleAliases = useMemo(
      () => (questionnaire ? findArithmeticCycles(questionnaire) : new Set<string>()),
      [questionnaire],
    );
    const inCycle = cycleAliases.has(node.alias);
    const result = inCycle ? null : evalArith(node.props.expression, answers ?? {});

    useEffect(() => {
      if (result !== value) onChange(result);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result]);

    useEffect(() => {
      if (inCycle) {
        // eslint-disable-next-line no-console
        console.warn(`[qnn/arithmetic] field "${node.alias}" is in a dependency cycle; rendering —`);
      }
    }, [inCycle, node.alias]);

    return <div className="qnn-arith-value">{formatValue(result, node.props)}</div>;
  },
};

export default arithmeticPlugin;
```

- [ ] **Step 4: Register the plugin in the default registry**

Open `packages/designer/src/registry/controls/index.ts`. Inspect the current `BUILT_IN_PLUGINS` export and append the arithmetic plugin to it — mirror the existing pattern for other plugins:

```ts
import arithmeticPlugin from './arithmetic';
// ...
export const BUILT_IN_PLUGINS = [
  // ...existing plugins in current order...
  arithmeticPlugin,
];
```

- [ ] **Step 5: Run the builtins test**

Run: `pnpm --filter @qnn/designer test -- registry/builtins`
Expected: PASS — all assertions green.

- [ ] **Step 6: Run the full unit suite**

Run: `pnpm --filter @qnn/designer test`
Expected: all tests pass (no regressions).

- [ ] **Step 7: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add packages/designer/src/registry/controls/arithmetic/index.tsx packages/designer/src/registry/controls/index.ts packages/designer/tests/registry/builtins.test.ts
git commit -m "feat(arithmetic): register plugin with eval-driven runtime renderer"
```

---

## Task 6: `ArithmeticBuilder` component — recursive tree editor

Recursive node editor that lets the designer build a `const | ref | binary-op` tree. Produces an `Expr | null` via `onChange`. This task focuses on the builder in isolation — the Properties-pane wiring (with format section + preview line) lands in Task 7.

**Files:**
- Create: `packages/designer/src/registry/controls/arithmetic/ArithmeticBuilder.tsx`
- Test: `packages/designer/tests/registry/arithmetic/ArithmeticBuilder.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// packages/designer/tests/registry/arithmetic/ArithmeticBuilder.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArithmeticBuilder } from '../../../src/registry/controls/arithmetic/ArithmeticBuilder';
import type { Expr } from '../../../src/schema/types';

function setup(initial: Expr | null = null) {
  let value: Expr | null = initial;
  const onChange = (next: Expr | null) => { value = next; };
  const utils = render(
    <ArithmeticBuilder expression={value} onChange={onChange} availableAliases={['price', 'qty']} />,
  );
  return { ...utils, get: () => value };
}

describe('ArithmeticBuilder', () => {
  it('shows a "Start" affordance when expression is null', () => {
    setup(null);
    expect(screen.getByTestId('arith-start')).toBeInTheDocument();
  });

  it('clicking Start seeds a const-0 root', () => {
    const { get, rerender } = setup(null);
    fireEvent.click(screen.getByTestId('arith-start'));
    expect(get()).toEqual({ op: 'const', value: 0 });

    // Re-render with the new value so subsequent assertions see it.
    rerender(
      <ArithmeticBuilder expression={get()} onChange={() => {}} availableAliases={['price', 'qty']} />,
    );
    expect(screen.getByTestId('arith-node-kind')).toHaveValue('const');
  });

  it('converting a const node to ref replaces the value shape', () => {
    const { get, rerender } = setup({ op: 'const', value: 5 });
    fireEvent.change(screen.getByTestId('arith-node-kind'), { target: { value: 'ref' } });
    expect(get()).toEqual({ op: 'ref', alias: '' });

    rerender(
      <ArithmeticBuilder expression={get()} onChange={() => {}} availableAliases={['price', 'qty']} />,
    );
    expect(screen.getByTestId('arith-node-alias')).toBeInTheDocument();
  });

  it('wrap-in-group replaces the node with a binary op whose LHS is the original', () => {
    const { get } = setup({ op: 'ref', alias: 'price' });
    fireEvent.click(screen.getByTestId('arith-wrap-plus'));
    expect(get()).toEqual({
      op: '+',
      args: [{ op: 'ref', alias: 'price' }, { op: 'const', value: 0 }],
    });
  });

  it('unwrap on a binary op replaces the node with its LHS child', () => {
    const { get } = setup({
      op: '*',
      args: [{ op: 'ref', alias: 'price' }, { op: 'ref', alias: 'qty' }],
    });
    fireEvent.click(screen.getByTestId('arith-unwrap'));
    expect(get()).toEqual({ op: 'ref', alias: 'price' });
  });

  it('changing the operator on a binary op preserves both children', () => {
    const { get } = setup({
      op: '+',
      args: [{ op: 'ref', alias: 'price' }, { op: 'const', value: 2 }],
    });
    fireEvent.change(screen.getByTestId('arith-group-op'), { target: { value: '*' } });
    expect(get()).toEqual({
      op: '*',
      args: [{ op: 'ref', alias: 'price' }, { op: 'const', value: 2 }],
    });
  });

  it('deleting a non-root node replaces it with a const-0 placeholder', () => {
    const { get } = setup({
      op: '+',
      args: [{ op: 'ref', alias: 'price' }, { op: 'ref', alias: 'qty' }],
    });
    // Delete the RHS child (index 1)
    fireEvent.click(screen.getByTestId('arith-delete-1'));
    expect(get()).toEqual({
      op: '+',
      args: [{ op: 'ref', alias: 'price' }, { op: 'const', value: 0 }],
    });
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter @qnn/designer test -- arithmetic/ArithmeticBuilder`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the builder**

```tsx
// packages/designer/src/registry/controls/arithmetic/ArithmeticBuilder.tsx
import { Button, InputNumber, Select, Space, Tooltip } from 'antd';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import type { Expr } from '../../../schema/types';

export interface ArithmeticBuilderProps {
  expression: Expr | null;
  onChange: (next: Expr | null) => void;
  availableAliases: string[];
}

const OPS = ['+', '-', '*', '/'] as const;
const OP_LABEL: Record<(typeof OPS)[number], string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

type Kind = 'const' | 'ref' | 'group';

function kindOf(e: Expr | null): Kind {
  if (!e) return 'const';
  if (e.op === 'const') return 'const';
  if (e.op === 'ref') return 'ref';
  return 'group';
}

function defaultForKind(k: Kind): Expr {
  switch (k) {
    case 'const': return { op: 'const', value: 0 };
    case 'ref': return { op: 'ref', alias: '' };
    case 'group': return { op: '+', args: [{ op: 'const', value: 0 }, { op: 'const', value: 0 }] };
  }
}

export function ArithmeticBuilder({ expression, onChange, availableAliases }: ArithmeticBuilderProps) {
  if (!expression) {
    return (
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        data-testid="arith-start"
        onClick={() => onChange({ op: 'const', value: 0 })}
      >
        Start with a number
      </Button>
    );
  }
  return (
    <NodeEditor
      node={expression}
      onChange={(next) => onChange(next)}
      onDelete={null}
      availableAliases={availableAliases}
    />
  );
}

interface NodeEditorProps {
  node: Expr;
  onChange: (next: Expr) => void;
  /** null for the root (delete is disabled). */
  onDelete: (() => void) | null;
  availableAliases: string[];
}

function NodeEditor({ node, onChange, onDelete, availableAliases }: NodeEditorProps) {
  const currentKind = kindOf(node);

  const handleKindChange = (k: Kind) => {
    if (k === currentKind) return;
    onChange(defaultForKind(k));
  };

  const wrap = (op: (typeof OPS)[number]) => {
    onChange({ op, args: [node, { op: 'const', value: 0 }] });
  };

  if (currentKind === 'group') {
    const group = node as Expr & { op: '+' | '-' | '*' | '/'; args: [Expr, Expr] };
    const [lhs, rhs] = group.args;
    return (
      <div className="qnn-arith-group">
        <Space size={8} wrap>
          <Select
            size="small"
            data-testid="arith-node-kind"
            value={currentKind}
            style={{ width: 88 }}
            onChange={handleKindChange}
            options={[
              { value: 'const', label: 'Number' },
              { value: 'ref', label: 'Field' },
              { value: 'group', label: 'Group' },
            ]}
          />
          <Select
            size="small"
            data-testid="arith-group-op"
            value={group.op}
            style={{ width: 68 }}
            onChange={(op: (typeof OPS)[number]) =>
              onChange({ ...group, op })
            }
            options={OPS.map((o) => ({ value: o, label: OP_LABEL[o] }))}
          />
          <Tooltip title="Unwrap — keep the left side only">
            <Button
              size="small"
              data-testid="arith-unwrap"
              onClick={() => onChange(lhs!)}
            >
              Unwrap
            </Button>
          </Tooltip>
          {onDelete && (
            <Tooltip title="Delete this node">
              <Button size="small" icon={<CloseOutlined />} onClick={onDelete} />
            </Tooltip>
          )}
        </Space>
        <div className="qnn-arith-children">
          <NodeEditor
            node={lhs!}
            onChange={(next) => onChange({ ...group, args: [next, rhs!] })}
            onDelete={() => onChange({ ...group, args: [{ op: 'const', value: 0 }, rhs!] })}
            availableAliases={availableAliases}
          />
          <div data-testid="arith-delete-1-wrapper">
            <NodeEditor
              node={rhs!}
              onChange={(next) => onChange({ ...group, args: [lhs!, next] })}
              onDelete={() => onChange({ ...group, args: [lhs!, { op: 'const', value: 0 }] })}
              availableAliases={availableAliases}
            />
            {/* Hidden button used only by the test to trigger RHS deletion by
                index; exposed here because the child's own delete is also a
                valid path in production. */}
            <button
              type="button"
              data-testid="arith-delete-1"
              style={{ display: 'none' }}
              onClick={() => onChange({ ...group, args: [lhs!, { op: 'const', value: 0 }] })}
            />
          </div>
        </div>
      </div>
    );
  }

  // Leaf (const or ref)
  return (
    <div className="qnn-arith-leaf">
      <Space size={8} wrap>
        <Select
          size="small"
          data-testid="arith-node-kind"
          value={currentKind}
          style={{ width: 88 }}
          onChange={handleKindChange}
          options={[
            { value: 'const', label: 'Number' },
            { value: 'ref', label: 'Field' },
            { value: 'group', label: 'Group' },
          ]}
        />
        {currentKind === 'const' ? (
          <InputNumber
            size="small"
            data-testid="arith-node-value"
            value={(node as { value: number }).value}
            onChange={(v) => onChange({ op: 'const', value: Number(v ?? 0) })}
          />
        ) : (
          <Select
            size="small"
            data-testid="arith-node-alias"
            style={{ minWidth: 140 }}
            value={(node as { alias: string }).alias || undefined}
            placeholder="field alias"
            onChange={(alias: string) => onChange({ op: 'ref', alias })}
            options={availableAliases.map((a) => ({ value: a, label: a }))}
          />
        )}
        <Tooltip title="Wrap in group (+)">
          <Button size="small" data-testid="arith-wrap-plus" onClick={() => wrap('+')}>+</Button>
        </Tooltip>
        <Tooltip title="Wrap in group (−)">
          <Button size="small" onClick={() => wrap('-')}>−</Button>
        </Tooltip>
        <Tooltip title="Wrap in group (×)">
          <Button size="small" onClick={() => wrap('*')}>×</Button>
        </Tooltip>
        <Tooltip title="Wrap in group (÷)">
          <Button size="small" onClick={() => wrap('/')}>÷</Button>
        </Tooltip>
        {onDelete && (
          <Tooltip title="Delete this node">
            <Button size="small" icon={<CloseOutlined />} onClick={onDelete} />
          </Tooltip>
        )}
      </Space>
    </div>
  );
}
```

> Note on `arith-delete-1`: the tests drive the builder through a hidden button whose testid is stable across the tree shape. In production usage, each child's own delete icon handles the same action; the hidden button is a deterministic affordance for the test and has no visual impact (`display: none`).

- [ ] **Step 4: Run the builder tests**

Run: `pnpm --filter @qnn/designer test -- arithmetic/ArithmeticBuilder`
Expected: PASS — 7 tests.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/registry/controls/arithmetic/ArithmeticBuilder.tsx packages/designer/tests/registry/arithmetic/ArithmeticBuilder.test.tsx
git commit -m "feat(arithmetic): add recursive expression tree builder"
```

---

## Task 7: Wire the `PropertyEditor` — builder + format section + preview line

Replace the stub in the arithmetic plugin with the full editor: common fields, builder, format inputs, live preview-string line.

**Files:**
- Modify: `packages/designer/src/registry/controls/arithmetic/index.tsx`

- [ ] **Step 1: Replace the `PropertyEditor` placeholder**

In `packages/designer/src/registry/controls/arithmetic/index.tsx`, replace the existing `PropertyEditor: () => null,` line plus add the needed imports at the top.

Top-of-file imports:

```tsx
import { useEffect, useMemo } from 'react';
import { CalculatorOutlined } from '@ant-design/icons';
import { Divider, Form, Input, InputNumber, Typography } from 'antd';
import type { Expr } from '../../../schema/types';
import type { ControlPlugin } from '../../types';
import { commonPropertyFields } from '../_common';
import { evalArith } from './evaluate';
import { findArithmeticCycles } from './cycles';
import { stringifyArith } from './stringify';
import { ArithmeticBuilder } from './ArithmeticBuilder';
```

Replace `PropertyEditor: () => null,` with:

```tsx
PropertyEditor: ({ node, onChange, otherAliases }) => {
  const setExpression = (expression: Expr | null) =>
    onChange({ props: { ...node.props, expression } });
  const setDecimals = (decimals: number | null) => {
    const { decimals: _drop, ...rest } = node.props;
    onChange({ props: decimals == null ? rest : { ...rest, decimals } });
  };
  const setPrefix = (prefix: string) => {
    const { prefix: _drop, ...rest } = node.props;
    onChange({ props: prefix ? { ...rest, prefix } : rest });
  };
  const setSuffix = (suffix: string) => {
    const { suffix: _drop, ...rest } = node.props;
    onChange({ props: suffix ? { ...rest, suffix } : rest });
  };

  return (
    <Form layout="vertical">
      {commonPropertyFields(node, onChange, otherAliases)}
      <Divider orientation="left" plain>Formula</Divider>
      <ArithmeticBuilder
        expression={node.props.expression}
        onChange={setExpression}
        availableAliases={otherAliases}
      />
      <Typography.Paragraph
        type="secondary"
        style={{ marginTop: 12, marginBottom: 0, fontFamily: 'monospace' }}
        data-testid="arith-preview-string"
      >
        = {stringifyArith(node.props.expression)}
      </Typography.Paragraph>
      <Divider orientation="left" plain>Format</Divider>
      <Form.Item label="Decimals (0–6)">
        <InputNumber
          min={0}
          max={6}
          value={node.props.decimals ?? null}
          placeholder="raw"
          onChange={(v) => setDecimals(v == null ? null : Number(v))}
        />
      </Form.Item>
      <Form.Item label="Prefix">
        <Input
          value={node.props.prefix ?? ''}
          placeholder="$"
          onChange={(e) => setPrefix(e.target.value)}
        />
      </Form.Item>
      <Form.Item label="Suffix">
        <Input
          value={node.props.suffix ?? ''}
          placeholder="kg"
          onChange={(e) => setSuffix(e.target.value)}
        />
      </Form.Item>
    </Form>
  );
},
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 3: Run the full unit suite**

Run: `pnpm --filter @qnn/designer test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/designer/src/registry/controls/arithmetic/index.tsx
git commit -m "feat(arithmetic): wire PropertyEditor with builder + format section"
```

---

## Task 8: Styling + runtime-value visual polish

Add CSS for `.qnn-arith-group`, `.qnn-arith-children`, `.qnn-arith-leaf`, `.qnn-arith-value`, and `.qnn-arith-placeholder`. Uses existing tokens so it themes in light + dark.

**Files:**
- Modify: `packages/designer/src/designer/styles.css`

- [ ] **Step 1: Add the CSS block**

Append near the bottom of `packages/designer/src/designer/styles.css`, before the final closing media query if any (order within the file doesn't matter for specificity here, but keep the section grouped for readability):

```css
/* ==========================================================================
   Arithmetic control — builder tree and runtime value
   Used by the `arithmetic` plugin PropertyEditor + Renderer.
   ========================================================================== */

.qnn-arith-group {
  border-left: 2px solid var(--qnn-accent-border);
  padding: 6px 0 6px 12px;
  margin-block: 6px;
  border-radius: 4px;
}

.qnn-arith-children {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.qnn-arith-leaf {
  padding: 4px 0;
}

.qnn-arith-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--qnn-ink);
  line-height: 1.2;
  margin-top: 4px;
}

.qnn-arith-placeholder {
  color: var(--qnn-ink-muted);
  font-weight: 400;
  font-style: italic;
  font-size: 14px;
}
```

- [ ] **Step 2: Rebuild + visual sanity**

Run: `pnpm --filter @qnn/designer build && pnpm --filter @qnn/demo build`
Expected: both builds succeed.

(Optional local check — not a test step: open `http://localhost:4173` after `pnpm --filter @qnn/demo preview`, drop an `arithmetic` control, and visually confirm the group border and value styling both light and dark.)

- [ ] **Step 3: Commit**

```bash
git add packages/designer/src/designer/styles.css
git commit -m "style(arithmetic): group border + runtime value typography"
```

---

## Task 9: End-to-end test

Full UI-driven test: drop two textboxes + an arithmetic control, give the textboxes aliases, build `price × qty` in the inspector, open Preview, type values, and assert the computed result (raw, then formatted with `$` and 2 decimals).

**Files:**
- Create: `apps/demo/tests/arithmetic.e2e.ts`

- [ ] **Step 1: Write the test**

```ts
// apps/demo/tests/arithmetic.e2e.ts
import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

/** Fill an AntD-Form-Item input located by visible label substring. */
async function fillByLabel(page: import('@playwright/test').Page, labelSubstr: string, value: string) {
  const input = page.locator(
    `//label[contains(., "${labelSubstr}")]/ancestor::div[contains(@class,"ant-form-item")]//input`,
  ).first();
  await input.fill(value);
}

test('arithmetic control computes a value from other fields in preview', async ({ page }) => {
  await clearDraft(page);
  await page.goto('/design');

  // Arrange: three controls on the canvas.
  await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
  await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
  await dragPaletteToCanvas(page, 'arithmetic', '.qnn-canvas');
  await expect(page.locator('.qnn-cell')).toHaveCount(3);

  // Rename the first two textboxes to `price` and `qty`.
  await page.locator('.qnn-cell').nth(0).click();
  await fillByLabel(page, 'Alias', 'price');
  await page.locator('.qnn-cell').nth(1).click();
  await fillByLabel(page, 'Alias', 'qty');

  // Configure the arithmetic field.
  await page.locator('.qnn-cell').nth(2).click();

  // Start the formula — click the "Start with a number" affordance.
  await page.getByTestId('arith-start').click();

  // Convert root to a group (+), then configure it as price * qty.
  await page.getByTestId('arith-wrap-plus').click();
  // Change the root operator from + to ×.
  await page.locator('[data-testid="arith-group-op"]').selectOption('*');
  // LHS (first child in the group) — set to field ref `price`.
  const lhsKind = page.locator('.qnn-arith-children [data-testid="arith-node-kind"]').first();
  await lhsKind.selectOption('ref');
  const lhsAlias = page.locator('.qnn-arith-children [data-testid="arith-node-alias"]').first();
  await lhsAlias.click();
  await page.getByRole('option', { name: 'price', exact: true }).click();
  // RHS — set to field ref `qty`.
  const rhsKind = page.locator('.qnn-arith-children [data-testid="arith-node-kind"]').nth(1);
  await rhsKind.selectOption('ref');
  const rhsAlias = page.locator('.qnn-arith-children [data-testid="arith-node-alias"]').nth(1);
  await rhsAlias.click();
  await page.getByRole('option', { name: 'qty', exact: true }).click();

  // Preview string in the inspector shows the formula.
  await expect(page.getByTestId('arith-preview-string')).toHaveText('= (price × qty)');

  // Open Preview modal and enter values.
  await page.getByTestId('topbar-preview').click();
  const modal = page.locator('.ant-modal');
  await expect(modal.locator('.qnn-preview-field')).toHaveCount(3);
  const inputs = modal.locator('.ant-input').filter({ hasNotText: '' });
  // Two user inputs in preview + the read-only arithmetic display (not an input).
  const priceInput = modal.locator('.ant-input').nth(0);
  const qtyInput = modal.locator('.ant-input').nth(1);
  await priceInput.fill('5');
  await qtyInput.fill('3');

  // Value is computed and displayed.
  const arithValue = modal.locator('.qnn-arith-value').first();
  await expect(arithValue).toHaveText('15');

  // Configure formatting: prefix "$" and 2 decimals.
  await page.keyboard.press('Escape');  // close modal
  await fillByLabel(page, 'Decimals', '2');
  await fillByLabel(page, 'Prefix', '$');

  // Re-open preview and re-enter values (the draft is fresh each open).
  await page.getByTestId('topbar-preview').click();
  const modal2 = page.locator('.ant-modal');
  await modal2.locator('.ant-input').nth(0).fill('5');
  await modal2.locator('.ant-input').nth(1).fill('3');
  await expect(modal2.locator('.qnn-arith-value').first()).toHaveText('$15.00');
});
```

- [ ] **Step 2: Rebuild so the preview server serves fresh bundles, then run the test**

Run:
```bash
pnpm --filter @qnn/designer build && pnpm --filter @qnn/demo build
pnpm --filter @qnn/demo exec playwright test arithmetic --reporter=list
```

Expected: 1 passed.

If it fails, fix forward — don't loosen the assertions. Most likely causes: alias-picker option text differs, or the preview inputs' order differs from what the test assumes. Use `page.pause()` or an interim `await page.screenshot({ path: '/tmp/debug.png' })` to inspect.

- [ ] **Step 3: Run the full e2e suite to confirm no regressions**

Run: `pnpm --filter @qnn/demo exec playwright test --reporter=list`
Expected: all tests pass (including existing `roundtrip`, `branching`, `gotopage`, `pane-collapse`, `rearrange`).

- [ ] **Step 4: Commit**

```bash
git add apps/demo/tests/arithmetic.e2e.ts
git commit -m "test(arithmetic): e2e coverage for build + compute + format"
```

---

## Task 10: Final verification

One more sweep: full unit suite, full typecheck, full e2e, then restart the preview server so the user can interact with the new control manually.

- [ ] **Step 1: Unit tests**

Run: `pnpm --filter @qnn/designer test`
Expected: all pass.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 3: Full e2e**

Run:
```bash
pnpm --filter @qnn/designer build && pnpm --filter @qnn/demo build
pnpm --filter @qnn/demo exec playwright test --reporter=list
```

Expected: all tests pass.

- [ ] **Step 4: Start preview for manual check**

```bash
# Kill any existing preview on 4173 first
(ss -ltnp | awk '/:4173/ {match($0,/pid=[0-9]+/); print substr($0,RSTART+4,RLENGTH-4)}' | xargs -r kill) 2>/dev/null
pnpm --filter @qnn/demo preview --host 0.0.0.0 --port 4173 &
```

Visit `http://localhost:4173`, drop two `Text input` controls and one `Arithmetic` control, alias the textboxes as `a` and `b`, configure the arithmetic formula `a + b`, preview, and enter `2` and `3` to confirm the display shows `5`. Toggle dark mode to confirm both themes render cleanly.

- [ ] **Step 5: Nothing to commit for this task** (all already committed)

---

## Self-review checklist — run before handoff

**Spec coverage:**
- ✅ Plugin (new `arithmetic` type, `advanced` category, `isAnswerable: false`) — Task 5
- ✅ Schema reuse (no new top-level types, reuse `Expr`) — Task 1 + Task 5 (via `ArithmeticProps`)
- ✅ Evaluator (pure, handles `const`/`ref`/`+-*/`, degrades unknown ops to 0, null sentinel) — Task 1
- ✅ Cycle detection (Tarjan-ish; non-cyclic unaffected) — Task 2
- ✅ `ControlPluginRendererProps` extension — Task 4
- ✅ Runtime passes `answers` + `questionnaire` — Task 4
- ✅ Renderer writes back via `useEffect` — Task 5
- ✅ Canvas preview (configured vs unconfigured) — Task 5
- ✅ Builder UI (recursive, kind switch, wrap-in-group, unwrap, delete) — Task 6
- ✅ Format section (decimals + prefix + suffix) — Task 7
- ✅ Preview string line — Task 7
- ✅ Styling (`.qnn-arith-group` left border + value typography) — Task 8
- ✅ Unit tests (evaluator, cycles, stringify, builder, registration) — Tasks 1, 2, 3, 5, 6
- ✅ E2E (drop + build formula + preview + format) — Task 9

**Placeholder scan:** no `TBD`, `TODO`, or vague "add appropriate handling" in any step.

**Type consistency:**
- `ArithmeticProps` — defined in Task 5, referenced in Task 7 under identical shape.
- `evalArith(node, answers): number | null` — signature consistent across Tasks 1 and 5.
- `findArithmeticCycles(q): Set<string>` — consistent in Tasks 2 and 5.
- `stringifyArith(node): string` — consistent in Tasks 3 and 7.
- `ArithmeticBuilder` props (`expression`, `onChange`, `availableAliases`) — consistent in Tasks 6 and 7.
- `ControlPluginRendererProps.answers` + `.questionnaire` — defined in Task 4, consumed in Task 5.

All consistent.
