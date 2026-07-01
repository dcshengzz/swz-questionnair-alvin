# QNN Designer

A reusable React questionnaire **designer** + **renderer** module, shipped
as an embeddable TypeScript library plus a deployable demo app.

```
qnndesigner/
├── packages/designer   @qnn/designer — the library
└── apps/demo           deployable Vite + React demo (designer + preview)
```

## What you get

- **Drag-and-drop designer** — 3-pane (palette / canvas / inspector),
  12-column snap grid, multi-page, undo/redo.
- **Reactive runtime** — live rule evaluation, per-field validation,
  page-guard blocking, `gotoPage` / `skipPage` navigation effects.
- **Plugin-first controls** — 7 built-ins (`text`, `textbox`,
  `datetime`, `single`, `multi`, `rating`, `slider`); adding a new
  type is one `.tsx` file. See [`docs/INTEGRATION.md`](docs/INTEGRATION.md).
- **JSON import/export** + localStorage auto-save.
- **Refined visual system** — IBM Plex Sans, layered surfaces, blue
  accent, Linear/Figma-tier polish.

## Prerequisites

- Node 20+
- pnpm 9+

## Install

```bash
pnpm install
pnpm --filter @qnn/demo exec playwright install chromium   # for e2e
```

## Develop

```bash
pnpm dev                             # demo app at http://0.0.0.0:5173
pnpm --filter @qnn/designer test:watch
```

## Build

```bash
pnpm build                           # library + demo
```

Static demo artifacts land at `apps/demo/dist/` and can be deployed to
any static host. The library emits ESM + `.d.ts` at
`packages/designer/dist/`.

## Test

```bash
pnpm test         # Vitest unit tests (74 tests)
pnpm test:e2e     # Playwright end-to-end (3 scenarios, needs built demo)
pnpm typecheck
pnpm lint
```

## Serve the built demo

```bash
pnpm --filter @qnn/demo preview      # http://0.0.0.0:4173
```

## Documentation

| File | What |
|------|------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Module map, data flow, where to change things. |
| [`docs/API.md`](docs/API.md) | Public API reference for `@qnn/designer`. |
| [`docs/INTEGRATION.md`](docs/INTEGRATION.md) | How to consume the library + write a custom control plugin. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | What's shipped, what's next. |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history. |

### Design artifacts

| File | What |
|------|------|
| [`docs/superpowers/specs/2026-04-18-qnn-designer-design.md`](docs/superpowers/specs/2026-04-18-qnn-designer-design.md) | v0.1.0 design spec (approved). |
| [`docs/superpowers/plans/2026-04-18-qnn-designer-v1.md`](docs/superpowers/plans/2026-04-18-qnn-designer-v1.md) | v0.1.0 task-by-task implementation plan (39 tasks). |
| [`docs/superpowers/specs/2026-04-18-qnn-designer-visual-system.md`](docs/superpowers/specs/2026-04-18-qnn-designer-visual-system.md) | Visual system spec (design tokens, component patterns). |
| [`docs/superpowers/specs/2026-04-18-qnn-designer-v2-design.md`](docs/superpowers/specs/2026-04-18-qnn-designer-v2-design.md) | v0.2 design spec (draft). |
| [`docs/superpowers/plans/2026-04-18-qnn-designer-v2.md`](docs/superpowers/plans/2026-04-18-qnn-designer-v2.md) | v0.2 implementation plan (25 tasks). |

## Status

**v0.1.0 — shipped 2026-04-18.** Full MVP: designer + renderer + IO +
7 plugins + demo. 74/74 unit tests, 3/3 e2e, typecheck clean.

**v0.2.0 — planned.** See the roadmap. Themes: production-hardening,
a11y, keyboard UX, cross-page drag, one non-trivial plugin, theme
editing, and answer export.

## License

TBD — not yet published.
