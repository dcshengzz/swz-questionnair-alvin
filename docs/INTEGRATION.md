# Integrating `@qnn/designer`

## Install

```
pnpm add @qnn/designer react react-dom antd
```

Peer deps: React 18+, React-DOM 18+. Ant Design 5 is a hard runtime dep of
the current v1 control plugins (the plugins use AntD components directly).

## Minimum integration

```tsx
import { ConfigProvider } from 'antd';
import { QuestionnaireDesigner } from '@qnn/designer';
import '@qnn/designer/style.css';
// antd v5 uses CSS-in-JS — no antd reset needed, but it's recommended:
import 'antd/dist/reset.css';

export function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677FF' } }}>
      <div style={{ height: '100vh' }}>
        <QuestionnaireDesigner onChange={(q) => console.log(q)} />
      </div>
    </ConfigProvider>
  );
}
```

Notes:

- `@qnn/designer/style.css` is the designer's own CSS (layout, palette,
  canvas). Import it once at the root of your app.
- `<QuestionnaireDesigner>` fills its parent — make sure the parent has a
  bounded height (`100vh`, `100%`, or a fixed px value).
- The renderer (`<QuestionnaireRenderer>`) does **not** need the designer
  CSS. You can import just the runtime entry
  (`@qnn/designer/runtime`) in a form-only deployment to drop designer
  code from the bundle.

## Persisting drafts

The library ships with localStorage helpers — you choose when to call them.

```tsx
import {
  QuestionnaireDesigner,
  loadDesignerDraft,
  saveDesignerDraft,
  makeEmptyQuestionnaire,
} from '@qnn/designer';

const initial = loadDesignerDraft() ?? makeEmptyQuestionnaire();
let timer: number | null = null;

<QuestionnaireDesigner
  initial={initial}
  onChange={(q) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => saveDesignerDraft(q), 300);
  }}
/>;
```

The demo app does exactly this in `apps/demo/src/routes/DesignerRoute.tsx`.

## Rendering a questionnaire (runtime only)

```tsx
import { QuestionnaireRenderer } from '@qnn/designer/runtime';
import '@qnn/designer/style.css';

<QuestionnaireRenderer
  questionnaire={doc}
  onSubmit={(answers) => sendToServer(answers)}
/>;
```

If you're only rendering, prefer the `@qnn/designer/runtime` entry — it
avoids importing the designer React tree.

## Writing a custom control plugin

Every control is a `ControlPlugin<TProps>`. The minimum viable plugin:

```tsx
// my-plugins/currency.tsx
import { InputNumber, Form } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import type { ControlPlugin } from '@qnn/designer';

export interface CurrencyProps {
  currency: 'USD' | 'EUR' | 'GBP';
  min?: number;
  max?: number;
}

const plugin: ControlPlugin<CurrencyProps> = {
  type: 'currency',
  category: 'input',
  label: 'Currency',
  icon: <DollarOutlined />,
  description: 'A number input in a specific currency.',
  isAnswerable: true,

  defaultProps: () => ({ currency: 'USD' }),
  defaultNode: () => ({
    type: 'currency',
    friendlyName: 'Amount',
    required: false,
    layout: { span: 6 },
    props: { currency: 'USD' },
  }),

  CanvasPreview: ({ node }) => (
    <InputNumber disabled prefix={node.props.currency} style={{ width: '100%' }} />
  ),

  PropertyEditor: ({ node, onChange }) => (
    <Form layout="vertical">
      <Form.Item label="Currency">
        {/* Select... */}
      </Form.Item>
    </Form>
  ),

  Renderer: ({ node, value, onChange, error }) => (
    <InputNumber
      value={value as number}
      onChange={(v) => onChange(v)}
      status={error ? 'error' : undefined}
      min={node.props.min}
      max={node.props.max}
      prefix={node.props.currency}
      style={{ width: '100%' }}
    />
  ),

  validate: (node, value) => {
    if (typeof value !== 'number') return null;
    if (node.props.min != null && value < node.props.min)
      return `Min is ${node.props.min} ${node.props.currency}`;
    if (node.props.max != null && value > node.props.max)
      return `Max is ${node.props.max} ${node.props.currency}`;
    return null;
  },
};

export default plugin;
```

Register it:

```tsx
import currency from './my-plugins/currency';

<QuestionnaireDesigner plugins={[currency]} />
// OR for runtime:
<QuestionnaireRenderer plugins={[currency]} questionnaire={doc} />
```

Plugin requirements enforced at register time:

- `type` must be non-empty.
- `Renderer` is always required.
- `PropertyEditor` is always required.
- `CanvasPreview` is required when `isAnswerable: true`.

## Theming

v1 ships a single accent colour. The theme object lives on the
questionnaire itself (`theme: { accentColor, fontFamily, pageBackground,
contentMaxWidth }`). To apply it globally, wrap your app in AntD's
`ConfigProvider` and seed the token from the theme:

```tsx
<ConfigProvider theme={{ token: { colorPrimary: doc.theme.accentColor } }}>
  <QuestionnaireRenderer questionnaire={doc} />
</ConfigProvider>
```

A theme-editing UI is planned for v2 — see [`ROADMAP.md`](./ROADMAP.md).

## Common gotchas

- **`@qnn/designer/style.css` not loaded.** The designer renders blank or
  unstyled. Import the CSS file once at the root.
- **Parent height unset.** The 3-pane grid collapses to zero. Give the
  containing element a concrete height.
- **`persistAnswers` collides across questionnaires.** Keys are per-`id`;
  make sure the caller supplies a stable `questionnaire.id` if you care
  about per-form drafts.
- **Zod rejects imported JSON.** v1 rejects documents with
  `schemaVersion > 1`. Future migrations will live in `io/migrations.ts`.
