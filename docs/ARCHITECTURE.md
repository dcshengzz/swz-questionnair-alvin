# Architecture

A quick map for anyone new to the codebase. The authoritative design doc is
[`superpowers/specs/2026-04-18-qnn-designer-design.md`](./superpowers/specs/2026-04-18-qnn-designer-design.md);
this file is the fast-path overview.

## Repo shape

```
qnndesigner/
├── packages/designer/          @qnn/designer — the reusable library
│   ├── src/
│   │   ├── schema/             TS types + Zod + factories
│   │   ├── rules/              AST interpreter + action engine + tick
│   │   ├── registry/           ControlRegistry + plugin types + 7 builtins
│   │   ├── store/              Zustand stores (designer + runtime)
│   │   ├── io/                 export / import / migrations / persistence
│   │   ├── designer/           React — shell, panes, dialogs, rules UI
│   │   ├── runtime/            React — QuestionnaireRenderer + fields + nav
│   │   └── util/               ids, error boundary
│   └── tests/                  Vitest
└── apps/demo/                  deployable Vite app (designer + preview routes)
    └── tests/                  Playwright e2e
```

## Module dependency direction

```
          schema (pure TS, no React)
             │
             ▼
          rules (pure TS, no React)
             │
             ▼
          registry ◄───── built-in control plugins (React)
             │
             ▼
    ┌────────┴────────┐
    ▼                 ▼
 store/designer    store/runtime
    │                 │
    ▼                 ▼
 designer/          runtime/          ◄── demo app consumes both
  (React)            (React)
```

Rules: nothing above imports from anything below. No cycles. This is enforced
by the file layout and by each module's `index.ts` barrel.

## Key ideas

### Total interpreter

`rules/interpreter.ts::evalExpr` is a **total** function: every `Expr`
operator has a defined result for any input, including `undefined` references
and malformed regex. It never throws. This is what makes the designer safe
to preview a half-finished questionnaire without crashing.

### Single-pass reactive tick

`rules/tick.ts::runTick` evaluates all rules once per user input, reading
the previous-tick `hidden` set (not the one being built). No fixed-point
iteration, no cycle detection — by design. Rules are re-evaluated on the
next tick, so two-hop effects land within a render frame. See spec §7.4 for
why single-pass is right for v1 and how to upgrade to fixed-point later.

### Plugin registry

Every control type is a `ControlPlugin<TProps>`. Registration is validated at
runtime (`Renderer` + `PropertyEditor` required; `CanvasPreview` required when
`isAnswerable: true`). Adding a new control type means writing one `.tsx`
file and calling `registry.register(plugin)`. See
[`INTEGRATION.md`](./INTEGRATION.md) for the walkthrough.

### Grid as CSS

The 12-column canvas is CSS `grid-template-columns: repeat(12, 1fr)` with
`grid-column: span var(--span)`. No JS layout calculation. Drop-zone detection
is the only layout-aware code, and it runs in the `useCanvasDnd` hook.

### Undo/redo

`zundo`'s `temporal` middleware wraps the designer store. The `partialize`
callback restricts history to `questionnaire` (selection is not time-travelled).
Limit: 100 snapshots.

## Data flow

### Designer

1. User drags from palette → `useCanvasDnd` resolves drop target →
   `store.addControl()`.
2. `addControl` produces a new immutable `Questionnaire`, stamped with
   `updatedAt`, pushed into `zundo` history.
3. The `QuestionnaireDesigner`'s `onChange` subscriber fires →
   demo app debounces 300 ms → `saveDesignerDraft` writes to localStorage.

### Runtime

1. `QuestionnaireRenderer` bootstraps a `runtimeStore` from the
   `questionnaire` prop.
2. Initial `runTick` computes visibility/requirements → store state.
3. User edits a field → `setAnswer` → `runTick` recomputes effects →
   `ControlField`s re-render.
4. Next/Submit → `validatePageExit` → navigation effect (`nextOverride` from
   rules can redirect).

## Where to look

| What | Where |
|------|-------|
| Add a control type | `packages/designer/src/registry/controls/*.tsx` + `controls/index.ts` |
| Change validation rules | `schema/zod.ts` (strict Zod with `superRefine` for cross-field) |
| Extend the rule AST | `schema/types.ts` (`Expr` / `Action` unions) + `rules/interpreter.ts` + `rules/engine.ts` + `schema/zod.ts` |
| Add a designer pane | `designer/panes/*.tsx` + wire from `Designer.tsx` |
| Change the visual system | `designer/styles.css` (CSS variables at top) |
| Change persistence keys | `io/persistence.ts` |

## Tests

- **Unit** (`packages/designer/tests/`) — pure-TS modules (schema, rules,
  registry, stores, IO, persistence). 74 tests, run with
  `pnpm --filter @qnn/designer test`.
- **E2E** (`apps/demo/tests/*.e2e.ts`) — three scenarios exercising the full
  stack through the built demo. Run with
  `pnpm --filter @qnn/demo test:e2e` (requires Chromium via `playwright install`).

## Build artifacts

- `packages/designer/dist/index.js` — designer surface entry.
- `packages/designer/dist/runtime.js` — runtime-only entry (lighter if a
  consumer only needs to render, not design).
- `packages/designer/dist/style.css` — the designer CSS (exported via
  `@qnn/designer/style.css`).
- `apps/demo/dist/` — static site, deploy anywhere.
