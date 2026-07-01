# @qnn/designer — Public API

All exports are re-exported from `@qnn/designer`. This page lists the stable
surface; see [`INTEGRATION.md`](./INTEGRATION.md) for walkthroughs.

## React components

### `<QuestionnaireDesigner>`

The full 3-pane editor.

```tsx
import { QuestionnaireDesigner } from '@qnn/designer';
import '@qnn/designer/style.css';

<QuestionnaireDesigner
  initial={doc}                      // Questionnaire | undefined
  plugins={[myCustomPlugin]}         // ControlPlugin[] — overrides by type
  onChange={(q) => save(q)}          // fires on every mutation
  onExport={(q, includeLogic) => {}} // optional interceptor
/>
```

Props:

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `initial` | `Questionnaire` | no | Defaults to a new empty doc if omitted. |
| `plugins` | `ControlPlugin[]` | no | Merged over the default registry via `override()`. |
| `onChange` | `(q: Questionnaire) => void` | no | Fired for every state change. Debounce at the caller. |
| `onExport` | `(q, includeLogic) => void` | no | Intercepts the Export action; if omitted, a JSON download runs. |

The designer must be rendered in a container with a bounded height. It fills
100% of its parent.

### `<QuestionnaireRenderer>`

The standalone runtime.

```tsx
import { QuestionnaireRenderer } from '@qnn/designer';

<QuestionnaireRenderer
  questionnaire={doc}
  plugins={[myCustomPlugin]}
  onSubmit={(answers) => post(answers)}
  persistAnswers                        // optional: localStorage draft
/>
```

Props:

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `questionnaire` | `Questionnaire` | yes | Must pass `QuestionnaireZ`. |
| `plugins` | `ControlPlugin[]` | no | Same merge semantics as designer. |
| `onSubmit` | `(answers: Record<Alias, unknown>) => void` | no | Called on the final page's Submit. |
| `persistAnswers` | `boolean` | no | Auto-save/restore answers via `runtimeDraftKey(questionnaire.id)`. |

## Schema

```ts
import type { Questionnaire, ControlNode, Rule, Expr, Action, Alias, PageId } from '@qnn/designer';
import { QuestionnaireZ, CURRENT_SCHEMA_VERSION } from '@qnn/designer';
```

`Questionnaire` is the top-level document. Key children:

- `theme: ThemeSettings` — accent colour, font family, page background, width.
- `pages: Page[]` — each page has `rows: Row[]` with `cols: ControlNode[]`.
- `rules: Rule[]` — `{ id, when: Expr, then: Action[], else?: Action[] }`.
- `meta: { createdAt, updatedAt, appVersion }` — stamped by the store.

Each `ControlNode<TProps>` has an `alias` (snake-case-valid identifier,
globally unique across pages) and a `layout: { span: 1..12 }`.

Validate before trusting: `QuestionnaireZ.safeParse(input)`.

## Factories

```ts
import { makeEmptyQuestionnaire, makeEmptyPage, makeEmptyRow, DEFAULT_THEME } from '@qnn/designer';

const doc = makeEmptyQuestionnaire('My survey');
```

Factories always produce Zod-valid output.

## IO

```ts
import { exportQuestionnaire, importQuestionnaire } from '@qnn/designer';

const json = JSON.stringify(exportQuestionnaire(doc, { includeLogic: true }));

const result = importQuestionnaire(json);
if (result.ok) useIt(result.value);
else showError(result.error);
```

`importQuestionnaire` returns a discriminated union; it never throws.
`schemaVersion > CURRENT_SCHEMA_VERSION` is rejected with a
"newer version" message; a missing or bogus version is rejected as
"unrecognised".

## Persistence

```ts
import {
  DESIGNER_DRAFT_KEY,
  saveDesignerDraft, loadDesignerDraft, clearDesignerDraft,
  runtimeDraftKey,
  saveRuntimeDraft, loadRuntimeDraft, clearRuntimeDraft,
} from '@qnn/designer';

saveDesignerDraft(doc);          // → { ok: true } or { ok: false, quotaExceeded }
const restored = loadDesignerDraft();
```

Storage keys:

- Designer draft: `qnn.designer.draft.v1`.
- Runtime draft (per questionnaire): `qnn.runtime.draft.{id}.v1`.

## Rule engine (for advanced integrations)

```ts
import { evalExpr, runTick } from '@qnn/designer';
import type { EvalContext, EffectAccumulator } from '@qnn/designer';

const effects = runTick(rules, answers, prevHiddenSet);
```

`evalExpr` is pure and side-effect-free; safe to call from memoized
selectors. `runTick` is similarly pure; it returns a fresh
`EffectAccumulator` on every call.

## Registry

```ts
import { ControlRegistry } from '@qnn/designer';
import type { ControlPlugin } from '@qnn/designer';

const registry = new ControlRegistry();
registry.register(myPlugin);     // throws on duplicate or missing deps
registry.override(myPlugin);     // replaces
registry.get('my_type');         // → ControlPlugin | undefined
registry.all();                  // → ControlPlugin[]
registry.clone();                // → detached copy
```

See [`INTEGRATION.md`](./INTEGRATION.md) for writing a plugin.

## Stable vs unstable

Everything above is the **stable** surface and will only break at major
versions. Internals of `designer/*` and `runtime/*` components are not
re-exported and may change without notice. If you reach into them, pin
the version.
