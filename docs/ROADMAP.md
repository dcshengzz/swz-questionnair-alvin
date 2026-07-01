# Roadmap

## Shipped (v0.1.0 — 2026-04-18)

See [`../CHANGELOG.md`](../CHANGELOG.md) for the full list. In short:
schema + rules engine + registry + 7 plugins + designer + runtime + demo +
IO + visual system. 74 unit tests + 3 e2e.

## Next up (v0.2.0 — planned)

Full spec: [`superpowers/specs/2026-04-18-qnn-designer-v2-design.md`](./superpowers/specs/2026-04-18-qnn-designer-v2-design.md).
Task-by-task plan: [`superpowers/plans/2026-04-18-qnn-designer-v2.md`](./superpowers/plans/2026-04-18-qnn-designer-v2.md).

Themes for v0.2:

1. **Production-readiness polish** — designer-root error boundary, Esc to
   deselect, keyboard shortcuts (⌘Z / ⌘⇧Z / Del / Esc), a basic
   accessibility audit and fixes, lint-clean `pnpm lint` on the repo.
2. **Cross-page drag** — hold-to-switch gesture over page tabs during a
   drag operation, completing the drag UX that was deferred in v1
   (§6.6 of the v1 spec).
3. **One advanced control type** — a `currency` plugin exercising the
   validation + `toAnswerValue` / `isValueEmpty` hooks end-to-end. Serves
   as an executable example for the plugin cookbook.
4. **Theme customization UI** — a small Theme tab on the Inspector that
   writes to `questionnaire.theme` (accent, font, background, width).
5. **Runtime answers export** — serialize the final answers map as
   JSON/CSV from the runtime, with an `onSubmit` convenience wrapper.

## Beyond v0.2

Captured in the v1 spec under §11 "v2+ extensibility notes" and
§3.7 "v2 not-built list". Highlights, from near-term to far-term:

- **Visual flow editor** — replace Rules tab with a React Flow canvas
  editing the same `Rule[]` AST.
- **Matrix / grid control** — a plugin whose `props` hold a nested
  `ControlNode[][]`.
- **Autosum** — plugin whose `props` hold a list of alias references and
  an arithmetic `Expr`.
- **Click-map** — image-hotspot control with custom `Renderer`.
- **Fixed-point rule evaluation** — iterate-until-stable with cycle
  detection, replacing the v1 single-pass tick.
- **Multi-select in canvas** — shift-click + marquee (designer store
  already supports an id set).
- **i18n** — string table + per-control overrides.
- **Dark mode** — full palette variants under `prefers-color-scheme`.
- **Plugin lifecycle hooks** — `onMount`, `onAnswerableChange` for plugins
  that own external state (cameras, GPS, etc).
- **Advanced controls** — file upload, signature pad, camera capture,
  barcode/QR, GPS.
- **Server-side persistence** — a pluggable storage adapter replacing
  `io/persistence.ts`.

Pick one or two per release and land them behind flags where risky.

## How to contribute a theme change

Pick one of the above, open an issue (or track locally as a plan under
`docs/superpowers/plans/`), scope it, run through
[`superpowers:writing-plans`](https://superpowers.hasgazo.link/skills/writing-plans/)
to produce a task-by-task plan, execute with
[`superpowers:subagent-driven-development`](https://superpowers.hasgazo.link/skills/subagent-driven-development/),
and open a PR to main.
