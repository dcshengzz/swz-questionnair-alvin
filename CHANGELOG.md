# Changelog

All notable changes to QNN Designer are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres
to [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet — see [`docs/ROADMAP.md`](./docs/ROADMAP.md) for planned v2 work.

## [0.1.0] — 2026-04-18

The v1 MVP. A complete React + TypeScript questionnaire designer and renderer,
shipped as a reusable library (`@qnn/designer`) plus a deployable demo app
(`@qnn/demo`).

### Added

- **Schema & validation** — Zod-enforced `Questionnaire` document format with
  schema versioning, alias uniqueness, and row-span-sum-≤-12 invariant.
- **Rule engine** — formal `Expr` AST with a total (never-throws) interpreter,
  document-order action application, and single-pass reactive tick.
- **Control registry** — plugin interface with register-time validation and
  seven built-in plugins: `text`, `textbox`, `datetime`, `single`, `multi`,
  `rating`, `slider`.
- **Designer surface** — 3-pane shell (palette / canvas / inspector) with
  `dnd-kit`-driven drag-and-drop, 12-column grid snapping, per-cell resize,
  multi-page management, undo/redo via `zundo`, and structured rule editors.
- **Runtime surface** — `QuestionnaireRenderer` with live visibility updates,
  per-field validation, page-guard blocking, and `gotoPage`/`skipPage`
  navigation effects.
- **IO** — JSON export (with an opt-in "strip logic" mode), import with Zod
  validation and future-version rejection, migration hook stub, and
  localStorage auto-save + restore for both designer drafts and runtime
  answer drafts.
- **Demo app** — designer and preview routes with router-based navigation,
  auto-persistence, and a Restore-unsaved-work banner.
- **Testing** — 74 Vitest unit tests across schema, rules, registry, stores,
  IO, and persistence. Three Playwright end-to-end scenarios
  (roundtrip / branching / gotoPage) running against the built demo.
- **Visual system** — IBM Plex Sans typography, layered surface palette,
  hairline borders, Linear/Figma-style page-tab underline indicator, branded
  top bar, canvas rendered as a centred document card.

### Documentation

- `docs/superpowers/specs/2026-04-18-qnn-designer-design.md` — v1 design spec.
- `docs/superpowers/plans/2026-04-18-qnn-designer-v1.md` — v1 task-by-task
  implementation plan (39 tasks, 42 commits).
- `docs/superpowers/specs/2026-04-18-qnn-designer-visual-system.md` — visual
  design system reference.
- `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/INTEGRATION.md`,
  `docs/ROADMAP.md` — developer reference.
