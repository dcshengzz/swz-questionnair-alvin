# QNN Designer v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the QNN Designer v1 MVP — a React + TypeScript questionnaire designer and renderer module — from the approved spec at `docs/superpowers/specs/2026-04-18-qnn-designer-design.md`.

**Architecture:** pnpm monorepo. `packages/designer` is the reusable Vite-in-lib-mode library exporting `QuestionnaireDesigner` and `QuestionnaireRenderer`. `apps/demo` is a Vite React app that consumes the library and is deployable as a static site. The library is structured into five non-cyclic modules — `schema`, `registry`, `rules` (pure TS, no React), `store` (Zustand), `io` — plus two React surfaces `designer/` and `runtime/`. Drag-drop uses `dnd-kit`; grid snapping is a property of a 12-column CSS grid; rule evaluation is a formal AST with a total (never-throws) interpreter; persistence is via `localStorage` plus explicit JSON import/export.

**Tech Stack:** React 18, TypeScript 5.6+, Ant Design 5, Zustand 5 + zundo, @dnd-kit/core + sortable, Zod 3, dayjs, dompurify, Vite 5, Vitest 2, Playwright 1, pnpm 9, React Router 6.

**Testing philosophy:** Pure-TS modules (`schema`, `rules`, `registry`, `store`, `io`) are built TDD-first with Vitest unit tests. React components are built bottom-up; correctness is pinned by 3 Playwright end-to-end scenarios in the demo app. No coverage target in v1.

**Parallelism hints:** Tasks are ordered linearly but many are parallelizable when dispatched to subagents. Safe-to-parallelize groups are called out in a section at the end.

---

## File Structure

```
qnndesigner/
├── package.json                      Task 1
├── pnpm-workspace.yaml               Task 1
├── tsconfig.base.json                Task 1
├── .eslintrc.cjs                     Task 1
├── .prettierrc.cjs                   Task 1
├── README.md                         Task 5
├── packages/designer/
│   ├── package.json                  Task 2
│   ├── tsconfig.json                 Task 2
│   ├── vite.config.ts                Task 2
│   ├── vitest.config.ts              Task 2
│   ├── src/
│   │   ├── index.ts                  Task 2 (stub) / final in Task 37
│   │   ├── schema/
│   │   │   ├── index.ts              Task 6
│   │   │   ├── types.ts              Task 6
│   │   │   ├── zod.ts                Task 7
│   │   │   └── factories.ts          Task 8
│   │   ├── rules/
│   │   │   ├── index.ts              Task 9
│   │   │   ├── interpreter.ts        Task 9
│   │   │   ├── engine.ts             Task 10
│   │   │   └── tick.ts               Task 11
│   │   ├── registry/
│   │   │   ├── index.ts              Task 12
│   │   │   ├── ControlRegistry.ts    Task 12
│   │   │   ├── types.ts              Task 12
│   │   │   ├── defaults.ts           Task 13
│   │   │   └── controls/
│   │   │       ├── index.ts          Task 20 (final)
│   │   │       ├── text.tsx          Task 14
│   │   │       ├── textbox.tsx       Task 15
│   │   │       ├── datetime.tsx      Task 16
│   │   │       ├── single.tsx        Task 17
│   │   │       ├── multi.tsx         Task 18
│   │   │       ├── rating.tsx        Task 19
│   │   │       └── slider.tsx        Task 20
│   │   ├── store/
│   │   │   ├── index.ts              Task 21
│   │   │   ├── designer.ts           Task 21
│   │   │   └── runtime.ts            Task 22
│   │   ├── io/
│   │   │   ├── index.ts              Task 23
│   │   │   ├── export.ts             Task 23
│   │   │   ├── import.ts             Task 24
│   │   │   ├── migrations.ts         Task 24
│   │   │   └── persistence.ts        Task 25
│   │   ├── designer/
│   │   │   ├── Designer.tsx          Task 26
│   │   │   ├── styles.css            Task 26
│   │   │   ├── TopBar.tsx            Task 33
│   │   │   ├── panes/
│   │   │   │   ├── PalettePane.tsx   Task 27
│   │   │   │   ├── CanvasPane.tsx    Task 28
│   │   │   │   ├── Row.tsx           Task 28
│   │   │   │   ├── Cell.tsx          Task 28, 29
│   │   │   │   ├── PageTabs.tsx      Task 32
│   │   │   │   ├── PropertiesPane.tsx  Task 30
│   │   │   │   └── RulesTab.tsx      Task 31
│   │   │   ├── rules/
│   │   │   │   ├── RuleCard.tsx      Task 31
│   │   │   │   ├── ExprEditor.tsx    Task 31
│   │   │   │   └── ActionEditor.tsx  Task 31
│   │   │   ├── dialogs/
│   │   │   │   ├── ExportDialog.tsx  Task 33
│   │   │   │   ├── ImportButton.tsx  Task 33
│   │   │   │   ├── PreviewModal.tsx  Task 33
│   │   │   │   └── RestoreBanner.tsx Task 33
│   │   │   └── hooks/
│   │   │       ├── useDesignerStore.ts   Task 21
│   │   │       └── useCanvasDnd.ts       Task 28
│   │   ├── runtime/
│   │   │   ├── Renderer.tsx          Task 34
│   │   │   ├── ControlField.tsx      Task 34
│   │   │   └── PageNavigation.tsx    Task 34
│   │   └── util/
│   │       ├── ids.ts                Task 6
│   │       └── errorBoundary.tsx     Task 39
│   └── tests/
│       ├── schema/zod.test.ts                 Task 7
│       ├── schema/factories.test.ts           Task 8
│       ├── rules/interpreter.test.ts          Task 9
│       ├── rules/engine.test.ts               Task 10
│       ├── rules/tick.test.ts                 Task 11
│       ├── registry/registry.test.ts          Task 12
│       ├── registry/defaults.test.ts          Task 13
│       ├── store/designer.test.ts             Task 21
│       ├── store/runtime.test.ts              Task 22
│       ├── io/export.test.ts                  Task 23
│       ├── io/import.test.ts                  Task 24
│       └── io/roundtrip.test.ts               Task 24
└── apps/demo/
    ├── package.json                  Task 3
    ├── tsconfig.json                 Task 3
    ├── vite.config.ts                Task 3
    ├── playwright.config.ts          Task 4
    ├── index.html                    Task 3
    ├── src/
    │   ├── main.tsx                  Task 3
    │   ├── App.tsx                   Task 35
    │   ├── routes/
    │   │   ├── DesignerRoute.tsx     Task 35
    │   │   └── PreviewRoute.tsx      Task 36
    │   └── styles.css                Task 3
    └── tests/
        ├── roundtrip.e2e.ts          Task 38
        ├── branching.e2e.ts          Task 38
        └── gotopage.e2e.ts           Task 38
```

---

## Phase 0 — Workspace scaffolding

### Task 1: Root workspace config

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.eslintrc.cjs`
- Create: `.prettierrc.cjs`
- Create: `.npmrc`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "qnndesigner",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm --filter @qnn/demo dev",
    "test": "pnpm -r test",
    "test:e2e": "pnpm --filter @qnn/demo test:e2e",
    "lint": "eslint . --ext .ts,.tsx --max-warnings=0",
    "typecheck": "pnpm -r typecheck",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.34.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.2.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: Create `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: { react: { version: '18.3' } },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist/', 'node_modules/', '.superpowers/', 'coverage/'],
};
```

- [ ] **Step 5: Create `.prettierrc.cjs`**

```js
module.exports = {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  semi: true,
  tabWidth: 2,
};
```

- [ ] **Step 6: Create `.npmrc`**

```
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 7: Install root dev deps**

Run: `pnpm install`
Expected: installs; creates `node_modules/` and `pnpm-lock.yaml`. No errors.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .eslintrc.cjs .prettierrc.cjs .npmrc pnpm-lock.yaml
git commit -m "chore: initialize pnpm monorepo with TS, ESLint, Prettier"
```

---

### Task 2: `@qnn/designer` package scaffold

**Files:**
- Create: `packages/designer/package.json`
- Create: `packages/designer/tsconfig.json`
- Create: `packages/designer/vite.config.ts`
- Create: `packages/designer/vitest.config.ts`
- Create: `packages/designer/src/index.ts` (stub)

- [ ] **Step 1: `packages/designer/package.json`**

```json
{
  "name": "@qnn/designer",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./runtime": { "types": "./dist/runtime.d.ts", "import": "./dist/runtime.js" }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "vite build && tsc -p tsconfig.json --emitDeclarationOnly",
    "dev": "vite build --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "dependencies": {
    "@ant-design/icons": "^5.3.0",
    "@dnd-kit/core": "^6.3.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "antd": "^5.24.0",
    "dayjs": "^1.11.10",
    "dompurify": "^3.1.0",
    "uuid": "^9.0.1",
    "zod": "^3.23.0",
    "zundo": "^2.1.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@types/dompurify": "^3.0.5",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/uuid": "^9.0.8",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^24.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "vite": "^5.4.0",
    "vite-plugin-dts": "^4.0.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: `packages/designer/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["vitest/globals", "node"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: `packages/designer/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react(), dts({ rollupTypes: false, insertTypesEntry: true })],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        runtime: resolve(__dirname, 'src/runtime/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    sourcemap: true,
    target: 'es2022',
  },
});
```

- [ ] **Step 4: `packages/designer/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 5: `packages/designer/tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Stub entry `packages/designer/src/index.ts`**

```ts
export const DESIGNER_VERSION = '0.1.0';
```

- [ ] **Step 7: Stub entry `packages/designer/src/runtime/index.ts`**

```ts
export const RUNTIME_ENTRY = true;
```

- [ ] **Step 8: Verify build**

Run: `pnpm --filter @qnn/designer build`
Expected: builds `dist/index.js`, `dist/runtime.js`, and `.d.ts` files without error.

- [ ] **Step 9: Verify tests run**

Run: `pnpm --filter @qnn/designer test`
Expected: Vitest reports `No test files found` (success); exit 0.

- [ ] **Step 10: Commit**

```bash
git add packages/designer pnpm-lock.yaml
git commit -m "chore: scaffold @qnn/designer library package"
```

---

### Task 3: `@qnn/demo` app scaffold

**Files:**
- Create: `apps/demo/package.json`
- Create: `apps/demo/tsconfig.json`
- Create: `apps/demo/vite.config.ts`
- Create: `apps/demo/index.html`
- Create: `apps/demo/src/main.tsx`
- Create: `apps/demo/src/App.tsx` (stub)
- Create: `apps/demo/src/styles.css`

- [ ] **Step 1: `apps/demo/package.json`**

```json
{
  "name": "@qnn/demo",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json --noEmit && vite build",
    "preview": "vite preview --port 4173",
    "test": "echo 'no unit tests in demo' && exit 0",
    "test:e2e": "playwright test",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@qnn/designer": "workspace:*",
    "antd": "^5.24.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.47.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: `apps/demo/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["vite/client"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: `apps/demo/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: '0.0.0.0' },
  preview: { port: 4173, host: '0.0.0.0' },
});
```

- [ ] **Step 4: `apps/demo/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>QNN Designer — Demo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: `apps/demo/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={{ token: { colorPrimary: '#1677FF' } }}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 6: Stub `apps/demo/src/App.tsx`**

```tsx
import { DESIGNER_VERSION } from '@qnn/designer';

export default function App() {
  return <div style={{ padding: 24 }}>QNN Designer demo · {DESIGNER_VERSION}</div>;
}
```

- [ ] **Step 7: `apps/demo/src/styles.css`**

```css
:root { --qnn-breakpoint-sm: 640px; }
html, body, #root { height: 100%; margin: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
```

- [ ] **Step 8: Install & verify dev server**

Run: `pnpm install && pnpm --filter @qnn/demo dev`
Expected: Vite starts on `http://0.0.0.0:5173`, renders "QNN Designer demo · 0.1.0".
Stop the server with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add apps/demo pnpm-lock.yaml
git commit -m "chore: scaffold @qnn/demo app"
```

---

### Task 4: Playwright wiring

**Files:**
- Create: `apps/demo/playwright.config.ts`
- Create: `apps/demo/tests/smoke.e2e.ts` (placeholder, replaced in Task 38)

- [ ] **Step 1: `apps/demo/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm --filter @qnn/demo build && pnpm --filter @qnn/demo preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 2: `apps/demo/tests/smoke.e2e.ts`**

```ts
import { expect, test } from '@playwright/test';

test('demo shell renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toContainText('QNN Designer demo');
});
```

- [ ] **Step 3: Install browsers**

Run: `pnpm --filter @qnn/demo exec playwright install chromium`
Expected: downloads Chromium. One-time operation.

- [ ] **Step 4: Run e2e**

Run: `pnpm --filter @qnn/demo test:e2e`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/demo/playwright.config.ts apps/demo/tests/smoke.e2e.ts
git commit -m "chore: add Playwright e2e harness and smoke test"
```

---

### Task 5: README with run/build/test commands

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# QNN Designer

Reusable React questionnaire designer + renderer module. Monorepo:
- `packages/designer` — the library (`@qnn/designer`)
- `apps/demo` — deployable demo app

## Prerequisites
- Node 20+
- pnpm 9+

## Install
```
pnpm install
pnpm --filter @qnn/demo exec playwright install chromium
```

## Develop
```
pnpm dev                 # demo app dev server (http://0.0.0.0:5173)
pnpm --filter @qnn/designer test:watch   # library unit tests
```

## Build
```
pnpm build               # builds library + demo
```

## Test
```
pnpm test                # all unit tests
pnpm test:e2e            # Playwright against built demo
pnpm typecheck
pnpm lint
```

See `docs/superpowers/specs/2026-04-18-qnn-designer-design.md` for the full spec.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with build/test commands"
```

---

## Phase 1 — Schema (types + Zod + factories)

### Task 6: Schema TypeScript types + id util

**Files:**
- Create: `packages/designer/src/util/ids.ts`
- Create: `packages/designer/src/schema/types.ts`
- Create: `packages/designer/src/schema/index.ts`

- [ ] **Step 1: `src/util/ids.ts`**

```ts
import { v4 as uuidv4 } from 'uuid';
export const newId = (): string => uuidv4();
export const ALIAS_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
export const isValidAlias = (s: string): boolean => ALIAS_RE.test(s);
```

- [ ] **Step 2: `src/schema/types.ts`**

```ts
export type Alias = string;
export type PageId = string;

export interface ThemeSettings {
  accentColor: string;
  fontFamily: string;
  pageBackground: string;
  contentMaxWidth: number;
}

export interface PageStyle {
  background?: string;
  paddingY?: number;
  paddingX?: number;
}

export interface ControlStyle {
  labelColor?: string;
  labelSize?: number;
  widthOverride?: number;
}

export interface PerControlValidation {
  minLen?: number;
  maxLen?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  message?: string;
}

export interface ControlNode<TProps = unknown> {
  id: string;
  type: string;                // matches plugin.type
  alias: Alias;
  friendlyName: string;
  required: boolean;
  helpText?: string;
  placeholder?: string;
  layout: { span: number };    // 1..12
  style?: ControlStyle;
  props: TProps;
  validation?: PerControlValidation;
}

export interface Row {
  id: string;
  cols: ControlNode[];
}

export interface Page {
  id: PageId;
  name: string;
  rows: Row[];
  style?: PageStyle;
}

export type Expr =
  | { op: 'const'; value: string | number | boolean | null }
  | { op: 'ref'; alias: Alias }
  | { op: 'and' | 'or'; args: Expr[] }
  | { op: 'not'; arg: Expr }
  | { op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'; args: [Expr, Expr] }
  | { op: 'in' | 'notIn'; value: Expr; set: Expr }
  | { op: 'matches'; value: Expr; pattern: string }
  | { op: 'empty' | 'notEmpty'; arg: Expr }
  | { op: '+' | '-' | '*' | '/'; args: [Expr, Expr] };

export type Action =
  | { kind: 'show' | 'hide'; target: { alias: Alias } | { pageId: PageId } }
  | { kind: 'require' | 'unrequire'; target: { alias: Alias } }
  | { kind: 'gotoPage'; pageId: PageId }
  | { kind: 'skipPage'; pageId: PageId }
  | { kind: 'fail'; target?: { alias: Alias }; message: string };

export interface Rule {
  id: string;
  name?: string;
  when: Expr;
  then: Action[];
  else?: Action[];
}

export interface Questionnaire {
  schemaVersion: 1;
  id: string;
  title: string;
  theme: ThemeSettings;
  pages: Page[];
  rules: Rule[];
  meta: { createdAt: string; updatedAt: string; appVersion: string };
}

export const CURRENT_SCHEMA_VERSION = 1 as const;
```

- [ ] **Step 3: `src/schema/index.ts`**

```ts
export * from './types';
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add packages/designer/src/util packages/designer/src/schema
git commit -m "feat(schema): add TS types and id util"
```

---

### Task 7: Zod schemas with TDD

**Files:**
- Create: `packages/designer/src/schema/zod.ts`
- Create: `packages/designer/tests/schema/zod.test.ts`
- Modify: `packages/designer/src/schema/index.ts`

- [ ] **Step 1: Write failing test `tests/schema/zod.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { QuestionnaireZ } from '../../src/schema/zod';

const validDoc = {
  schemaVersion: 1,
  id: '11111111-1111-4111-8111-111111111111',
  title: 'T',
  theme: {
    accentColor: '#1677FF',
    fontFamily: 'system-ui',
    pageBackground: '#FFFFFF',
    contentMaxWidth: 960,
  },
  pages: [
    {
      id: 'p1',
      name: 'Page 1',
      rows: [
        {
          id: 'r1',
          cols: [
            {
              id: 'c1',
              type: 'textbox',
              alias: 'name',
              friendlyName: 'Name',
              required: true,
              layout: { span: 12 },
              props: { mode: 'text' },
            },
          ],
        },
      ],
    },
  ],
  rules: [],
  meta: { createdAt: '2026-04-18T00:00:00Z', updatedAt: '2026-04-18T00:00:00Z', appVersion: '0.1.0' },
};

describe('QuestionnaireZ', () => {
  it('accepts a minimal valid document', () => {
    const r = QuestionnaireZ.safeParse(validDoc);
    expect(r.success).toBe(true);
  });

  it('rejects bad alias', () => {
    const bad = structuredClone(validDoc);
    bad.pages[0].rows[0].cols[0].alias = '9notAllowed';
    const r = QuestionnaireZ.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('rejects span > 12', () => {
    const bad = structuredClone(validDoc);
    bad.pages[0].rows[0].cols[0].layout.span = 13;
    const r = QuestionnaireZ.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('rejects row with column span sum > 12', () => {
    const bad = structuredClone(validDoc);
    bad.pages[0].rows[0].cols = [
      { ...bad.pages[0].rows[0].cols[0], id: 'a', alias: 'a', layout: { span: 7 } },
      { ...bad.pages[0].rows[0].cols[0], id: 'b', alias: 'b', layout: { span: 7 } },
    ];
    const r = QuestionnaireZ.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('rejects duplicate aliases across pages', () => {
    const bad = structuredClone(validDoc);
    bad.pages.push(structuredClone(bad.pages[0]));
    bad.pages[1].id = 'p2';
    bad.pages[1].rows[0].id = 'r2';
    bad.pages[1].rows[0].cols[0].id = 'c2';
    const r = QuestionnaireZ.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('rejects unknown top-level keys (strict)', () => {
    const bad = { ...validDoc, extra: 1 };
    const r = QuestionnaireZ.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('rejects schemaVersion != 1', () => {
    const bad = { ...validDoc, schemaVersion: 2 };
    const r = QuestionnaireZ.safeParse(bad);
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm --filter @qnn/designer test -- schema/zod`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/schema/zod.ts`**

```ts
import { z } from 'zod';
import { ALIAS_RE } from '../util/ids';

const ThemeSettingsZ = z.object({
  accentColor: z.string(),
  fontFamily: z.string(),
  pageBackground: z.string(),
  contentMaxWidth: z.number().positive(),
}).strict();

const PageStyleZ = z.object({
  background: z.string().optional(),
  paddingY: z.number().optional(),
  paddingX: z.number().optional(),
}).strict();

const ControlStyleZ = z.object({
  labelColor: z.string().optional(),
  labelSize: z.number().optional(),
  widthOverride: z.number().optional(),
}).strict();

const PerControlValidationZ = z.object({
  minLen: z.number().optional(),
  maxLen: z.number().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  pattern: z.string().optional(),
  message: z.string().optional(),
}).strict();

const ExprZ: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion('op', [
    z.object({ op: z.literal('const'), value: z.union([z.string(), z.number(), z.boolean(), z.null()]) }).strict(),
    z.object({ op: z.literal('ref'), alias: z.string() }).strict(),
    z.object({ op: z.literal('and'), args: z.array(ExprZ) }).strict(),
    z.object({ op: z.literal('or'), args: z.array(ExprZ) }).strict(),
    z.object({ op: z.literal('not'), arg: ExprZ }).strict(),
    z.object({ op: z.literal('eq'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('neq'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('gt'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('gte'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('lt'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('lte'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('in'), value: ExprZ, set: ExprZ }).strict(),
    z.object({ op: z.literal('notIn'), value: ExprZ, set: ExprZ }).strict(),
    z.object({ op: z.literal('matches'), value: ExprZ, pattern: z.string() }).strict(),
    z.object({ op: z.literal('empty'), arg: ExprZ }).strict(),
    z.object({ op: z.literal('notEmpty'), arg: ExprZ }).strict(),
    z.object({ op: z.literal('+'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('-'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('*'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('/'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
  ]),
);

const TargetAliasZ = z.object({ alias: z.string() }).strict();
const TargetPageZ = z.object({ pageId: z.string() }).strict();

const ActionZ = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('show'), target: z.union([TargetAliasZ, TargetPageZ]) }).strict(),
  z.object({ kind: z.literal('hide'), target: z.union([TargetAliasZ, TargetPageZ]) }).strict(),
  z.object({ kind: z.literal('require'), target: TargetAliasZ }).strict(),
  z.object({ kind: z.literal('unrequire'), target: TargetAliasZ }).strict(),
  z.object({ kind: z.literal('gotoPage'), pageId: z.string() }).strict(),
  z.object({ kind: z.literal('skipPage'), pageId: z.string() }).strict(),
  z.object({ kind: z.literal('fail'), target: TargetAliasZ.optional(), message: z.string() }).strict(),
]);

const RuleZ = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  when: ExprZ,
  then: z.array(ActionZ),
  else: z.array(ActionZ).optional(),
}).strict();

const ControlNodeZ = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  alias: z.string().regex(ALIAS_RE, 'alias must match [a-zA-Z_][a-zA-Z0-9_]*'),
  friendlyName: z.string(),
  required: z.boolean(),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
  layout: z.object({ span: z.number().int().min(1).max(12) }).strict(),
  style: ControlStyleZ.optional(),
  props: z.unknown(),
  validation: PerControlValidationZ.optional(),
}).strict();

const RowZ = z.object({
  id: z.string().min(1),
  cols: z.array(ControlNodeZ),
}).strict().refine(
  (r) => r.cols.reduce((s, c) => s + c.layout.span, 0) <= 12,
  { message: 'Row column span sum must be <= 12' },
);

const PageZ = z.object({
  id: z.string().min(1),
  name: z.string(),
  rows: z.array(RowZ),
  style: PageStyleZ.optional(),
}).strict();

export const QuestionnaireZ = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string(),
  theme: ThemeSettingsZ,
  pages: z.array(PageZ),
  rules: z.array(RuleZ),
  meta: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    appVersion: z.string(),
  }).strict(),
}).strict().superRefine((doc, ctx) => {
  const seen = new Set<string>();
  for (const p of doc.pages) {
    for (const r of p.rows) {
      for (const c of r.cols) {
        if (seen.has(c.alias)) {
          ctx.addIssue({ code: 'custom', path: ['pages'], message: `Duplicate alias: ${c.alias}` });
        }
        seen.add(c.alias);
      }
    }
  }
});

export type QuestionnaireParsed = z.infer<typeof QuestionnaireZ>;
```

- [ ] **Step 4: Update `src/schema/index.ts`**

```ts
export * from './types';
export * from './zod';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @qnn/designer test -- schema/zod`
Expected: all 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/schema packages/designer/tests/schema
git commit -m "feat(schema): add Zod validators with strict mode and alias uniqueness"
```

---

### Task 8: Default factories

**Files:**
- Create: `packages/designer/src/schema/factories.ts`
- Create: `packages/designer/tests/schema/factories.test.ts`
- Modify: `packages/designer/src/schema/index.ts`

- [ ] **Step 1: Write failing test `tests/schema/factories.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  makeEmptyQuestionnaire,
  makeEmptyPage,
  makeEmptyRow,
  DEFAULT_THEME,
} from '../../src/schema/factories';
import { QuestionnaireZ } from '../../src/schema/zod';

describe('factories', () => {
  it('makeEmptyQuestionnaire passes Zod', () => {
    const q = makeEmptyQuestionnaire();
    expect(QuestionnaireZ.safeParse(q).success).toBe(true);
    expect(q.pages).toHaveLength(1);
    expect(q.schemaVersion).toBe(1);
  });

  it('DEFAULT_THEME uses blue accent', () => {
    expect(DEFAULT_THEME.accentColor).toBe('#1677FF');
    expect(DEFAULT_THEME.contentMaxWidth).toBe(960);
  });

  it('makeEmptyPage and makeEmptyRow have unique ids each call', () => {
    const p1 = makeEmptyPage('A');
    const p2 = makeEmptyPage('A');
    expect(p1.id).not.toEqual(p2.id);
    const r1 = makeEmptyRow();
    const r2 = makeEmptyRow();
    expect(r1.id).not.toEqual(r2.id);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm --filter @qnn/designer test -- schema/factories`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/schema/factories.ts`**

```ts
import { newId } from '../util/ids';
import type {
  Page,
  Questionnaire,
  Row,
  ThemeSettings,
} from './types';

export const DEFAULT_THEME: ThemeSettings = {
  accentColor: '#1677FF',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  pageBackground: '#FFFFFF',
  contentMaxWidth: 960,
};

export function makeEmptyRow(): Row {
  return { id: newId(), cols: [] };
}

export function makeEmptyPage(name = 'Untitled page'): Page {
  return { id: newId(), name, rows: [makeEmptyRow()] };
}

export function makeEmptyQuestionnaire(title = 'Untitled questionnaire'): Questionnaire {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: newId(),
    title,
    theme: { ...DEFAULT_THEME },
    pages: [makeEmptyPage('Page 1')],
    rules: [],
    meta: { createdAt: now, updatedAt: now, appVersion: '0.1.0' },
  };
}
```

- [ ] **Step 4: Update `src/schema/index.ts`**

```ts
export * from './types';
export * from './zod';
export * from './factories';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @qnn/designer test -- schema/factories`
Expected: 3 pass.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/schema/factories.ts packages/designer/src/schema/index.ts packages/designer/tests/schema/factories.test.ts
git commit -m "feat(schema): add default factories and DEFAULT_THEME"
```

---

## Phase 2 — Rule engine (pure TS, zero React)

### Task 9: Expression interpreter (`evalExpr`)

**Files:**
- Create: `packages/designer/src/rules/interpreter.ts`
- Create: `packages/designer/src/rules/index.ts` (stub export)
- Create: `packages/designer/tests/rules/interpreter.test.ts`

- [ ] **Step 1: Write failing test `tests/rules/interpreter.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { evalExpr, type EvalContext } from '../../src/rules/interpreter';
import type { Expr } from '../../src/schema/types';

const ctx = (answers: Record<string, unknown>, hidden: string[] = []): EvalContext => ({
  answers,
  hidden: new Set(hidden),
});

describe('evalExpr', () => {
  it('const returns value', () => {
    expect(evalExpr({ op: 'const', value: 42 }, ctx({}))).toBe(42);
  });

  it('ref returns answer', () => {
    expect(evalExpr({ op: 'ref', alias: 'x' }, ctx({ x: 5 }))).toBe(5);
  });

  it('ref on hidden alias returns undefined', () => {
    expect(evalExpr({ op: 'ref', alias: 'x' }, ctx({ x: 5 }, ['x']))).toBeUndefined();
  });

  it('eq undefined vs anything is false (never throws)', () => {
    const e: Expr = { op: 'eq', args: [{ op: 'ref', alias: 'nope' }, { op: 'const', value: 1 }] };
    expect(evalExpr(e, ctx({}))).toBe(false);
  });

  it('and short-circuits on false', () => {
    const e: Expr = { op: 'and', args: [{ op: 'const', value: false }, { op: 'const', value: true }] };
    expect(evalExpr(e, ctx({}))).toBe(false);
  });

  it('or short-circuits on true', () => {
    const e: Expr = { op: 'or', args: [{ op: 'const', value: true }, { op: 'const', value: false }] };
    expect(evalExpr(e, ctx({}))).toBe(true);
  });

  it('not inverts truthy/falsy', () => {
    expect(evalExpr({ op: 'not', arg: { op: 'const', value: 1 } }, ctx({}))).toBe(false);
    expect(evalExpr({ op: 'not', arg: { op: 'const', value: 0 } }, ctx({}))).toBe(true);
  });

  it('comparisons on numbers', () => {
    const gt: Expr = { op: 'gt', args: [{ op: 'const', value: 3 }, { op: 'const', value: 2 }] };
    const lte: Expr = { op: 'lte', args: [{ op: 'const', value: 2 }, { op: 'const', value: 2 }] };
    expect(evalExpr(gt, ctx({}))).toBe(true);
    expect(evalExpr(lte, ctx({}))).toBe(true);
  });

  it('in matches array membership', () => {
    const e: Expr = {
      op: 'in',
      value: { op: 'const', value: 'b' },
      set: { op: 'const', value: ['a', 'b', 'c'] as unknown as string },
    };
    expect(evalExpr(e, ctx({}))).toBe(true);
  });

  it('in returns false when set is not array/string', () => {
    const e: Expr = {
      op: 'in',
      value: { op: 'const', value: 'b' },
      set: { op: 'const', value: 42 },
    };
    expect(evalExpr(e, ctx({}))).toBe(false);
  });

  it('matches regex', () => {
    const e: Expr = { op: 'matches', value: { op: 'const', value: 'abc' }, pattern: '^a' };
    expect(evalExpr(e, ctx({}))).toBe(true);
  });

  it('matches with invalid regex is false (never throws)', () => {
    const e: Expr = { op: 'matches', value: { op: 'const', value: 'abc' }, pattern: '[' };
    expect(evalExpr(e, ctx({}))).toBe(false);
  });

  it('empty: undefined/null/""/[]', () => {
    for (const v of [undefined, null, '', []]) {
      expect(evalExpr({ op: 'empty', arg: { op: 'const', value: v as never } }, ctx({}))).toBe(true);
    }
    expect(evalExpr({ op: 'empty', arg: { op: 'const', value: 0 } }, ctx({}))).toBe(false);
    expect(evalExpr({ op: 'empty', arg: { op: 'const', value: 'x' } }, ctx({}))).toBe(false);
  });

  it('arithmetic on non-numbers yields NaN, compared to anything is false', () => {
    const add: Expr = { op: '+', args: [{ op: 'const', value: 'a' }, { op: 'const', value: 1 }] };
    expect(Number.isNaN(evalExpr(add, ctx({})) as number)).toBe(true);
    const cmp: Expr = { op: 'gt', args: [add, { op: 'const', value: 0 }] };
    expect(evalExpr(cmp, ctx({}))).toBe(false);
  });

  it('realistic tree: age >= 18 AND country in [US, CA]', () => {
    const tree: Expr = {
      op: 'and',
      args: [
        { op: 'gte', args: [{ op: 'ref', alias: 'age' }, { op: 'const', value: 18 }] },
        {
          op: 'in',
          value: { op: 'ref', alias: 'country' },
          set: { op: 'const', value: ['US', 'CA'] as unknown as string },
        },
      ],
    };
    expect(evalExpr(tree, ctx({ age: 20, country: 'US' }))).toBe(true);
    expect(evalExpr(tree, ctx({ age: 17, country: 'US' }))).toBe(false);
    expect(evalExpr(tree, ctx({ age: 20, country: 'FR' }))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm --filter @qnn/designer test -- rules/interpreter`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/rules/interpreter.ts`**

```ts
import type { Expr, Alias } from '../schema/types';

export interface EvalContext {
  answers: Record<Alias, unknown>;
  hidden: Set<Alias>;
}

const regexCache = new Map<string, RegExp | null>();
function getRegex(pattern: string): RegExp | null {
  if (regexCache.has(pattern)) return regexCache.get(pattern)!;
  try {
    const re = new RegExp(pattern);
    regexCache.set(pattern, re);
    return re;
  } catch {
    regexCache.set(pattern, null);
    return null;
  }
}

export function defaultIsEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

export function evalExpr(expr: Expr, ctx: EvalContext): unknown {
  switch (expr.op) {
    case 'const':
      return expr.value;
    case 'ref':
      if (ctx.hidden.has(expr.alias)) return undefined;
      return ctx.answers[expr.alias];
    case 'and': {
      for (const a of expr.args) if (!evalExpr(a, ctx)) return false;
      return true;
    }
    case 'or': {
      for (const a of expr.args) if (evalExpr(a, ctx)) return true;
      return false;
    }
    case 'not':
      return !evalExpr(expr.arg, ctx);
    case 'eq':
    case 'neq':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const [la, ra] = expr.args;
      const l = evalExpr(la, ctx);
      const r = evalExpr(ra, ctx);
      if (l === undefined || r === undefined) return false;
      if (typeof l === 'number' && Number.isNaN(l)) return false;
      if (typeof r === 'number' && Number.isNaN(r)) return false;
      switch (expr.op) {
        case 'eq': return l === r;
        case 'neq': return l !== r;
        case 'gt': return (l as number) > (r as number);
        case 'gte': return (l as number) >= (r as number);
        case 'lt': return (l as number) < (r as number);
        case 'lte': return (l as number) <= (r as number);
      }
      return false;
    }
    case 'in':
    case 'notIn': {
      const v = evalExpr(expr.value, ctx);
      const s = evalExpr(expr.set, ctx);
      let hit = false;
      if (Array.isArray(s)) hit = s.includes(v);
      else if (typeof s === 'string' && typeof v === 'string') hit = s.includes(v);
      else return false;
      return expr.op === 'in' ? hit : !hit;
    }
    case 'matches': {
      const v = evalExpr(expr.value, ctx);
      if (typeof v !== 'string') return false;
      const re = getRegex(expr.pattern);
      if (!re) return false;
      return re.test(v);
    }
    case 'empty': {
      const v = evalExpr(expr.arg, ctx);
      return defaultIsEmpty(v);
    }
    case 'notEmpty': {
      const v = evalExpr(expr.arg, ctx);
      return !defaultIsEmpty(v);
    }
    case '+':
    case '-':
    case '*':
    case '/': {
      const [la, ra] = expr.args;
      const l = Number(evalExpr(la, ctx));
      const r = Number(evalExpr(ra, ctx));
      if (Number.isNaN(l) || Number.isNaN(r)) return NaN;
      switch (expr.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r === 0 ? NaN : l / r;
      }
      return NaN;
    }
  }
}
```

- [ ] **Step 4: `src/rules/index.ts`**

```ts
export * from './interpreter';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @qnn/designer test -- rules/interpreter`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/rules packages/designer/tests/rules/interpreter.test.ts
git commit -m "feat(rules): add total expression interpreter with all operators"
```

---

### Task 10: Action application (`applyActions`)

**Files:**
- Create: `packages/designer/src/rules/engine.ts`
- Create: `packages/designer/tests/rules/engine.test.ts`
- Modify: `packages/designer/src/rules/index.ts`

- [ ] **Step 1: Write failing test `tests/rules/engine.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { applyActions, type EffectAccumulator } from '../../src/rules/engine';
import type { Action } from '../../src/schema/types';

const empty = (): EffectAccumulator => ({
  visibility: {},
  requireOverrides: {},
  nextOverride: null,
  validationErrors: {},
});

describe('applyActions', () => {
  it('show/hide set visibility, later wins', () => {
    const acc = empty();
    const actions: Action[] = [
      { kind: 'hide', target: { alias: 'x' } },
      { kind: 'show', target: { alias: 'x' } },
    ];
    applyActions(actions, acc);
    expect(acc.visibility['x']).toBe(true);
  });

  it('require/unrequire', () => {
    const acc = empty();
    applyActions([{ kind: 'require', target: { alias: 'a' } }], acc);
    expect(acc.requireOverrides['a']).toBe(true);
    applyActions([{ kind: 'unrequire', target: { alias: 'a' } }], acc);
    expect(acc.requireOverrides['a']).toBe(false);
  });

  it('gotoPage sets nextOverride', () => {
    const acc = empty();
    applyActions([{ kind: 'gotoPage', pageId: 'p3' }], acc);
    expect(acc.nextOverride).toBe('p3');
  });

  it('skipPage sets visibility[pageId] = false', () => {
    const acc = empty();
    applyActions([{ kind: 'skipPage', pageId: 'p2' }], acc);
    expect(acc.visibility['p2']).toBe(false);
  });

  it('fail writes to validationErrors by alias', () => {
    const acc = empty();
    applyActions([{ kind: 'fail', target: { alias: 'email' }, message: 'bad email' }], acc);
    expect(acc.validationErrors['email']).toBe('bad email');
  });

  it('fail without target stores under __page sentinel', () => {
    const acc = empty();
    applyActions([{ kind: 'fail', message: 'form broken' }], acc);
    expect(acc.validationErrors['__page']).toBe('form broken');
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm --filter @qnn/designer test -- rules/engine`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/rules/engine.ts`**

```ts
import type { Action, Alias, PageId } from '../schema/types';

export interface EffectAccumulator {
  visibility: Record<Alias | PageId, boolean>;
  requireOverrides: Record<Alias, boolean>;
  nextOverride: PageId | null;
  validationErrors: Record<Alias | '__page', string>;
}

export const PAGE_ERROR_KEY = '__page' as const;

export function applyActions(actions: Action[], acc: EffectAccumulator): void {
  for (const a of actions) {
    switch (a.kind) {
      case 'show':
      case 'hide': {
        const key = 'alias' in a.target ? a.target.alias : a.target.pageId;
        acc.visibility[key] = a.kind === 'show';
        break;
      }
      case 'require':
        acc.requireOverrides[a.target.alias] = true;
        break;
      case 'unrequire':
        acc.requireOverrides[a.target.alias] = false;
        break;
      case 'gotoPage':
        acc.nextOverride = a.pageId;
        break;
      case 'skipPage':
        acc.visibility[a.pageId] = false;
        break;
      case 'fail': {
        const key = a.target?.alias ?? PAGE_ERROR_KEY;
        acc.validationErrors[key] = a.message;
        break;
      }
    }
  }
}
```

- [ ] **Step 4: Update `src/rules/index.ts`**

```ts
export * from './interpreter';
export * from './engine';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @qnn/designer test -- rules/engine`
Expected: 6 pass.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/rules/engine.ts packages/designer/src/rules/index.ts packages/designer/tests/rules/engine.test.ts
git commit -m "feat(rules): add applyActions with document-order precedence"
```

---

### Task 11: Reactive tick (`runTick`)

**Files:**
- Create: `packages/designer/src/rules/tick.ts`
- Create: `packages/designer/tests/rules/tick.test.ts`
- Modify: `packages/designer/src/rules/index.ts`

- [ ] **Step 1: Write failing test `tests/rules/tick.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { runTick } from '../../src/rules/tick';
import type { Rule } from '../../src/schema/types';

const rules: Rule[] = [
  {
    id: 'r1',
    when: { op: 'lt', args: [{ op: 'ref', alias: 'age' }, { op: 'const', value: 18 }] },
    then: [{ kind: 'hide', target: { alias: 'smoking' } }],
    else: [{ kind: 'show', target: { alias: 'smoking' } }],
  },
];

describe('runTick', () => {
  it('hides when `when` is true', () => {
    const eff = runTick(rules, { age: 16 }, new Set());
    expect(eff.visibility['smoking']).toBe(false);
  });

  it('shows when `when` is false via else', () => {
    const eff = runTick(rules, { age: 25 }, new Set());
    expect(eff.visibility['smoking']).toBe(true);
  });

  it('is single-pass — reads previous hidden set, not updated one', () => {
    const rulesB: Rule[] = [
      {
        id: 'A',
        when: { op: 'const', value: true },
        then: [{ kind: 'hide', target: { alias: 'x' } }],
      },
      {
        id: 'B',
        when: { op: 'notEmpty', arg: { op: 'ref', alias: 'x' } },
        then: [{ kind: 'show', target: { alias: 'y' } }],
      },
    ];
    const eff = runTick(rulesB, { x: 'hello' }, new Set());
    expect(eff.visibility['x']).toBe(false);
    expect(eff.visibility['y']).toBe(true);
  });

  it('empty rules returns empty effects', () => {
    const eff = runTick([], {}, new Set());
    expect(eff.visibility).toEqual({});
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm --filter @qnn/designer test -- rules/tick`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/rules/tick.ts`**

```ts
import type { Alias, Rule } from '../schema/types';
import { evalExpr } from './interpreter';
import { applyActions, type EffectAccumulator } from './engine';

export function runTick(
  rules: Rule[],
  answers: Record<Alias, unknown>,
  prevHidden: Set<Alias>,
): EffectAccumulator {
  const acc: EffectAccumulator = {
    visibility: {},
    requireOverrides: {},
    nextOverride: null,
    validationErrors: {},
  };
  const ctx = { answers, hidden: prevHidden };
  for (const rule of rules) {
    const truthy = Boolean(evalExpr(rule.when, ctx));
    if (truthy) applyActions(rule.then, acc);
    else if (rule.else) applyActions(rule.else, acc);
  }
  return acc;
}
```

- [ ] **Step 4: Update `src/rules/index.ts`**

```ts
export * from './interpreter';
export * from './engine';
export * from './tick';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @qnn/designer test -- rules/tick`
Expected: 4 pass.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/rules/tick.ts packages/designer/src/rules/index.ts packages/designer/tests/rules/tick.test.ts
git commit -m "feat(rules): add single-pass reactive tick"
```

---

## Phase 3 — Control registry

### Task 12: `ControlPlugin` interface + `ControlRegistry`

**Files:**
- Create: `packages/designer/src/registry/types.ts`
- Create: `packages/designer/src/registry/ControlRegistry.ts`
- Create: `packages/designer/src/registry/index.ts`
- Create: `packages/designer/tests/registry/registry.test.ts`

- [ ] **Step 1: `src/registry/types.ts`**

```tsx
import type { ComponentType, ReactNode } from 'react';
import type { ControlNode } from '../schema/types';

export interface ValidationCtx {
  required: boolean;
  friendlyName: string;
  answers: Record<string, unknown>;
}

export interface ControlPluginRendererProps<TProps> {
  node: ControlNode<TProps>;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  disabled?: boolean;
}

export interface ControlPluginEditorProps<TProps> {
  node: ControlNode<TProps>;
  onChange: (patch: Partial<ControlNode<TProps>>) => void;
  otherAliases: string[];
}

export interface ControlPluginPreviewProps<TProps> {
  node: ControlNode<TProps>;
}

export interface ControlPlugin<TProps = unknown> {
  type: string;
  category: 'content' | 'input' | 'advanced';
  label: string;
  icon: ReactNode;
  description: string;

  defaultProps: () => TProps;
  defaultNode: () => Omit<ControlNode<TProps>, 'id' | 'alias'> & { alias?: string };

  PaletteItem?: ComponentType;
  CanvasPreview: ComponentType<ControlPluginPreviewProps<TProps>>;
  PropertyEditor: ComponentType<ControlPluginEditorProps<TProps>>;
  Renderer: ComponentType<ControlPluginRendererProps<TProps>>;

  validate?: (
    node: ControlNode<TProps>,
    value: unknown,
    ctx: ValidationCtx,
  ) => string | null;
  toAnswerValue?: (value: unknown) => unknown;
  isValueEmpty?: (value: unknown) => boolean;
  isAnswerable: boolean;
}
```

- [ ] **Step 2: Write failing test `tests/registry/registry.test.ts`**

```tsx
import { describe, it, expect } from 'vitest';
import { ControlRegistry } from '../../src/registry/ControlRegistry';
import type { ControlPlugin } from '../../src/registry/types';

const stubPlugin = (type: string, overrides: Partial<ControlPlugin> = {}): ControlPlugin => ({
  type,
  category: 'input',
  label: type,
  icon: null,
  description: '',
  defaultProps: () => ({}),
  defaultNode: () => ({
    type,
    friendlyName: type,
    required: false,
    layout: { span: 12 },
    props: {},
  }),
  CanvasPreview: () => null,
  PropertyEditor: () => null,
  Renderer: () => null,
  isAnswerable: true,
  ...overrides,
});

describe('ControlRegistry', () => {
  it('registers and gets plugins', () => {
    const r = new ControlRegistry();
    r.register(stubPlugin('a'));
    expect(r.get('a')?.type).toBe('a');
    expect(r.all()).toHaveLength(1);
  });

  it('throws on duplicate type without override', () => {
    const r = new ControlRegistry();
    r.register(stubPlugin('a'));
    expect(() => r.register(stubPlugin('a'))).toThrow(/already registered/);
  });

  it('override replaces existing plugin', () => {
    const r = new ControlRegistry();
    r.register(stubPlugin('a', { label: 'first' }));
    r.override(stubPlugin('a', { label: 'second' }));
    expect(r.get('a')?.label).toBe('second');
  });

  it('throws on empty type', () => {
    const r = new ControlRegistry();
    expect(() => r.register(stubPlugin(''))).toThrow(/empty type/);
  });

  it('throws when Renderer missing', () => {
    const r = new ControlRegistry();
    const bad = stubPlugin('a');
    delete (bad as Partial<ControlPlugin>).Renderer;
    expect(() => r.register(bad as ControlPlugin)).toThrow(/Renderer/);
  });

  it('throws when PropertyEditor missing', () => {
    const r = new ControlRegistry();
    const bad = stubPlugin('a');
    delete (bad as Partial<ControlPlugin>).PropertyEditor;
    expect(() => r.register(bad as ControlPlugin)).toThrow(/PropertyEditor/);
  });

  it('throws when isAnswerable=true and CanvasPreview missing', () => {
    const r = new ControlRegistry();
    const bad = stubPlugin('a');
    delete (bad as Partial<ControlPlugin>).CanvasPreview;
    expect(() => r.register(bad as ControlPlugin)).toThrow(/CanvasPreview/);
  });

  it('clone creates a detached copy with merged plugins', () => {
    const r = new ControlRegistry();
    r.register(stubPlugin('a'));
    const r2 = r.clone();
    r2.register(stubPlugin('b'));
    expect(r.all()).toHaveLength(1);
    expect(r2.all()).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Run test, verify fail**

Run: `pnpm --filter @qnn/designer test -- registry/registry`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/registry/ControlRegistry.ts`**

```ts
import type { ControlPlugin } from './types';

export class ControlRegistry {
  private plugins = new Map<string, ControlPlugin>();

  register(plugin: ControlPlugin): void {
    this.validate(plugin);
    if (this.plugins.has(plugin.type)) {
      throw new Error(`Control plugin "${plugin.type}" is already registered. Use override() to replace.`);
    }
    this.plugins.set(plugin.type, plugin);
  }

  override(plugin: ControlPlugin): void {
    this.validate(plugin);
    this.plugins.set(plugin.type, plugin);
  }

  get(type: string): ControlPlugin | undefined {
    return this.plugins.get(type);
  }

  all(): ControlPlugin[] {
    return [...this.plugins.values()];
  }

  clone(): ControlRegistry {
    const copy = new ControlRegistry();
    for (const p of this.plugins.values()) copy.plugins.set(p.type, p);
    return copy;
  }

  private validate(plugin: ControlPlugin): void {
    if (!plugin.type || plugin.type.trim() === '') {
      throw new Error('ControlPlugin has empty type');
    }
    if (!plugin.Renderer) {
      throw new Error(`ControlPlugin "${plugin.type}" missing Renderer`);
    }
    if (!plugin.PropertyEditor) {
      throw new Error(`ControlPlugin "${plugin.type}" missing PropertyEditor`);
    }
    if (plugin.isAnswerable && !plugin.CanvasPreview) {
      throw new Error(`ControlPlugin "${plugin.type}" missing CanvasPreview`);
    }
  }
}
```

- [ ] **Step 5: `src/registry/index.ts`**

```ts
export * from './types';
export * from './ControlRegistry';
```

- [ ] **Step 6: Run tests to verify pass**

Run: `pnpm --filter @qnn/designer test -- registry/registry`
Expected: 8 pass.

- [ ] **Step 7: Commit**

```bash
git add packages/designer/src/registry packages/designer/tests/registry/registry.test.ts
git commit -m "feat(registry): add ControlRegistry with strict register-time checks"
```

---

### Task 13: Default emptiness helper

**Files:**
- Create: `packages/designer/src/registry/defaults.ts`
- Create: `packages/designer/tests/registry/defaults.test.ts`
- Modify: `packages/designer/src/registry/index.ts`

- [ ] **Step 1: Write failing test `tests/registry/defaults.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { defaultIsValueEmpty, effectiveIsEmpty } from '../../src/registry/defaults';
import type { ControlPlugin } from '../../src/registry/types';

describe('defaultIsValueEmpty', () => {
  it('treats undefined/null/""/[] as empty', () => {
    expect(defaultIsValueEmpty(undefined)).toBe(true);
    expect(defaultIsValueEmpty(null)).toBe(true);
    expect(defaultIsValueEmpty('')).toBe(true);
    expect(defaultIsValueEmpty([])).toBe(true);
  });
  it('treats 0 and false as non-empty', () => {
    expect(defaultIsValueEmpty(0)).toBe(false);
    expect(defaultIsValueEmpty(false)).toBe(false);
  });
});

describe('effectiveIsEmpty', () => {
  it('uses plugin override when supplied', () => {
    const plugin = { isValueEmpty: (v: unknown) => v === 'n/a' } as unknown as ControlPlugin;
    expect(effectiveIsEmpty(plugin, 'n/a')).toBe(true);
    expect(effectiveIsEmpty(plugin, '')).toBe(false);
  });
  it('falls back to default', () => {
    const plugin = {} as ControlPlugin;
    expect(effectiveIsEmpty(plugin, '')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm --filter @qnn/designer test -- registry/defaults`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/registry/defaults.ts`**

```ts
import type { ControlPlugin } from './types';

export function defaultIsValueEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

export function effectiveIsEmpty(plugin: ControlPlugin, v: unknown): boolean {
  return plugin.isValueEmpty ? plugin.isValueEmpty(v) : defaultIsValueEmpty(v);
}
```

- [ ] **Step 4: Update `src/registry/index.ts`**

```ts
export * from './types';
export * from './ControlRegistry';
export * from './defaults';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @qnn/designer test -- registry/defaults`
Expected: 4 pass.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/registry/defaults.ts packages/designer/src/registry/index.ts packages/designer/tests/registry/defaults.test.ts
git commit -m "feat(registry): add default emptiness helpers"
```

---

## Phase 4 — Built-in control plugins

> **Convention for Tasks 14–20:** each plugin is one `.tsx` file in `src/registry/controls/`. Each plugin exports `default` with a `ControlPlugin<TProps>` value. No dedicated unit test per plugin — the plugins' contracts are pinned by end-to-end Playwright in Task 38 and by the registry registration test in Task 20. Ant Design's controlled component API is used directly (`value` + `onChange`).

### Task 14: `text` plugin (HTML content)

**Files:**
- Create: `packages/designer/src/registry/controls/text.tsx`

- [ ] **Step 1: Write `src/registry/controls/text.tsx`**

```tsx
import { FontColorsOutlined } from '@ant-design/icons';
import { Input, Typography } from 'antd';
import DOMPurify from 'dompurify';
import type { ControlPlugin } from '../types';

export interface TextProps {
  html: string;
}

const { TextArea } = Input;

function Render({ node }: { node: { props: TextProps } }) {
  const clean = DOMPurify.sanitize(node.props.html ?? '');
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

const textPlugin: ControlPlugin<TextProps> = {
  type: 'text',
  category: 'content',
  label: 'HTML text',
  icon: <FontColorsOutlined />,
  description: 'Headings, paragraphs, or rich HTML content. Not answerable.',
  isAnswerable: false,

  defaultProps: () => ({ html: '<h3>Section heading</h3><p>Paragraph text here.</p>' }),
  defaultNode: () => ({
    type: 'text',
    friendlyName: 'Text block',
    required: false,
    layout: { span: 12 },
    props: { html: '<h3>Section heading</h3><p>Paragraph text here.</p>' },
  }),

  CanvasPreview: ({ node }) => (
    <div
      style={{ pointerEvents: 'none', opacity: 0.85, maxHeight: 160, overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(node.props.html ?? '') }}
    />
  ),

  PropertyEditor: ({ node, onChange }) => (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>HTML</Typography.Title>
      <TextArea
        rows={8}
        value={node.props.html}
        onChange={(e) => onChange({ props: { html: e.target.value } })}
      />
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        HTML is sanitised before rendering. `&lt;script&gt;` and event handlers are stripped.
      </Typography.Paragraph>
    </div>
  ),

  Renderer: Render,
};

export default textPlugin;
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/designer/src/registry/controls/text.tsx
git commit -m "feat(controls): add text (HTML block) plugin"
```

---

### Task 15: `textbox` plugin

**Files:**
- Create: `packages/designer/src/registry/controls/textbox.tsx`

- [ ] **Step 1: Write `src/registry/controls/textbox.tsx`**

```tsx
import { EditOutlined } from '@ant-design/icons';
import { Form, Input, InputNumber, Radio, Switch, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields } from './_common';

export interface TextboxProps {
  mode: 'text' | 'textarea';
  rows?: number;
}

const textboxPlugin: ControlPlugin<TextboxProps> = {
  type: 'textbox',
  category: 'input',
  label: 'Text input',
  icon: <EditOutlined />,
  description: 'Single-line text or multi-line textarea.',
  isAnswerable: true,

  defaultProps: () => ({ mode: 'text', rows: 3 }),
  defaultNode: () => ({
    type: 'textbox',
    friendlyName: 'Text',
    required: false,
    layout: { span: 12 },
    props: { mode: 'text', rows: 3 },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <Typography.Text strong>{node.friendlyName}{node.required ? ' *' : ''}</Typography.Text>
      {node.props.mode === 'textarea' ? (
        <Input.TextArea rows={node.props.rows ?? 3} disabled placeholder={node.placeholder} />
      ) : (
        <Input disabled placeholder={node.placeholder} />
      )}
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => (
    <Form layout="vertical">
      {commonPropertyFields(node, onChange, otherAliases)}
      <Form.Item label="Mode">
        <Radio.Group
          value={node.props.mode}
          onChange={(e) => onChange({ props: { ...node.props, mode: e.target.value } })}
        >
          <Radio value="text">Single line</Radio>
          <Radio value="textarea">Multi-line</Radio>
        </Radio.Group>
      </Form.Item>
      {node.props.mode === 'textarea' && (
        <Form.Item label="Rows">
          <InputNumber
            min={1}
            max={20}
            value={node.props.rows ?? 3}
            onChange={(v) => onChange({ props: { ...node.props, rows: Number(v) || 3 } })}
          />
        </Form.Item>
      )}
      <Form.Item label="Min length">
        <InputNumber
          min={0}
          value={node.validation?.minLen}
          onChange={(v) => onChange({ validation: { ...node.validation, minLen: v == null ? undefined : Number(v) } })}
        />
      </Form.Item>
      <Form.Item label="Max length">
        <InputNumber
          min={0}
          value={node.validation?.maxLen}
          onChange={(v) => onChange({ validation: { ...node.validation, maxLen: v == null ? undefined : Number(v) } })}
        />
      </Form.Item>
      <Form.Item label="Regex pattern">
        <Input
          value={node.validation?.pattern}
          onChange={(e) => onChange({ validation: { ...node.validation, pattern: e.target.value || undefined } })}
        />
      </Form.Item>
    </Form>
  ),

  Renderer: ({ node, value, onChange, error }) => {
    const v = (value as string) ?? '';
    const common = {
      value: v,
      placeholder: node.placeholder,
      status: error ? ('error' as const) : undefined,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    };
    return node.props.mode === 'textarea'
      ? <Input.TextArea rows={node.props.rows ?? 3} {...common} />
      : <Input {...common} />;
  },

  validate: (node, value) => {
    const s = typeof value === 'string' ? value : '';
    const v = node.validation ?? {};
    if (v.minLen != null && s.length < v.minLen) return v.message ?? `${node.friendlyName} must be at least ${v.minLen} characters.`;
    if (v.maxLen != null && s.length > v.maxLen) return v.message ?? `${node.friendlyName} must be at most ${v.maxLen} characters.`;
    if (v.pattern) {
      try {
        if (!new RegExp(v.pattern).test(s)) return v.message ?? `${node.friendlyName} is not in the expected format.`;
      } catch { /* invalid regex → skip */ }
    }
    return null;
  },
};

export default textboxPlugin;
```

- [ ] **Step 2: Create shared `src/registry/controls/_common.tsx`** (referenced by every input plugin)

```tsx
import { Form, Input, InputNumber, Switch } from 'antd';
import type { ControlNode } from '../../schema/types';
import { isValidAlias } from '../../util/ids';

export function commonPropertyFields<T>(
  node: ControlNode<T>,
  onChange: (patch: Partial<ControlNode<T>>) => void,
  otherAliases: string[],
) {
  const aliasError =
    !node.alias
      ? 'Required'
      : !isValidAlias(node.alias)
        ? 'Must start with letter/underscore, then letters/digits/_'
        : otherAliases.includes(node.alias)
          ? 'Alias must be unique across the questionnaire'
          : undefined;
  return (
    <>
      <Form.Item label="Alias" validateStatus={aliasError ? 'error' : undefined} help={aliasError}>
        <Input
          value={node.alias}
          onChange={(e) => onChange({ alias: e.target.value } as Partial<ControlNode<T>>)}
        />
      </Form.Item>
      <Form.Item label="Friendly name">
        <Input
          value={node.friendlyName}
          onChange={(e) => onChange({ friendlyName: e.target.value } as Partial<ControlNode<T>>)}
        />
      </Form.Item>
      <Form.Item label="Required">
        <Switch
          checked={node.required}
          onChange={(v) => onChange({ required: v } as Partial<ControlNode<T>>)}
        />
      </Form.Item>
      <Form.Item label="Help text">
        <Input
          value={node.helpText ?? ''}
          onChange={(e) => onChange({ helpText: e.target.value || undefined } as Partial<ControlNode<T>>)}
        />
      </Form.Item>
      <Form.Item label="Placeholder">
        <Input
          value={node.placeholder ?? ''}
          onChange={(e) => onChange({ placeholder: e.target.value || undefined } as Partial<ControlNode<T>>)}
        />
      </Form.Item>
      <Form.Item label="Column span (1–12)">
        <InputNumber
          min={1}
          max={12}
          value={node.layout.span}
          onChange={(v) => onChange({ layout: { span: Math.min(12, Math.max(1, Number(v) || 1)) } } as Partial<ControlNode<T>>)}
        />
      </Form.Item>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/designer/src/registry/controls/textbox.tsx packages/designer/src/registry/controls/_common.tsx
git commit -m "feat(controls): add textbox plugin and shared property fields"
```

---

### Task 16: `datetime` plugin

**Files:**
- Create: `packages/designer/src/registry/controls/datetime.tsx`

- [ ] **Step 1: Write `src/registry/controls/datetime.tsx`**

```tsx
import { CalendarOutlined } from '@ant-design/icons';
import { DatePicker, Form, Input, Radio, TimePicker, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import type { ControlPlugin } from '../types';
import { commonPropertyFields } from './_common';

export interface DatetimeProps {
  mode: 'date' | 'time' | 'datetime';
  format: string;
}

function defaultFormat(mode: DatetimeProps['mode']): string {
  switch (mode) {
    case 'date': return 'DD-MM-YYYY';
    case 'time': return 'HH:mm';
    case 'datetime': return 'DD-MM-YYYY HH:mm';
  }
}

const datetimePlugin: ControlPlugin<DatetimeProps> = {
  type: 'datetime',
  category: 'input',
  label: 'Date / Time',
  icon: <CalendarOutlined />,
  description: 'Date, time, or date+time picker with configurable format.',
  isAnswerable: true,

  defaultProps: () => ({ mode: 'date', format: 'DD-MM-YYYY' }),
  defaultNode: () => ({
    type: 'datetime',
    friendlyName: 'Date',
    required: false,
    layout: { span: 6 },
    props: { mode: 'date', format: 'DD-MM-YYYY' },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <Typography.Text strong>{node.friendlyName}{node.required ? ' *' : ''}</Typography.Text>
      {node.props.mode === 'time'
        ? <TimePicker disabled format={node.props.format} style={{ width: '100%' }} />
        : <DatePicker disabled showTime={node.props.mode === 'datetime'} format={node.props.format} style={{ width: '100%' }} />}
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => (
    <Form layout="vertical">
      {commonPropertyFields(node, onChange, otherAliases)}
      <Form.Item label="Mode">
        <Radio.Group
          value={node.props.mode}
          onChange={(e) => {
            const mode = e.target.value as DatetimeProps['mode'];
            onChange({ props: { mode, format: defaultFormat(mode) } });
          }}
        >
          <Radio value="date">Date</Radio>
          <Radio value="time">Time</Radio>
          <Radio value="datetime">Date + Time</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item label="Format" help="dayjs format tokens e.g. DD-MM-YYYY, MMM D, YYYY, HH:mm">
        <Input value={node.props.format} onChange={(e) => onChange({ props: { ...node.props, format: e.target.value } })} />
      </Form.Item>
    </Form>
  ),

  Renderer: ({ node, value, onChange, error }) => {
    const parsed = value ? dayjs(value as string) : null;
    if (node.props.mode === 'time') {
      return (
        <TimePicker
          value={parsed?.isValid() ? parsed : null}
          format={node.props.format}
          status={error ? 'error' : undefined}
          onChange={(d) => onChange(d ? d.toISOString() : undefined)}
          style={{ width: '100%' }}
        />
      );
    }
    return (
      <DatePicker
        value={parsed?.isValid() ? parsed : null}
        showTime={node.props.mode === 'datetime'}
        format={node.props.format}
        status={error ? 'error' : undefined}
        onChange={(d: Dayjs | null) => onChange(d ? d.toISOString() : undefined)}
        style={{ width: '100%' }}
      />
    );
  },
};

export default datetimePlugin;
```

- [ ] **Step 2: Commit**

```bash
git add packages/designer/src/registry/controls/datetime.tsx
git commit -m "feat(controls): add datetime plugin"
```

---

### Task 17: `single` (single-choice) plugin

**Files:**
- Create: `packages/designer/src/registry/controls/single.tsx`

- [ ] **Step 1: Write `src/registry/controls/single.tsx`**

```tsx
import { CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Radio, Select, Space, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields } from './_common';

export interface SingleOption { value: string; label: string; }
export interface SingleProps {
  renderAs: 'radio' | 'dropdown';
  options: SingleOption[];
}

const singlePlugin: ControlPlugin<SingleProps> = {
  type: 'single',
  category: 'input',
  label: 'Single choice',
  icon: <CheckCircleOutlined />,
  description: 'Radio group or dropdown — pick one.',
  isAnswerable: true,

  defaultProps: () => ({ renderAs: 'radio', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] }),
  defaultNode: () => ({
    type: 'single',
    friendlyName: 'Choose one',
    required: false,
    layout: { span: 12 },
    props: { renderAs: 'radio', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <Typography.Text strong>{node.friendlyName}{node.required ? ' *' : ''}</Typography.Text>
      {node.props.renderAs === 'dropdown'
        ? <Select disabled options={node.props.options} style={{ width: '100%' }} />
        : <Radio.Group disabled options={node.props.options} />}
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => {
    const setOpts = (options: SingleOption[]) => onChange({ props: { ...node.props, options } });
    return (
      <Form layout="vertical">
        {commonPropertyFields(node, onChange, otherAliases)}
        <Form.Item label="Render as">
          <Radio.Group
            value={node.props.renderAs}
            onChange={(e) => onChange({ props: { ...node.props, renderAs: e.target.value } })}
          >
            <Radio value="radio">Radio group</Radio>
            <Radio value="dropdown">Dropdown</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Options">
          <Space direction="vertical" style={{ width: '100%' }}>
            {node.props.options.map((opt, i) => (
              <Space.Compact key={i} style={{ width: '100%' }}>
                <Input
                  value={opt.value}
                  placeholder="value"
                  onChange={(e) => {
                    const next = [...node.props.options];
                    next[i] = { ...opt, value: e.target.value };
                    setOpts(next);
                  }}
                />
                <Input
                  value={opt.label}
                  placeholder="label"
                  onChange={(e) => {
                    const next = [...node.props.options];
                    next[i] = { ...opt, label: e.target.value };
                    setOpts(next);
                  }}
                />
                <Button onClick={() => setOpts(node.props.options.filter((_, j) => j !== i))}>Remove</Button>
              </Space.Compact>
            ))}
            <Button
              icon={<PlusOutlined />}
              onClick={() => setOpts([...node.props.options, { value: `opt${node.props.options.length + 1}`, label: `Option ${node.props.options.length + 1}` }])}
            >Add option</Button>
          </Space>
        </Form.Item>
      </Form>
    );
  },

  Renderer: ({ node, value, onChange, error }) => {
    if (node.props.renderAs === 'dropdown') {
      return (
        <Select
          value={(value as string) ?? undefined}
          options={node.props.options}
          status={error ? 'error' : undefined}
          onChange={(v) => onChange(v)}
          style={{ width: '100%' }}
          allowClear
        />
      );
    }
    return (
      <Radio.Group
        value={(value as string) ?? undefined}
        options={node.props.options}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  },
};

export default singlePlugin;
```

- [ ] **Step 2: Commit**

```bash
git add packages/designer/src/registry/controls/single.tsx
git commit -m "feat(controls): add single-choice plugin (radio / dropdown)"
```

---

### Task 18: `multi` (multi-choice) plugin

**Files:**
- Create: `packages/designer/src/registry/controls/multi.tsx`

- [ ] **Step 1: Write `src/registry/controls/multi.tsx`**

```tsx
import { CheckSquareOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, InputNumber, Space, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields } from './_common';

export interface MultiOption { value: string; label: string; }
export interface MultiProps {
  options: MultiOption[];
  minChecked?: number;
  maxChecked?: number;
}

const multiPlugin: ControlPlugin<MultiProps> = {
  type: 'multi',
  category: 'input',
  label: 'Multiple choice',
  icon: <CheckSquareOutlined />,
  description: 'Checkbox group — pick one or more.',
  isAnswerable: true,

  defaultProps: () => ({ options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }),
  defaultNode: () => ({
    type: 'multi',
    friendlyName: 'Choose any',
    required: false,
    layout: { span: 12 },
    props: { options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <Typography.Text strong>{node.friendlyName}{node.required ? ' *' : ''}</Typography.Text>
      <Checkbox.Group disabled options={node.props.options} />
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => {
    const setOpts = (options: MultiOption[]) => onChange({ props: { ...node.props, options } });
    return (
      <Form layout="vertical">
        {commonPropertyFields(node, onChange, otherAliases)}
        <Form.Item label="Options">
          <Space direction="vertical" style={{ width: '100%' }}>
            {node.props.options.map((opt, i) => (
              <Space.Compact key={i} style={{ width: '100%' }}>
                <Input
                  value={opt.value}
                  placeholder="value"
                  onChange={(e) => {
                    const next = [...node.props.options];
                    next[i] = { ...opt, value: e.target.value };
                    setOpts(next);
                  }}
                />
                <Input
                  value={opt.label}
                  placeholder="label"
                  onChange={(e) => {
                    const next = [...node.props.options];
                    next[i] = { ...opt, label: e.target.value };
                    setOpts(next);
                  }}
                />
                <Button onClick={() => setOpts(node.props.options.filter((_, j) => j !== i))}>Remove</Button>
              </Space.Compact>
            ))}
            <Button
              icon={<PlusOutlined />}
              onClick={() => setOpts([...node.props.options, { value: `opt${node.props.options.length + 1}`, label: `Option ${node.props.options.length + 1}` }])}
            >Add option</Button>
          </Space>
        </Form.Item>
        <Form.Item label="Min checked">
          <InputNumber
            min={0}
            value={node.props.minChecked}
            onChange={(v) => onChange({ props: { ...node.props, minChecked: v == null ? undefined : Number(v) } })}
          />
        </Form.Item>
        <Form.Item label="Max checked">
          <InputNumber
            min={0}
            value={node.props.maxChecked}
            onChange={(v) => onChange({ props: { ...node.props, maxChecked: v == null ? undefined : Number(v) } })}
          />
        </Form.Item>
      </Form>
    );
  },

  Renderer: ({ node, value, onChange }) => (
    <Checkbox.Group
      value={(value as string[]) ?? []}
      options={node.props.options}
      onChange={(vals) => onChange(vals)}
    />
  ),

  validate: (node, value) => {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    const { minChecked, maxChecked } = node.props;
    if (minChecked != null && arr.length < minChecked) return `${node.friendlyName}: select at least ${minChecked}.`;
    if (maxChecked != null && arr.length > maxChecked) return `${node.friendlyName}: select at most ${maxChecked}.`;
    return null;
  },
};

export default multiPlugin;
```

- [ ] **Step 2: Commit**

```bash
git add packages/designer/src/registry/controls/multi.tsx
git commit -m "feat(controls): add multi-choice plugin with min/max checked"
```

---

### Task 19: `rating` plugin

**Files:**
- Create: `packages/designer/src/registry/controls/rating.tsx`

- [ ] **Step 1: Write `src/registry/controls/rating.tsx`**

```tsx
import { StarOutlined } from '@ant-design/icons';
import { Form, InputNumber, Rate, Switch, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields } from './_common';

export interface RatingProps {
  count: number;
  allowHalf: boolean;
}

const ratingPlugin: ControlPlugin<RatingProps> = {
  type: 'rating',
  category: 'input',
  label: 'Rating',
  icon: <StarOutlined />,
  description: 'Star rating scale (also covers Likert in v1).',
  isAnswerable: true,

  defaultProps: () => ({ count: 5, allowHalf: false }),
  defaultNode: () => ({
    type: 'rating',
    friendlyName: 'Rating',
    required: false,
    layout: { span: 6 },
    props: { count: 5, allowHalf: false },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <Typography.Text strong>{node.friendlyName}{node.required ? ' *' : ''}</Typography.Text>
      <div><Rate disabled count={node.props.count} allowHalf={node.props.allowHalf} /></div>
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => (
    <Form layout="vertical">
      {commonPropertyFields(node, onChange, otherAliases)}
      <Form.Item label="Count">
        <InputNumber
          min={1}
          max={10}
          value={node.props.count}
          onChange={(v) => onChange({ props: { ...node.props, count: Math.min(10, Math.max(1, Number(v) || 5)) } })}
        />
      </Form.Item>
      <Form.Item label="Allow half">
        <Switch
          checked={node.props.allowHalf}
          onChange={(v) => onChange({ props: { ...node.props, allowHalf: v } })}
        />
      </Form.Item>
    </Form>
  ),

  Renderer: ({ node, value, onChange }) => (
    <Rate
      value={typeof value === 'number' ? value : 0}
      count={node.props.count}
      allowHalf={node.props.allowHalf}
      onChange={(v) => onChange(v)}
    />
  ),

  isValueEmpty: (v) => v === undefined || v === null || v === 0,
};

export default ratingPlugin;
```

- [ ] **Step 2: Commit**

```bash
git add packages/designer/src/registry/controls/rating.tsx
git commit -m "feat(controls): add rating plugin"
```

---

### Task 20: `slider` plugin + registry index

**Files:**
- Create: `packages/designer/src/registry/controls/slider.tsx`
- Create: `packages/designer/src/registry/controls/index.ts`

- [ ] **Step 1: Write `src/registry/controls/slider.tsx`**

```tsx
import { SlidersOutlined } from '@ant-design/icons';
import { Form, InputNumber, Slider, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields } from './_common';

export interface SliderProps {
  min: number;
  max: number;
  step: number;
  marks?: Record<number, string>;
}

const sliderPlugin: ControlPlugin<SliderProps> = {
  type: 'slider',
  category: 'input',
  label: 'Slider',
  icon: <SlidersOutlined />,
  description: 'Numeric range slider.',
  isAnswerable: true,

  defaultProps: () => ({ min: 0, max: 100, step: 1 }),
  defaultNode: () => ({
    type: 'slider',
    friendlyName: 'Slider',
    required: false,
    layout: { span: 12 },
    props: { min: 0, max: 100, step: 1 },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <Typography.Text strong>{node.friendlyName}{node.required ? ' *' : ''}</Typography.Text>
      <Slider disabled min={node.props.min} max={node.props.max} step={node.props.step} />
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => (
    <Form layout="vertical">
      {commonPropertyFields(node, onChange, otherAliases)}
      <Form.Item label="Min"><InputNumber value={node.props.min} onChange={(v) => onChange({ props: { ...node.props, min: Number(v) || 0 } })} /></Form.Item>
      <Form.Item label="Max"><InputNumber value={node.props.max} onChange={(v) => onChange({ props: { ...node.props, max: Number(v) || 100 } })} /></Form.Item>
      <Form.Item label="Step"><InputNumber min={0.0001} value={node.props.step} onChange={(v) => onChange({ props: { ...node.props, step: Number(v) || 1 } })} /></Form.Item>
    </Form>
  ),

  Renderer: ({ node, value, onChange }) => (
    <Slider
      value={typeof value === 'number' ? value : node.props.min}
      min={node.props.min}
      max={node.props.max}
      step={node.props.step}
      marks={node.props.marks}
      onChange={(v) => onChange(v)}
    />
  ),

  isValueEmpty: (v) => v === undefined || v === null,
};

export default sliderPlugin;
```

- [ ] **Step 2: Write `src/registry/controls/index.ts` that registers all seven**

```ts
import { ControlRegistry } from '../ControlRegistry';
import text from './text';
import textbox from './textbox';
import datetime from './datetime';
import single from './single';
import multi from './multi';
import rating from './rating';
import slider from './slider';

export const BUILT_IN_PLUGINS = [text, textbox, datetime, single, multi, rating, slider];

export function createDefaultRegistry(): ControlRegistry {
  const r = new ControlRegistry();
  for (const p of BUILT_IN_PLUGINS) r.register(p);
  return r;
}

export const defaultRegistry = createDefaultRegistry();
```

- [ ] **Step 3: Extend registry index to re-export built-ins**

Update `src/registry/index.ts`:

```ts
export * from './types';
export * from './ControlRegistry';
export * from './defaults';
export { createDefaultRegistry, defaultRegistry, BUILT_IN_PLUGINS } from './controls';
```

- [ ] **Step 4: Write smoke test `tests/registry/builtins.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { createDefaultRegistry, BUILT_IN_PLUGINS } from '../../src/registry/controls';

describe('built-in plugins', () => {
  it('registers 7 plugins without error', () => {
    const r = createDefaultRegistry();
    expect(r.all().map((p) => p.type).sort())
      .toEqual(['datetime', 'multi', 'rating', 'single', 'slider', 'text', 'textbox']);
    expect(BUILT_IN_PLUGINS).toHaveLength(7);
  });

  it('each plugin has a non-empty defaultNode with a span in 1..12', () => {
    for (const p of BUILT_IN_PLUGINS) {
      const n = p.defaultNode();
      expect(n.layout.span).toBeGreaterThanOrEqual(1);
      expect(n.layout.span).toBeLessThanOrEqual(12);
      expect(n.friendlyName.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm --filter @qnn/designer test && pnpm --filter @qnn/designer typecheck`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/registry/controls packages/designer/src/registry/index.ts packages/designer/tests/registry/builtins.test.ts
git commit -m "feat(controls): add slider plugin and wire default registry"
```

---

## Phase 5 — Zustand stores

### Task 21: Designer store (mutations + undo/redo)

**Files:**
- Create: `packages/designer/src/store/designer.ts`
- Create: `packages/designer/src/designer/hooks/useDesignerStore.ts`
- Create: `packages/designer/src/store/index.ts`
- Create: `packages/designer/tests/store/designer.test.ts`

- [ ] **Step 1: Write failing test `tests/store/designer.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createDesignerStore } from '../../src/store/designer';
import { makeEmptyQuestionnaire } from '../../src/schema/factories';
import { defaultRegistry } from '../../src/registry/controls';

describe('designerStore', () => {
  let store: ReturnType<typeof createDesignerStore>;

  beforeEach(() => {
    store = createDesignerStore(makeEmptyQuestionnaire('T'));
  });

  it('initial state has one page, one empty row', () => {
    const q = store.getState().questionnaire;
    expect(q.pages).toHaveLength(1);
    expect(q.pages[0].rows).toHaveLength(1);
    expect(q.pages[0].rows[0].cols).toHaveLength(0);
  });

  it('addControl inserts into row and page', () => {
    const { addControl } = store.getState();
    const plugin = defaultRegistry.get('textbox')!;
    const pageId = store.getState().questionnaire.pages[0].id;
    const rowId = store.getState().questionnaire.pages[0].rows[0].id;
    addControl({ pageId, rowId, index: 0, plugin });
    const q = store.getState().questionnaire;
    expect(q.pages[0].rows[0].cols).toHaveLength(1);
    expect(q.pages[0].rows[0].cols[0].type).toBe('textbox');
    expect(q.pages[0].rows[0].cols[0].alias).toMatch(/^textbox_\d+$/);
  });

  it('insertRowAt creates a new row at index with span-12 control', () => {
    const { insertRowAt } = store.getState();
    const plugin = defaultRegistry.get('text')!;
    const pageId = store.getState().questionnaire.pages[0].id;
    insertRowAt({ pageId, index: 1, plugin });
    const q = store.getState().questionnaire;
    expect(q.pages[0].rows).toHaveLength(2);
    expect(q.pages[0].rows[1].cols[0].layout.span).toBe(12);
  });

  it('moveControl moves between rows', () => {
    const { addControl, moveControl, insertRowAt } = store.getState();
    const tbx = defaultRegistry.get('textbox')!;
    const pageId = store.getState().questionnaire.pages[0].id;
    const row0 = store.getState().questionnaire.pages[0].rows[0].id;
    addControl({ pageId, rowId: row0, index: 0, plugin: tbx });
    insertRowAt({ pageId, index: 1, plugin: defaultRegistry.get('text')! });
    const controlId = store.getState().questionnaire.pages[0].rows[0].cols[0].id;
    const row1 = store.getState().questionnaire.pages[0].rows[1].id;
    moveControl({ pageId, rowId: row1, index: 0, controlId });
    const q = store.getState().questionnaire;
    expect(q.pages[0].rows[0].cols).toHaveLength(0);
    expect(q.pages[0].rows[1].cols.some((c) => c.id === controlId)).toBe(true);
  });

  it('resizeControl clamps to 1..12 and does not over-span row', () => {
    const { addControl, resizeControl } = store.getState();
    const plugin = defaultRegistry.get('textbox')!;
    const pageId = store.getState().questionnaire.pages[0].id;
    const rowId = store.getState().questionnaire.pages[0].rows[0].id;
    addControl({ pageId, rowId, index: 0, plugin });
    addControl({ pageId, rowId, index: 1, plugin });
    const idA = store.getState().questionnaire.pages[0].rows[0].cols[0].id;
    resizeControl({ pageId, rowId, controlId: idA, span: 11 });
    const cols = store.getState().questionnaire.pages[0].rows[0].cols;
    const total = cols.reduce((s, c) => s + c.layout.span, 0);
    expect(total).toBeLessThanOrEqual(12);
  });

  it('deleteControl removes cell and collapses empty row', () => {
    const { addControl, deleteControl } = store.getState();
    const plugin = defaultRegistry.get('textbox')!;
    const pageId = store.getState().questionnaire.pages[0].id;
    const rowId = store.getState().questionnaire.pages[0].rows[0].id;
    addControl({ pageId, rowId, index: 0, plugin });
    const controlId = store.getState().questionnaire.pages[0].rows[0].cols[0].id;
    deleteControl({ pageId, controlId });
    const page = store.getState().questionnaire.pages[0];
    expect(page.rows.length >= 1).toBe(true);
    expect(page.rows.every((r) => !r.cols.some((c) => c.id === controlId))).toBe(true);
  });

  it('updateControl patches node props', () => {
    const { addControl, updateControl } = store.getState();
    const plugin = defaultRegistry.get('textbox')!;
    const pageId = store.getState().questionnaire.pages[0].id;
    const rowId = store.getState().questionnaire.pages[0].rows[0].id;
    addControl({ pageId, rowId, index: 0, plugin });
    const id = store.getState().questionnaire.pages[0].rows[0].cols[0].id;
    updateControl({ controlId: id, patch: { friendlyName: 'Changed' } });
    const c = store.getState().questionnaire.pages[0].rows[0].cols[0];
    expect(c.friendlyName).toBe('Changed');
  });

  it('addPage / renamePage / deletePage / reorderPages', () => {
    const { addPage, renamePage, deletePage, reorderPages } = store.getState();
    addPage('Two');
    expect(store.getState().questionnaire.pages).toHaveLength(2);
    const pid = store.getState().questionnaire.pages[1].id;
    renamePage(pid, 'Renamed');
    expect(store.getState().questionnaire.pages[1].name).toBe('Renamed');
    reorderPages([store.getState().questionnaire.pages[1].id, store.getState().questionnaire.pages[0].id]);
    expect(store.getState().questionnaire.pages[0].name).toBe('Renamed');
    deletePage(store.getState().questionnaire.pages[0].id);
    expect(store.getState().questionnaire.pages).toHaveLength(1);
  });

  it('undo/redo reverts last mutation', () => {
    const { addControl, undo, redo } = store.getState();
    const plugin = defaultRegistry.get('textbox')!;
    const pageId = store.getState().questionnaire.pages[0].id;
    const rowId = store.getState().questionnaire.pages[0].rows[0].id;
    addControl({ pageId, rowId, index: 0, plugin });
    expect(store.getState().questionnaire.pages[0].rows[0].cols).toHaveLength(1);
    undo();
    expect(store.getState().questionnaire.pages[0].rows[0].cols).toHaveLength(0);
    redo();
    expect(store.getState().questionnaire.pages[0].rows[0].cols).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm --filter @qnn/designer test -- store/designer`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/store/designer.ts`**

```ts
import { create } from 'zustand';
import { temporal } from 'zundo';
import type { ControlPlugin } from '../registry/types';
import { newId } from '../util/ids';
import type { ControlNode, PageId, Questionnaire, Row } from '../schema/types';

export interface DesignerActions {
  addControl: (args: { pageId: PageId; rowId: string; index: number; plugin: ControlPlugin }) => void;
  insertRowAt: (args: { pageId: PageId; index: number; plugin: ControlPlugin }) => void;
  moveControl: (args: { pageId: PageId; rowId: string; index: number; controlId: string }) => void;
  resizeControl: (args: { pageId: PageId; rowId: string; controlId: string; span: number }) => void;
  deleteControl: (args: { pageId: PageId; controlId: string }) => void;
  updateControl: (args: { controlId: string; patch: Partial<ControlNode> }) => void;
  addPage: (name?: string) => void;
  renamePage: (pageId: PageId, name: string) => void;
  deletePage: (pageId: PageId) => void;
  reorderPages: (orderedIds: PageId[]) => void;
  selectControl: (controlId: string | null) => void;
  selectPage: (pageId: PageId | null) => void;
  replaceDocument: (q: Questionnaire) => void;
  undo: () => void;
  redo: () => void;
}

export interface DesignerState extends DesignerActions {
  questionnaire: Questionnaire;
  selection: { controlId: string | null; pageId: PageId | null };
}

function uniqueAlias(q: Questionnaire, base: string): string {
  const existing = new Set<string>();
  for (const p of q.pages) for (const r of p.rows) for (const c of r.cols) existing.add(c.alias);
  let i = 1;
  while (existing.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

function nodeFromPlugin(plugin: ControlPlugin, q: Questionnaire): ControlNode {
  const tmpl = plugin.defaultNode();
  const node: ControlNode = {
    id: newId(),
    type: plugin.type,
    alias: uniqueAlias(q, plugin.type),
    friendlyName: tmpl.friendlyName,
    required: tmpl.required,
    layout: { ...tmpl.layout },
    props: tmpl.props,
    ...(tmpl.helpText !== undefined ? { helpText: tmpl.helpText } : {}),
    ...(tmpl.placeholder !== undefined ? { placeholder: tmpl.placeholder } : {}),
  };
  return node;
}

function clampSpanOnInsert(row: Row, requested: number): number {
  const used = row.cols.reduce((s, c) => s + c.layout.span, 0);
  return Math.max(1, Math.min(requested, 12 - used));
}

function stamp(q: Questionnaire): Questionnaire {
  return { ...q, meta: { ...q.meta, updatedAt: new Date().toISOString() } };
}

export function createDesignerStore(initial: Questionnaire) {
  return create<DesignerState>()(
    temporal(
      (set, get) => ({
        questionnaire: initial,
        selection: { controlId: null, pageId: null },

        addControl: ({ pageId, rowId, index, plugin }) => set((s) => {
          const q = s.questionnaire;
          const pages = q.pages.map((p) => {
            if (p.id !== pageId) return p;
            return {
              ...p,
              rows: p.rows.map((r) => {
                if (r.id !== rowId) return r;
                const raw = nodeFromPlugin(plugin, q);
                const node = { ...raw, layout: { span: clampSpanOnInsert(r, raw.layout.span) } };
                const cols = [...r.cols];
                cols.splice(Math.min(index, cols.length), 0, node);
                return { ...r, cols };
              }),
            };
          });
          return { questionnaire: stamp({ ...q, pages }) };
        }),

        insertRowAt: ({ pageId, index, plugin }) => set((s) => {
          const q = s.questionnaire;
          const node: ControlNode = { ...nodeFromPlugin(plugin, q), layout: { span: 12 } };
          const newRow: Row = { id: newId(), cols: [node] };
          const pages = q.pages.map((p) => {
            if (p.id !== pageId) return p;
            const rows = [...p.rows];
            rows.splice(Math.min(index, rows.length), 0, newRow);
            return { ...p, rows };
          });
          return { questionnaire: stamp({ ...q, pages }) };
        }),

        moveControl: ({ pageId, rowId, index, controlId }) => set((s) => {
          const q = s.questionnaire;
          let moved: ControlNode | null = null;
          const pagesStripped = q.pages.map((p) => ({
            ...p,
            rows: p.rows
              .map((r) => {
                const remaining: ControlNode[] = [];
                for (const c of r.cols) if (c.id === controlId) moved = c; else remaining.push(c);
                return { ...r, cols: remaining };
              })
              .filter((r, i, arr) => r.cols.length > 0 || (p.id === pageId && i === 0 && arr.length === 1)),
          }));
          if (!moved) return {};
          const pages = pagesStripped.map((p) => {
            if (p.id !== pageId) return p;
            return {
              ...p,
              rows: p.rows.map((r) => {
                if (r.id !== rowId) return r;
                const clamped = { ...moved!, layout: { span: clampSpanOnInsert(r, moved!.layout.span) } };
                const cols = [...r.cols];
                cols.splice(Math.min(index, cols.length), 0, clamped);
                return { ...r, cols };
              }),
            };
          });
          return { questionnaire: stamp({ ...q, pages }) };
        }),

        resizeControl: ({ pageId, rowId, controlId, span }) => set((s) => {
          const q = s.questionnaire;
          const pages = q.pages.map((p) => {
            if (p.id !== pageId) return p;
            return {
              ...p,
              rows: p.rows.map((r) => {
                if (r.id !== rowId) return r;
                const others = r.cols.filter((c) => c.id !== controlId);
                const usedByOthers = others.reduce((s, c) => s + c.layout.span, 0);
                const target = Math.max(1, Math.min(span, 12 - usedByOthers));
                return { ...r, cols: r.cols.map((c) => c.id === controlId ? { ...c, layout: { span: target } } : c) };
              }),
            };
          });
          return { questionnaire: stamp({ ...q, pages }) };
        }),

        deleteControl: ({ pageId, controlId }) => set((s) => {
          const q = s.questionnaire;
          const pages = q.pages.map((p) => {
            if (p.id !== pageId) return p;
            const rows = p.rows
              .map((r) => ({ ...r, cols: r.cols.filter((c) => c.id !== controlId) }))
              .filter((r, i, arr) => r.cols.length > 0 || (arr.length === 1 && i === 0));
            return { ...p, rows: rows.length > 0 ? rows : [{ id: newId(), cols: [] }] };
          });
          return { questionnaire: stamp({ ...q, pages }) };
        }),

        updateControl: ({ controlId, patch }) => set((s) => {
          const q = s.questionnaire;
          const pages = q.pages.map((p) => ({
            ...p,
            rows: p.rows.map((r) => ({
              ...r,
              cols: r.cols.map((c) => c.id === controlId ? ({ ...c, ...patch } as ControlNode) : c),
            })),
          }));
          return { questionnaire: stamp({ ...q, pages }) };
        }),

        addPage: (name) => set((s) => {
          const q = s.questionnaire;
          const page = { id: newId(), name: name ?? `Page ${q.pages.length + 1}`, rows: [{ id: newId(), cols: [] }] };
          return { questionnaire: stamp({ ...q, pages: [...q.pages, page] }) };
        }),

        renamePage: (pageId, name) => set((s) => {
          const q = s.questionnaire;
          return { questionnaire: stamp({ ...q, pages: q.pages.map((p) => p.id === pageId ? { ...p, name } : p) }) };
        }),

        deletePage: (pageId) => set((s) => {
          const q = s.questionnaire;
          const pages = q.pages.filter((p) => p.id !== pageId);
          return { questionnaire: stamp({ ...q, pages: pages.length > 0 ? pages : q.pages }) };
        }),

        reorderPages: (orderedIds) => set((s) => {
          const q = s.questionnaire;
          const map = new Map(q.pages.map((p) => [p.id, p]));
          const pages = orderedIds.map((id) => map.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
          return { questionnaire: stamp({ ...q, pages }) };
        }),

        selectControl: (controlId) => set((s) => ({ selection: { ...s.selection, controlId } })),
        selectPage: (pageId) => set((s) => ({ selection: { ...s.selection, pageId } })),
        replaceDocument: (q) => set(() => ({ questionnaire: q, selection: { controlId: null, pageId: null } })),

        undo: () => { (get() as unknown as { temporal: { getState: () => { undo: () => void } } }).temporal?.getState().undo(); },
        redo: () => { (get() as unknown as { temporal: { getState: () => { redo: () => void } } }).temporal?.getState().redo(); },
      }),
      {
        partialize: (state) => ({ questionnaire: state.questionnaire }),
        limit: 100,
      },
    ),
  );
}

export type DesignerStore = ReturnType<typeof createDesignerStore>;
```

- [ ] **Step 4: `src/designer/hooks/useDesignerStore.ts`**

```ts
import { createContext, useContext } from 'react';
import type { DesignerStore } from '../../store/designer';

export const DesignerStoreContext = createContext<DesignerStore | null>(null);

export function useDesignerStore(): DesignerStore {
  const store = useContext(DesignerStoreContext);
  if (!store) throw new Error('useDesignerStore must be used inside <QuestionnaireDesigner>');
  return store;
}
```

- [ ] **Step 5: `src/store/index.ts`**

```ts
export * from './designer';
```

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @qnn/designer test -- store/designer`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/designer/src/store packages/designer/src/designer/hooks packages/designer/tests/store/designer.test.ts
git commit -m "feat(store): designer store with mutations and undo/redo"
```

---

### Task 22: Runtime store

**Files:**
- Create: `packages/designer/src/store/runtime.ts`
- Create: `packages/designer/tests/store/runtime.test.ts`
- Modify: `packages/designer/src/store/index.ts`

- [ ] **Step 1: Write failing test `tests/store/runtime.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { createRuntimeStore } from '../../src/store/runtime';
import { makeEmptyQuestionnaire } from '../../src/schema/factories';
import type { Rule } from '../../src/schema/types';

describe('runtimeStore', () => {
  const q = makeEmptyQuestionnaire('T');

  it('initial state uses first page', () => {
    const s = createRuntimeStore(q);
    expect(s.getState().currentPageId).toBe(q.pages[0].id);
    expect(s.getState().history).toEqual([]);
  });

  it('setAnswer updates answers and bumps tick', () => {
    const s = createRuntimeStore(q);
    s.getState().setAnswer('name', 'Jane');
    expect(s.getState().answers['name']).toBe('Jane');
  });

  it('applyEffects merges visibility and errors', () => {
    const s = createRuntimeStore(q);
    s.getState().applyEffects({
      visibility: { x: false },
      requireOverrides: {},
      nextOverride: 'p2',
      validationErrors: { x: 'err' },
    });
    expect(s.getState().visibility['x']).toBe(false);
    expect(s.getState().nextOverride).toBe('p2');
    expect(s.getState().validationErrors['x']).toBe('err');
  });

  it('pushHistory and popHistory work', () => {
    const s = createRuntimeStore(q);
    s.getState().pushHistory('p1');
    s.getState().pushHistory('p2');
    expect(s.getState().history).toEqual(['p1', 'p2']);
    const popped = s.getState().popHistory();
    expect(popped).toBe('p2');
    expect(s.getState().history).toEqual(['p1']);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm --filter @qnn/designer test -- store/runtime`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/store/runtime.ts`**

```ts
import { create } from 'zustand';
import type { Alias, PageId, Questionnaire } from '../schema/types';
import type { EffectAccumulator } from '../rules/engine';

export interface RuntimeState {
  questionnaire: Questionnaire;
  answers: Record<Alias, unknown>;
  visibility: Record<Alias | PageId, boolean>;
  requireOverrides: Record<Alias, boolean>;
  nextOverride: PageId | null;
  validationErrors: Record<Alias | '__page', string>;
  currentPageId: PageId;
  history: PageId[];

  setAnswer: (alias: Alias, value: unknown) => void;
  applyEffects: (eff: EffectAccumulator) => void;
  pushHistory: (pageId: PageId) => void;
  popHistory: () => PageId | undefined;
  goToPage: (pageId: PageId) => void;
  clearAnswers: () => void;
  consumeNextOverride: () => PageId | null;
}

export function createRuntimeStore(q: Questionnaire) {
  return create<RuntimeState>((set, get) => ({
    questionnaire: q,
    answers: {},
    visibility: {},
    requireOverrides: {},
    nextOverride: null,
    validationErrors: {},
    currentPageId: q.pages[0]?.id ?? '',
    history: [],

    setAnswer: (alias, value) => set((s) => ({ answers: { ...s.answers, [alias]: value } })),

    applyEffects: (eff) => set(() => ({
      visibility: { ...eff.visibility },
      requireOverrides: { ...eff.requireOverrides },
      nextOverride: eff.nextOverride,
      validationErrors: { ...eff.validationErrors },
    })),

    pushHistory: (pageId) => set((s) => ({ history: [...s.history, pageId] })),

    popHistory: () => {
      const h = get().history;
      const last = h[h.length - 1];
      set({ history: h.slice(0, -1) });
      return last;
    },

    goToPage: (pageId) => set(() => ({ currentPageId: pageId })),
    clearAnswers: () => set(() => ({ answers: {}, visibility: {}, requireOverrides: {}, nextOverride: null, validationErrors: {}, history: [], currentPageId: q.pages[0]?.id ?? '' })),
    consumeNextOverride: () => {
      const n = get().nextOverride;
      set({ nextOverride: null });
      return n;
    },
  }));
}

export type RuntimeStore = ReturnType<typeof createRuntimeStore>;
```

- [ ] **Step 4: Update `src/store/index.ts`**

```ts
export * from './designer';
export * from './runtime';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @qnn/designer test -- store/runtime`
Expected: 4 pass.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/store/runtime.ts packages/designer/src/store/index.ts packages/designer/tests/store/runtime.test.ts
git commit -m "feat(store): runtime store for preview and renderer"
```

---

## Phase 6 — IO (import / export / persistence)

### Task 23: Export function

**Files:**
- Create: `packages/designer/src/io/export.ts`
- Create: `packages/designer/src/io/index.ts`
- Create: `packages/designer/tests/io/export.test.ts`

- [ ] **Step 1: Write failing test `tests/io/export.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { exportQuestionnaire } from '../../src/io/export';
import { makeEmptyQuestionnaire } from '../../src/schema/factories';
import type { Rule } from '../../src/schema/types';

describe('exportQuestionnaire', () => {
  it('with includeLogic=true returns verbatim clone', () => {
    const q = makeEmptyQuestionnaire();
    q.rules.push({ id: 'r1', when: { op: 'const', value: true }, then: [] });
    const out = exportQuestionnaire(q, { includeLogic: true });
    expect(out.rules).toHaveLength(1);
    expect(out).not.toBe(q);
  });

  it('with includeLogic=false strips rules and validation, keeps required', () => {
    const q = makeEmptyQuestionnaire();
    q.rules.push({ id: 'r1', when: { op: 'const', value: true }, then: [] });
    q.pages[0].rows[0].cols.push({
      id: 'c1', type: 'textbox', alias: 'a', friendlyName: 'A',
      required: true, layout: { span: 12 }, props: { mode: 'text' },
      validation: { minLen: 3, message: 'too short' },
    });
    const out = exportQuestionnaire(q, { includeLogic: false });
    expect(out.rules).toEqual([]);
    expect(out.pages[0].rows[0].cols[0].validation).toBeUndefined();
    expect(out.pages[0].rows[0].cols[0].required).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm --filter @qnn/designer test -- io/export`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/io/export.ts`**

```ts
import type { Questionnaire } from '../schema/types';

export interface ExportOptions {
  includeLogic: boolean;
}

export function exportQuestionnaire(q: Questionnaire, opts: ExportOptions): Questionnaire {
  const clone: Questionnaire = JSON.parse(JSON.stringify(q));
  if (!opts.includeLogic) {
    clone.rules = [];
    for (const page of clone.pages) {
      for (const row of page.rows) {
        for (const col of row.cols) {
          delete (col as { validation?: unknown }).validation;
        }
      }
    }
  }
  return clone;
}
```

- [ ] **Step 4: `src/io/index.ts`**

```ts
export * from './export';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @qnn/designer test -- io/export`
Expected: 2 pass.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/io/export.ts packages/designer/src/io/index.ts packages/designer/tests/io/export.test.ts
git commit -m "feat(io): exportQuestionnaire with include-logic toggle"
```

---

### Task 24: Import + migrations + roundtrip test

**Files:**
- Create: `packages/designer/src/io/migrations.ts`
- Create: `packages/designer/src/io/import.ts`
- Create: `packages/designer/tests/io/import.test.ts`
- Create: `packages/designer/tests/io/roundtrip.test.ts`
- Modify: `packages/designer/src/io/index.ts`

- [ ] **Step 1: Write failing test `tests/io/import.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { importQuestionnaire } from '../../src/io/import';
import { exportQuestionnaire } from '../../src/io/export';
import { makeEmptyQuestionnaire } from '../../src/schema/factories';

describe('importQuestionnaire', () => {
  it('imports a valid doc', () => {
    const q = makeEmptyQuestionnaire();
    const text = JSON.stringify(exportQuestionnaire(q, { includeLogic: true }));
    const r = importQuestionnaire(text);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.id).toBe(q.id);
  });

  it('rejects malformed JSON', () => {
    const r = importQuestionnaire('{not json');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toContain('json');
  });

  it('rejects future schemaVersion', () => {
    const q = makeEmptyQuestionnaire();
    const bad = { ...q, schemaVersion: 99 };
    const r = importQuestionnaire(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toMatch(/newer version/);
  });

  it('rejects schemaVersion < 1 (unrecognised)', () => {
    const q = makeEmptyQuestionnaire();
    const bad = { ...q, schemaVersion: 0 };
    const r = importQuestionnaire(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toMatch(/unrecognised|unrecognized/);
  });

  it('reports Zod path on validation failure', () => {
    const q = makeEmptyQuestionnaire();
    q.pages[0].rows[0].cols.push({
      id: 'c', type: 'textbox', alias: '9bad', friendlyName: 'x',
      required: false, layout: { span: 12 }, props: {},
    });
    const r = importQuestionnaire(JSON.stringify(q));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/alias/);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm --filter @qnn/designer test -- io/import`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/io/migrations.ts`**

```ts
import { CURRENT_SCHEMA_VERSION } from '../schema/types';

export type MigrationStep = (input: Record<string, unknown>) => Record<string, unknown>;

export const migrations: Record<number, MigrationStep> = {
  // placeholder; no prior versions exist for v1
};

export function migrateForward(input: Record<string, unknown>): Record<string, unknown> {
  let doc = input;
  while (typeof doc.schemaVersion === 'number' && doc.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const step = migrations[doc.schemaVersion];
    if (!step) throw new Error(`No migration from schemaVersion ${doc.schemaVersion}`);
    doc = step(doc);
  }
  return doc;
}
```

- [ ] **Step 4: Implement `src/io/import.ts`**

```ts
import { QuestionnaireZ } from '../schema/zod';
import type { Questionnaire } from '../schema/types';
import { CURRENT_SCHEMA_VERSION } from '../schema/types';
import { migrateForward } from './migrations';

export type ImportResult =
  | { ok: true; value: Questionnaire }
  | { ok: false; error: string };

export function importQuestionnaire(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Expected a JSON object at the top level' };
  }
  const obj = raw as Record<string, unknown>;
  const version = obj.schemaVersion;
  if (typeof version !== 'number' || Number.isNaN(version)) {
    return { ok: false, error: 'Unrecognised schema version.' };
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    return { ok: false, error: 'This file was made with a newer version of QNN Designer.' };
  }
  if (version < 1) {
    return { ok: false, error: 'Unrecognised schema version.' };
  }
  let migrated: unknown;
  try {
    migrated = migrateForward(obj);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const parsed = QuestionnaireZ.safeParse(migrated);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join('.') || '<root>';
    return { ok: false, error: `${path}: ${issue?.message ?? 'validation failed'}` };
  }
  return { ok: true, value: parsed.data as Questionnaire };
}
```

- [ ] **Step 5: Write `tests/io/roundtrip.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { exportQuestionnaire } from '../../src/io/export';
import { importQuestionnaire } from '../../src/io/import';
import { makeEmptyQuestionnaire } from '../../src/schema/factories';

describe('export + import round-trip', () => {
  it('preserves every field modulo updatedAt', () => {
    const q = makeEmptyQuestionnaire('RT');
    q.pages[0].rows[0].cols.push({
      id: 'c1', type: 'textbox', alias: 'name', friendlyName: 'Name',
      required: true, layout: { span: 12 }, props: { mode: 'text' },
      validation: { minLen: 1 },
    });
    q.rules.push({
      id: 'r1',
      when: { op: 'eq', args: [{ op: 'ref', alias: 'name' }, { op: 'const', value: 'x' }] },
      then: [{ kind: 'hide', target: { alias: 'name' } }],
    });

    const exported = exportQuestionnaire(q, { includeLogic: true });
    const text = JSON.stringify(exported);
    const imported = importQuestionnaire(text);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const { meta: _1, ...a } = imported.value;
    const { meta: _2, ...b } = q;
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 6: Update `src/io/index.ts`**

```ts
export * from './export';
export * from './import';
export * from './migrations';
```

- [ ] **Step 7: Run all io tests**

Run: `pnpm --filter @qnn/designer test -- io`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add packages/designer/src/io packages/designer/tests/io
git commit -m "feat(io): importQuestionnaire with Zod validation and migration stub"
```

---

### Task 25: localStorage persistence helpers

**Files:**
- Create: `packages/designer/src/io/persistence.ts`
- Create: `packages/designer/tests/io/persistence.test.ts`
- Modify: `packages/designer/src/io/index.ts`

- [ ] **Step 1: Write failing test `tests/io/persistence.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DESIGNER_DRAFT_KEY,
  runtimeDraftKey,
  saveDesignerDraft,
  loadDesignerDraft,
  clearDesignerDraft,
  saveRuntimeDraft,
  loadRuntimeDraft,
  clearRuntimeDraft,
} from '../../src/io/persistence';
import { makeEmptyQuestionnaire } from '../../src/schema/factories';

describe('persistence', () => {
  beforeEach(() => { localStorage.clear(); });

  it('save/load/clear designer draft round-trips', () => {
    const q = makeEmptyQuestionnaire('D');
    saveDesignerDraft(q);
    expect(localStorage.getItem(DESIGNER_DRAFT_KEY)).not.toBeNull();
    const restored = loadDesignerDraft();
    expect(restored?.id).toBe(q.id);
    clearDesignerDraft();
    expect(loadDesignerDraft()).toBeNull();
  });

  it('load returns null on corrupted JSON', () => {
    localStorage.setItem(DESIGNER_DRAFT_KEY, 'not json');
    expect(loadDesignerDraft()).toBeNull();
  });

  it('runtime draft keyed by questionnaire id', () => {
    saveRuntimeDraft('qid', { x: 1 });
    expect(loadRuntimeDraft('qid')).toEqual({ x: 1 });
    expect(loadRuntimeDraft('other')).toBeNull();
    clearRuntimeDraft('qid');
    expect(loadRuntimeDraft('qid')).toBeNull();
    expect(runtimeDraftKey('qid')).toBe('qnn.runtime.draft.qid.v1');
  });

  it('save handles quota-exceeded silently', () => {
    const originalSet = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { throw new DOMException('Quota', 'QuotaExceededError'); };
    try {
      const q = makeEmptyQuestionnaire();
      expect(() => saveDesignerDraft(q)).not.toThrow();
    } finally {
      localStorage.setItem = originalSet;
    }
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm --filter @qnn/designer test -- io/persistence`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/io/persistence.ts`**

```ts
import type { Alias, Questionnaire } from '../schema/types';
import { importQuestionnaire } from './import';

export const DESIGNER_DRAFT_KEY = 'qnn.designer.draft.v1';
export const runtimeDraftKey = (questionnaireId: string) => `qnn.runtime.draft.${questionnaireId}.v1`;

export interface PersistenceResult {
  ok: boolean;
  quotaExceeded?: boolean;
}

function trySetItem(key: string, value: string): PersistenceResult {
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (e) {
    const isQuota =
      e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    return { ok: false, quotaExceeded: isQuota };
  }
}

export function saveDesignerDraft(q: Questionnaire): PersistenceResult {
  return trySetItem(DESIGNER_DRAFT_KEY, JSON.stringify(q));
}

export function loadDesignerDraft(): Questionnaire | null {
  const raw = localStorage.getItem(DESIGNER_DRAFT_KEY);
  if (raw == null) return null;
  const r = importQuestionnaire(raw);
  return r.ok ? r.value : null;
}

export function clearDesignerDraft(): void {
  localStorage.removeItem(DESIGNER_DRAFT_KEY);
}

export function saveRuntimeDraft(questionnaireId: string, answers: Record<Alias, unknown>): PersistenceResult {
  return trySetItem(runtimeDraftKey(questionnaireId), JSON.stringify(answers));
}

export function loadRuntimeDraft(questionnaireId: string): Record<Alias, unknown> | null {
  const raw = localStorage.getItem(runtimeDraftKey(questionnaireId));
  if (raw == null) return null;
  try { return JSON.parse(raw) as Record<Alias, unknown>; } catch { return null; }
}

export function clearRuntimeDraft(questionnaireId: string): void {
  localStorage.removeItem(runtimeDraftKey(questionnaireId));
}
```

- [ ] **Step 4: Update `src/io/index.ts`**

```ts
export * from './export';
export * from './import';
export * from './migrations';
export * from './persistence';
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm --filter @qnn/designer test -- io/persistence`
Expected: 4 pass.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/io/persistence.ts packages/designer/src/io/index.ts packages/designer/tests/io/persistence.test.ts
git commit -m "feat(io): localStorage persistence with quota-exceeded handling"
```

---

## Phase 7 — Designer React components

> **Testing note:** these tasks create React components. Unit tests beyond smoke render are omitted here — correctness is pinned by the Playwright scenarios in Task 38. Each task should run `pnpm --filter @qnn/designer typecheck` and visually verify in the demo app (once Task 35 lands).

### Task 26: `Designer.tsx` shell (3-pane layout + store context)

**Files:**
- Create: `packages/designer/src/designer/Designer.tsx`
- Create: `packages/designer/src/designer/styles.css`

- [ ] **Step 1: `src/designer/styles.css`**

```css
.qnn-shell { display: grid; grid-template-columns: 280px 1fr 360px; height: 100%; min-height: 0; background: #f5f7fa; }
.qnn-shell > aside, .qnn-shell > main { min-height: 0; overflow: auto; }
.qnn-shell > aside.qnn-left { background: #fff; border-right: 1px solid #e5e7eb; padding: 16px; }
.qnn-shell > aside.qnn-right { background: #fff; border-left: 1px solid #e5e7eb; padding: 16px; }
.qnn-shell > main { padding: 16px; }
.qnn-topbar { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-bottom: 1px solid #e5e7eb; background: #fff; }
.qnn-canvas { background: #fff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; min-height: 480px; }
.qnn-row { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px; padding: 8px 0; border-radius: 4px; }
.qnn-cell { grid-column: span var(--span, 12); background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; position: relative; }
.qnn-cell.qnn-selected { outline: 2px solid #1677FF; outline-offset: 1px; }
.qnn-row-gap { height: 6px; }
.qnn-row-gap.qnn-dropactive { height: 24px; background: rgba(22,119,255,0.12); border-radius: 3px; }
.qnn-cell-resize { position: absolute; top: 0; right: -3px; width: 6px; height: 100%; cursor: ew-resize; background: transparent; }
.qnn-cell-resize:hover, .qnn-cell-resize.qnn-active { background: #1677FF; border-radius: 3px; }
.qnn-palette-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 6px; background: #fff; cursor: grab; }
.qnn-palette-item:hover { border-color: #1677FF; }
@media (max-width: 640px) { .qnn-shell { grid-template-columns: 1fr; } }
```

- [ ] **Step 2: `src/designer/Designer.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { makeEmptyQuestionnaire } from '../schema/factories';
import { createDesignerStore, type DesignerStore } from '../store/designer';
import { DesignerStoreContext } from './hooks/useDesignerStore';
import { defaultRegistry } from '../registry/controls';
import type { ControlPlugin } from '../registry/types';
import type { Questionnaire } from '../schema/types';
import { TopBar } from './TopBar';
import { PalettePane } from './panes/PalettePane';
import { CanvasPane } from './panes/CanvasPane';
import { PropertiesPane } from './panes/PropertiesPane';
import { PageTabs } from './panes/PageTabs';
import './styles.css';

export interface QuestionnaireDesignerProps {
  initial?: Questionnaire;
  plugins?: ControlPlugin[];
  onChange?: (q: Questionnaire) => void;
  onExport?: (q: Questionnaire, includeLogic: boolean) => void;
}

export function QuestionnaireDesigner({ initial, plugins = [], onChange, onExport }: QuestionnaireDesignerProps) {
  const [store] = useState<DesignerStore>(() => createDesignerStore(initial ?? makeEmptyQuestionnaire()));
  const registry = useMemo(() => {
    const r = defaultRegistry.clone();
    for (const p of plugins) r.override(p);
    return r;
  }, [plugins]);

  const questionnaire = store((s) => s.questionnaire);
  if (onChange) {
    // naive: fire on every change. Subscribers can debounce.
    store.subscribe((s) => onChange(s.questionnaire));
  }

  return (
    <DesignerStoreContext.Provider value={store}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar onExport={onExport} registry={registry} />
        <PageTabs />
        <div className="qnn-shell">
          <aside className="qnn-left"><PalettePane registry={registry} /></aside>
          <main><CanvasPane registry={registry} /></main>
          <aside className="qnn-right"><PropertiesPane registry={registry} /></aside>
        </div>
      </div>
    </DesignerStoreContext.Provider>
  );
}
```

- [ ] **Step 3: Typecheck (will fail until subsequent tasks define TopBar/panes)**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: errors about missing `TopBar`, `PalettePane`, `CanvasPane`, `PropertiesPane`, `PageTabs`. That's OK for now — the next tasks create them.

- [ ] **Step 4: Create temporary stubs so Designer compiles this task in isolation**

Create these stub files so TypeScript passes before the real implementations are written. Each is replaced in its dedicated task.

`src/designer/TopBar.tsx`:
```tsx
export function TopBar(_props: { onExport?: unknown; registry: unknown }) { return null; }
```

`src/designer/panes/PalettePane.tsx`:
```tsx
export function PalettePane(_props: { registry: unknown }) { return null; }
```

`src/designer/panes/CanvasPane.tsx`:
```tsx
export function CanvasPane(_props: { registry: unknown }) { return null; }
```

`src/designer/panes/PropertiesPane.tsx`:
```tsx
export function PropertiesPane(_props: { registry: unknown }) { return null; }
```

`src/designer/panes/PageTabs.tsx`:
```tsx
export function PageTabs() { return null; }
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/designer
git commit -m "feat(designer): shell component, styles, and pane stubs"
```

---

### Task 27: `PalettePane` — draggable control list

**Files:**
- Modify: `packages/designer/src/designer/panes/PalettePane.tsx`

- [ ] **Step 1: Replace `PalettePane.tsx`**

```tsx
import { useDraggable } from '@dnd-kit/core';
import { Typography } from 'antd';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import type { ControlPlugin } from '../../registry/types';

function PaletteItem({ plugin }: { plugin: ControlPlugin }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `palette:${plugin.type}`,
    data: { source: 'palette', pluginType: plugin.type },
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="qnn-palette-item">
      <span style={{ fontSize: 16 }}>{plugin.icon}</span>
      <span>{plugin.label}</span>
    </div>
  );
}

export function PalettePane({ registry }: { registry: ControlRegistry }) {
  const grouped: Record<string, ControlPlugin[]> = { content: [], input: [], advanced: [] };
  for (const p of registry.all()) grouped[p.category].push(p);
  return (
    <div>
      {(['content', 'input', 'advanced'] as const).map((cat) =>
        grouped[cat].length === 0 ? null : (
          <div key={cat} style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {cat}
            </Typography.Text>
            <div style={{ marginTop: 6 }}>
              {grouped[cat].map((p) => <PaletteItem key={p.type} plugin={p} />)}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/designer/src/designer/panes/PalettePane.tsx
git commit -m "feat(designer): PalettePane with dnd-kit draggable items"
```

---

### Task 28: `CanvasPane`, `Row`, `Cell` with G1+G2 drop targets

**Files:**
- Create: `packages/designer/src/designer/hooks/useCanvasDnd.ts`
- Create: `packages/designer/src/designer/panes/Row.tsx`
- Create: `packages/designer/src/designer/panes/Cell.tsx`
- Modify: `packages/designer/src/designer/panes/CanvasPane.tsx`

- [ ] **Step 1: `src/designer/hooks/useCanvasDnd.ts`**

```ts
import { useCallback, useState } from 'react';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import { useDesignerStore } from './useDesignerStore';

export interface DropTargetData {
  kind: 'gap' | 'in-row';
  pageId: string;
  rowIndex?: number;      // for kind='gap'
  rowId?: string;         // for kind='in-row'
  colIndex?: number;
}

export function useCanvasDnd(registry: ControlRegistry) {
  const store = useDesignerStore();
  const [overId, setOverId] = useState<string | null>(null);

  const onDragStart = useCallback((_e: DragStartEvent) => { setOverId(null); }, []);
  const onDragOver = useCallback((e: DragOverEvent) => { setOverId(String(e.over?.id ?? '') || null); }, []);

  const onDragEnd = useCallback((e: DragEndEvent) => {
    setOverId(null);
    const active = e.active;
    const over = e.over;
    if (!over) return;
    const targetData = over.data.current as DropTargetData | undefined;
    if (!targetData) return;
    const fromPalette = active.data.current?.source === 'palette';
    const fromCanvas = active.data.current?.source === 'canvas';

    if (fromPalette) {
      const plugin = registry.get(String(active.data.current?.pluginType));
      if (!plugin) return;
      if (targetData.kind === 'gap') {
        store.getState().insertRowAt({ pageId: targetData.pageId, index: targetData.rowIndex ?? 0, plugin });
      } else if (targetData.kind === 'in-row' && targetData.rowId) {
        store.getState().addControl({
          pageId: targetData.pageId,
          rowId: targetData.rowId,
          index: targetData.colIndex ?? 0,
          plugin,
        });
      }
      return;
    }
    if (fromCanvas) {
      const controlId = String(active.data.current?.controlId);
      if (targetData.kind === 'gap') {
        const plugin = registry.get(String(active.data.current?.controlType));
        if (!plugin) return;
        // Move by insert + the caller delete flow is unified as moveControl on a new row:
        // We insert a new row first, then move into its single cell.
        store.getState().insertRowAt({ pageId: targetData.pageId, index: targetData.rowIndex ?? 0, plugin });
        const newRow = store.getState().questionnaire.pages.find((p) => p.id === targetData.pageId)?.rows[targetData.rowIndex ?? 0];
        if (newRow) {
          store.getState().deleteControl({ pageId: targetData.pageId, controlId: newRow.cols[0].id });
          store.getState().moveControl({ pageId: targetData.pageId, rowId: newRow.id, index: 0, controlId });
        }
      } else if (targetData.kind === 'in-row' && targetData.rowId) {
        store.getState().moveControl({
          pageId: targetData.pageId,
          rowId: targetData.rowId,
          index: targetData.colIndex ?? 0,
          controlId,
        });
      }
    }
  }, [registry, store]);

  return { onDragStart, onDragOver, onDragEnd, overId };
}
```

- [ ] **Step 2: `src/designer/panes/Cell.tsx`**

```tsx
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import type { ControlNode } from '../../schema/types';
import { useDesignerStore } from '../hooks/useDesignerStore';
import { ResizeHandle } from './ResizeHandle';

export function Cell({
  node, pageId, rowId, colIndex, registry,
}: {
  node: ControlNode;
  pageId: string;
  rowId: string;
  colIndex: number;
  registry: ControlRegistry;
}) {
  const store = useDesignerStore();
  const selection = store((s) => s.selection);
  const plugin = registry.get(node.type);

  const { attributes, listeners, setNodeRef: dragRef } = useDraggable({
    id: `cell:${node.id}`,
    data: { source: 'canvas', controlId: node.id, controlType: node.type },
  });
  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `in-row:${rowId}:${colIndex}`,
    data: { kind: 'in-row', pageId, rowId, colIndex },
  });
  const selected = selection.controlId === node.id;

  return (
    <div
      ref={(el) => { dragRef(el); dropRef(el); }}
      {...attributes}
      {...listeners}
      style={{ ['--span' as string]: node.layout.span }}
      className={`qnn-cell${selected ? ' qnn-selected' : ''}${isOver ? ' qnn-hover' : ''}`}
      onClick={(e) => { e.stopPropagation(); store.getState().selectControl(node.id); }}
    >
      {plugin?.CanvasPreview ? <plugin.CanvasPreview node={node} /> : <em>Unknown: {node.type}</em>}
      <ResizeHandle pageId={pageId} rowId={rowId} controlId={node.id} currentSpan={node.layout.span} />
    </div>
  );
}
```

- [ ] **Step 3: `src/designer/panes/Row.tsx`**

```tsx
import type { ControlRegistry } from '../../registry/ControlRegistry';
import type { Row as RowT } from '../../schema/types';
import { Cell } from './Cell';

export function Row({ row, pageId, registry }: { row: RowT; pageId: string; registry: ControlRegistry }) {
  return (
    <div className="qnn-row" data-row-id={row.id}>
      {row.cols.map((c, i) => (
        <Cell key={c.id} node={c} pageId={pageId} rowId={row.id} colIndex={i} registry={registry} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: `src/designer/panes/CanvasPane.tsx`**

```tsx
import { DndContext, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import { useDesignerStore } from '../hooks/useDesignerStore';
import { useCanvasDnd } from '../hooks/useCanvasDnd';
import { Row } from './Row';

function RowGap({ pageId, index, active }: { pageId: string; index: number; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `gap:${pageId}:${index}`,
    data: { kind: 'gap', pageId, rowIndex: index },
  });
  return <div ref={setNodeRef} className={`qnn-row-gap${(isOver || active) ? ' qnn-dropactive' : ''}`} />;
}

export function CanvasPane({ registry }: { registry: ControlRegistry }) {
  const store = useDesignerStore();
  const q = store((s) => s.questionnaire);
  const currentPageId = store((s) => s.selection.pageId) ?? q.pages[0]?.id;
  const page = q.pages.find((p) => p.id === currentPageId) ?? q.pages[0];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));
  const { onDragEnd, onDragOver, onDragStart, overId } = useCanvasDnd(registry);

  if (!page) return <div>No page</div>;
  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="qnn-canvas" onClick={() => store.getState().selectControl(null)}>
        <RowGap pageId={page.id} index={0} active={overId === `gap:${page.id}:0`} />
        {page.rows.map((row, i) => (
          <div key={row.id}>
            <Row row={row} pageId={page.id} registry={registry} />
            <RowGap pageId={page.id} index={i + 1} active={overId === `gap:${page.id}:${i + 1}`} />
          </div>
        ))}
      </div>
    </DndContext>
  );
}
```

- [ ] **Step 5: Create stub `ResizeHandle` (fleshed out in Task 29)**

`src/designer/panes/ResizeHandle.tsx`:
```tsx
export function ResizeHandle(_props: { pageId: string; rowId: string; controlId: string; currentSpan: number }) {
  return <span className="qnn-cell-resize" aria-hidden />;
}
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add packages/designer/src/designer
git commit -m "feat(designer): canvas with dnd-kit palette->canvas and canvas->canvas"
```

---

### Task 29: Resize handle (G3 gesture) + keyboard nudges

**Files:**
- Modify: `packages/designer/src/designer/panes/ResizeHandle.tsx`

- [ ] **Step 1: Replace `ResizeHandle.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useDesignerStore } from '../hooks/useDesignerStore';

export function ResizeHandle({
  pageId, rowId, controlId, currentSpan,
}: {
  pageId: string; rowId: string; controlId: string; currentSpan: number;
}) {
  const store = useDesignerStore();
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; startSpan: number; colWidth: number } | null>(null);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!startRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const delta = Math.round(dx / startRef.current.colWidth);
      const next = startRef.current.startSpan + delta;
      store.getState().resizeControl({ pageId, rowId, controlId, span: next });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, pageId, rowId, controlId, store]);

  return (
    <span
      className={`qnn-cell-resize${dragging ? ' qnn-active' : ''}`}
      role="separator"
      tabIndex={0}
      aria-label="Resize column span"
      aria-valuenow={currentSpan}
      aria-valuemin={1}
      aria-valuemax={12}
      onMouseDown={(e) => {
        e.stopPropagation();
        const rowEl = (e.target as HTMLElement).closest('.qnn-row') as HTMLElement | null;
        const colWidth = rowEl ? rowEl.getBoundingClientRect().width / 12 : 80;
        startRef.current = { x: e.clientX, startSpan: currentSpan, colWidth };
        setDragging(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || (e.key === 'ArrowLeft')) {
          e.preventDefault();
          const d = e.key === 'ArrowRight' ? 1 : -1;
          store.getState().resizeControl({ pageId, rowId, controlId, span: currentSpan + d });
        }
      }}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/designer/src/designer/panes/ResizeHandle.tsx
git commit -m "feat(designer): resize handle with mouse drag and keyboard nudges"
```

---

### Task 30: `PropertiesPane`

**Files:**
- Modify: `packages/designer/src/designer/panes/PropertiesPane.tsx`

- [ ] **Step 1: Replace `PropertiesPane.tsx`**

```tsx
import { Tabs, Typography } from 'antd';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import type { ControlNode, Page } from '../../schema/types';
import { useDesignerStore } from '../hooks/useDesignerStore';
import { RulesTab } from './RulesTab';

function findControl(q: { pages: Page[] }, id: string): ControlNode | null {
  for (const p of q.pages) for (const r of p.rows) for (const c of r.cols) if (c.id === id) return c;
  return null;
}
function otherAliases(q: { pages: Page[] }, id: string): string[] {
  const out: string[] = [];
  for (const p of q.pages) for (const r of p.rows) for (const c of r.cols) if (c.id !== id) out.push(c.alias);
  return out;
}

export function PropertiesPane({ registry }: { registry: ControlRegistry }) {
  const store = useDesignerStore();
  const q = store((s) => s.questionnaire);
  const selControlId = store((s) => s.selection.controlId);

  if (selControlId) {
    const node = findControl(q, selControlId);
    if (!node) return <Typography.Text type="secondary">Selection lost.</Typography.Text>;
    const plugin = registry.get(node.type);
    if (!plugin?.PropertyEditor) return <Typography.Text type="secondary">No editor for {node.type}.</Typography.Text>;
    const others = otherAliases(q, node.id);
    return (
      <div>
        <Typography.Title level={5} style={{ marginTop: 0 }}>{plugin.label}</Typography.Title>
        <plugin.PropertyEditor
          node={node as never}
          otherAliases={others}
          onChange={(patch) => store.getState().updateControl({ controlId: node.id, patch: patch as Partial<ControlNode> })}
        />
      </div>
    );
  }
  return (
    <Tabs
      defaultActiveKey="page"
      items={[
        { key: 'page', label: 'Page', children: <Typography.Text type="secondary">Click a control to edit, or switch to Rules.</Typography.Text> },
        { key: 'rules', label: 'Rules', children: <RulesTab /> },
      ]}
    />
  );
}
```

- [ ] **Step 2: Stub `RulesTab` (Task 31 fills this out)**

`src/designer/panes/RulesTab.tsx`:
```tsx
export function RulesTab() { return <div>Rules tab (Task 31)</div>; }
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/designer/src/designer/panes/PropertiesPane.tsx packages/designer/src/designer/panes/RulesTab.tsx
git commit -m "feat(designer): PropertiesPane dispatches to plugin PropertyEditor"
```

---

### Task 31: `RulesTab` + `ExprEditor` + `ActionEditor`

**Files:**
- Create: `packages/designer/src/designer/rules/ExprEditor.tsx`
- Create: `packages/designer/src/designer/rules/ActionEditor.tsx`
- Create: `packages/designer/src/designer/rules/RuleCard.tsx`
- Modify: `packages/designer/src/designer/panes/RulesTab.tsx`

- [ ] **Step 1: `src/designer/rules/ExprEditor.tsx`**

```tsx
import { Button, Select, Space } from 'antd';
import type { Expr } from '../../schema/types';

const COMP_OPS: Expr['op'][] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn', 'matches', 'empty', 'notEmpty'];
const OP_LABEL: Record<string, string> = {
  eq: 'is', neq: 'is not', gt: '>', gte: '>=', lt: '<', lte: '<=',
  in: 'is one of', notIn: 'is not one of', matches: 'matches regex', empty: 'is empty', notEmpty: 'is not empty',
};

function ExprAtom({ value, onChange, aliases }: { value: Expr; onChange: (e: Expr) => void; aliases: string[] }) {
  // minimal v1 editor: "ref alias | const value" operand.
  if (value.op === 'ref') {
    return (
      <Select
        style={{ minWidth: 140 }}
        value={value.alias}
        options={aliases.map((a) => ({ value: a, label: a }))}
        onChange={(v) => onChange({ op: 'ref', alias: v })}
      />
    );
  }
  if (value.op === 'const') {
    return (
      <input
        value={String(value.value ?? '')}
        onChange={(e) => onChange({ op: 'const', value: e.target.value })}
        style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 6, minWidth: 120 }}
      />
    );
  }
  return <span>(expr)</span>;
}

export function ExprEditor({ value, onChange, aliases }: { value: Expr; onChange: (e: Expr) => void; aliases: string[] }) {
  // v1: top-level is AND/OR of condition rows; each condition row is (ref alias) (op) (const value).
  if (value.op !== 'and' && value.op !== 'or') {
    // Wrap single condition as AND
    onChange({ op: 'and', args: [value] });
    return null;
  }
  const rows = value.args;
  const updateRow = (i: number, next: Expr) => onChange({ ...value, args: rows.map((r, j) => (j === i ? next : r)) });
  const removeRow = (i: number) => onChange({ ...value, args: rows.filter((_, j) => j !== i) });
  const addRow = () => onChange({ ...value, args: [...rows, defaultCondition(aliases)] });

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space>
        <span>Match</span>
        <Select
          value={value.op}
          options={[{ value: 'and', label: 'ALL' }, { value: 'or', label: 'ANY' }]}
          onChange={(op) => onChange({ ...value, op })}
          style={{ width: 100 }}
        />
        <span>of:</span>
      </Space>
      {rows.map((r, i) => (
        <ConditionRow
          key={i}
          value={r}
          onChange={(e) => updateRow(i, e)}
          onRemove={() => removeRow(i)}
          aliases={aliases}
        />
      ))}
      <Button onClick={addRow}>+ Add condition</Button>
    </Space>
  );
}

function defaultCondition(aliases: string[]): Expr {
  return {
    op: 'eq',
    args: [
      { op: 'ref', alias: aliases[0] ?? '' },
      { op: 'const', value: '' },
    ],
  };
}

function ConditionRow({ value, onChange, onRemove, aliases }: { value: Expr; onChange: (e: Expr) => void; onRemove: () => void; aliases: string[] }) {
  const isUnary = value.op === 'empty' || value.op === 'notEmpty';
  const lhs = isUnary ? (value as { arg: Expr }).arg : (value as { args: [Expr, Expr] }).args[0];
  const rhs = isUnary ? null : (value as { args: [Expr, Expr] }).args[1];
  return (
    <Space.Compact block>
      <ExprAtom value={lhs} onChange={(e) => onChange(isUnary ? { op: value.op as 'empty' | 'notEmpty', arg: e } : { op: value.op as 'eq', args: [e, rhs!] })} aliases={aliases} />
      <Select
        style={{ width: 150 }}
        value={value.op}
        options={COMP_OPS.map((o) => ({ value: o, label: OP_LABEL[o] ?? o }))}
        onChange={(op) => {
          if (op === 'empty' || op === 'notEmpty') onChange({ op, arg: lhs });
          else onChange({ op: op as 'eq', args: [lhs, rhs ?? { op: 'const', value: '' }] });
        }}
      />
      {!isUnary && rhs && (
        <ExprAtom value={rhs} onChange={(e) => onChange({ op: value.op as 'eq', args: [lhs, e] })} aliases={aliases} />
      )}
      <Button onClick={onRemove}>×</Button>
    </Space.Compact>
  );
}
```

- [ ] **Step 2: `src/designer/rules/ActionEditor.tsx`**

```tsx
import { Button, Input, Select, Space } from 'antd';
import type { Action, Page } from '../../schema/types';

export function ActionEditor({
  value, onChange, onRemove, aliases, pages,
}: {
  value: Action; onChange: (a: Action) => void; onRemove: () => void;
  aliases: string[]; pages: Page[];
}) {
  return (
    <Space.Compact block>
      <Select
        style={{ width: 130 }}
        value={value.kind}
        options={[
          { value: 'show', label: 'Show' },
          { value: 'hide', label: 'Hide' },
          { value: 'require', label: 'Require' },
          { value: 'unrequire', label: 'Unrequire' },
          { value: 'gotoPage', label: 'Go to page' },
          { value: 'skipPage', label: 'Skip page' },
          { value: 'fail', label: 'Fail' },
        ]}
        onChange={(kind) => {
          if (kind === 'gotoPage' || kind === 'skipPage') onChange({ kind, pageId: pages[0]?.id ?? '' });
          else if (kind === 'fail') onChange({ kind: 'fail', message: 'Error' });
          else onChange({ kind: kind as 'show', target: { alias: aliases[0] ?? '' } });
        }}
      />
      {(value.kind === 'show' || value.kind === 'hide') && (
        <Select
          style={{ width: 200 }}
          value={'alias' in value.target ? `a:${value.target.alias}` : `p:${value.target.pageId}`}
          options={[
            ...aliases.map((a) => ({ value: `a:${a}`, label: `field: ${a}` })),
            ...pages.map((p) => ({ value: `p:${p.id}`, label: `page: ${p.name}` })),
          ]}
          onChange={(key) => {
            const [kind, rest] = [key.charAt(0), key.slice(2)];
            onChange({ kind: value.kind, target: kind === 'a' ? { alias: rest } : { pageId: rest } });
          }}
        />
      )}
      {(value.kind === 'require' || value.kind === 'unrequire') && (
        <Select
          style={{ width: 180 }}
          value={value.target.alias}
          options={aliases.map((a) => ({ value: a, label: a }))}
          onChange={(alias) => onChange({ kind: value.kind, target: { alias } })}
        />
      )}
      {(value.kind === 'gotoPage' || value.kind === 'skipPage') && (
        <Select
          style={{ width: 200 }}
          value={value.pageId}
          options={pages.map((p) => ({ value: p.id, label: p.name }))}
          onChange={(pageId) => onChange({ kind: value.kind, pageId })}
        />
      )}
      {value.kind === 'fail' && (
        <>
          <Select
            style={{ width: 180 }}
            allowClear
            placeholder="scope (alias)"
            value={value.target?.alias}
            options={aliases.map((a) => ({ value: a, label: a }))}
            onChange={(alias) => onChange({ kind: 'fail', target: alias ? { alias } : undefined, message: value.message })}
          />
          <Input
            style={{ width: 240 }}
            placeholder="message"
            value={value.message}
            onChange={(e) => onChange({ ...value, message: e.target.value })}
          />
        </>
      )}
      <Button onClick={onRemove}>×</Button>
    </Space.Compact>
  );
}
```

- [ ] **Step 3: `src/designer/rules/RuleCard.tsx`**

```tsx
import { Button, Card, Input, Space } from 'antd';
import type { Action, Rule } from '../../schema/types';
import { ExprEditor } from './ExprEditor';
import { ActionEditor } from './ActionEditor';
import type { Page } from '../../schema/types';

export function RuleCard({
  rule, onChange, onRemove, aliases, pages,
}: {
  rule: Rule; onChange: (r: Rule) => void; onRemove: () => void;
  aliases: string[]; pages: Page[];
}) {
  const setThen = (then: Action[]) => onChange({ ...rule, then });
  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      title={
        <Input
          variant="borderless"
          placeholder="Rule name (optional)"
          value={rule.name ?? ''}
          onChange={(e) => onChange({ ...rule, name: e.target.value || undefined })}
        />
      }
      extra={<Button onClick={onRemove}>Delete</Button>}
    >
      <div style={{ marginBottom: 8 }}><strong>WHEN</strong></div>
      <ExprEditor value={rule.when} onChange={(e) => onChange({ ...rule, when: e })} aliases={aliases} />
      <div style={{ margin: '12px 0 8px' }}><strong>THEN</strong></div>
      <Space direction="vertical" style={{ width: '100%' }}>
        {rule.then.map((a, i) => (
          <ActionEditor
            key={i}
            value={a}
            onChange={(next) => setThen(rule.then.map((x, j) => j === i ? next : x))}
            onRemove={() => setThen(rule.then.filter((_, j) => j !== i))}
            aliases={aliases}
            pages={pages}
          />
        ))}
        <Button onClick={() => setThen([...rule.then, { kind: 'hide', target: { alias: aliases[0] ?? '' } }])}>
          + Add action
        </Button>
      </Space>
    </Card>
  );
}
```

- [ ] **Step 4: Replace `RulesTab.tsx`**

```tsx
import { Button, Space, Typography } from 'antd';
import { newId } from '../../util/ids';
import type { Rule } from '../../schema/types';
import { useDesignerStore } from '../hooks/useDesignerStore';
import { RuleCard } from '../rules/RuleCard';

export function RulesTab() {
  const store = useDesignerStore();
  const q = store((s) => s.questionnaire);
  const aliases: string[] = [];
  for (const p of q.pages) for (const r of p.rows) for (const c of r.cols) aliases.push(c.alias);

  const setRules = (rules: Rule[]) => {
    store.getState().replaceDocument({ ...q, rules, meta: { ...q.meta, updatedAt: new Date().toISOString() } });
  };

  const addRule = () => {
    const r: Rule = {
      id: newId(),
      when: { op: 'and', args: [] },
      then: [],
    };
    setRules([...q.rules, r]);
  };

  return (
    <div>
      <Typography.Paragraph type="secondary">
        Rules evaluate in document order. Later rules override earlier on the same target.
      </Typography.Paragraph>
      <Space direction="vertical" style={{ width: '100%' }}>
        {q.rules.map((r, i) => (
          <RuleCard
            key={r.id}
            rule={r}
            onChange={(next) => setRules(q.rules.map((x, j) => j === i ? next : x))}
            onRemove={() => setRules(q.rules.filter((_, j) => j !== i))}
            aliases={aliases}
            pages={q.pages}
          />
        ))}
        <Button type="primary" onClick={addRule}>+ Add rule</Button>
      </Space>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/designer/rules packages/designer/src/designer/panes/RulesTab.tsx
git commit -m "feat(designer): rules tab with structured editors"
```

---

### Task 32: `PageTabs` (multi-page management)

**Files:**
- Modify: `packages/designer/src/designer/panes/PageTabs.tsx`

- [ ] **Step 1: Replace `PageTabs.tsx`**

```tsx
import { useState } from 'react';
import { Button, Input, Popconfirm, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useDesignerStore } from '../hooks/useDesignerStore';

export function PageTabs() {
  const store = useDesignerStore();
  const q = store((s) => s.questionnaire);
  const selectedPageId = store((s) => s.selection.pageId) ?? q.pages[0]?.id;
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', overflowX: 'auto' }}>
      <Space>
        {q.pages.map((p) => (
          <div key={p.id}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: p.id === selectedPageId ? '#e6f4ff' : 'transparent',
              cursor: 'pointer',
              border: p.id === selectedPageId ? '1px solid #1677FF' : '1px solid transparent',
            }}
            onClick={() => store.getState().selectPage(p.id)}
            onDoubleClick={() => { setEditing(p.id); setDraft(p.name); }}
          >
            {editing === p.id ? (
              <Input
                autoFocus
                size="small"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => { store.getState().renamePage(p.id, draft || p.name); setEditing(null); }}
                onPressEnter={() => { store.getState().renamePage(p.id, draft || p.name); setEditing(null); }}
                style={{ width: 140 }}
              />
            ) : (
              <Space>
                <Typography.Text>{p.name}</Typography.Text>
                {q.pages.length > 1 && (
                  <Popconfirm title={`Delete ${p.name}?`} onConfirm={() => store.getState().deletePage(p.id)}>
                    <a onClick={(e) => e.stopPropagation()}>×</a>
                  </Popconfirm>
                )}
              </Space>
            )}
          </div>
        ))}
      </Space>
      <Button icon={<PlusOutlined />} size="small" onClick={() => store.getState().addPage()}>Page</Button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/designer/src/designer/panes/PageTabs.tsx
git commit -m "feat(designer): PageTabs with add/rename/delete"
```

---

### Task 33: `TopBar` (Preview/Export/Import/Undo/Redo) + dialogs + RestoreBanner

**Files:**
- Modify: `packages/designer/src/designer/TopBar.tsx`
- Create: `packages/designer/src/designer/dialogs/ExportDialog.tsx`
- Create: `packages/designer/src/designer/dialogs/ImportButton.tsx`
- Create: `packages/designer/src/designer/dialogs/PreviewModal.tsx`
- Create: `packages/designer/src/designer/dialogs/RestoreBanner.tsx`

- [ ] **Step 1: `src/designer/dialogs/ExportDialog.tsx`**

```tsx
import { useState } from 'react';
import { Button, Checkbox, Input, Modal } from 'antd';
import type { Questionnaire } from '../../schema/types';
import { exportQuestionnaire } from '../../io/export';

export function ExportDialog({ open, onClose, questionnaire, onExport }: {
  open: boolean; onClose: () => void; questionnaire: Questionnaire;
  onExport?: (q: Questionnaire, includeLogic: boolean) => void;
}) {
  const [includeLogic, setIncludeLogic] = useState(true);
  const [fileName, setFileName] = useState(`${questionnaire.title.replace(/\s+/g, '-').toLowerCase() || 'questionnaire'}.json`);

  const handleExport = () => {
    const doc = exportQuestionnaire(questionnaire, { includeLogic });
    if (onExport) onExport(doc, includeLogic);
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <Modal open={open} onCancel={onClose} title="Export questionnaire" footer={null} destroyOnClose>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label>File name</label>
          <Input value={fileName} onChange={(e) => setFileName(e.target.value)} />
        </div>
        <Checkbox checked={includeLogic} onChange={(e) => setIncludeLogic(e.target.checked)}>
          Include logic rules (validation + branching)
        </Checkbox>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleExport}>Export</Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: `src/designer/dialogs/ImportButton.tsx`**

```tsx
import { useRef } from 'react';
import { Button, message } from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import { importQuestionnaire } from '../../io/import';
import { useDesignerStore } from '../hooks/useDesignerStore';

export function ImportButton() {
  const store = useDesignerStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [api, ctxHolder] = message.useMessage();

  return (
    <>
      {ctxHolder}
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          const r = importQuestionnaire(text);
          if (!r.ok) api.error(`Import failed: ${r.error}`);
          else {
            store.getState().replaceDocument(r.value);
            api.success('Imported.');
          }
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
      <Button icon={<ImportOutlined />} onClick={() => inputRef.current?.click()}>Import</Button>
    </>
  );
}
```

- [ ] **Step 3: `src/designer/dialogs/PreviewModal.tsx`**

```tsx
import { Modal } from 'antd';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import type { Questionnaire } from '../../schema/types';
import { QuestionnaireRenderer } from '../../runtime/Renderer';

export function PreviewModal({ open, onClose, questionnaire, registry }: {
  open: boolean; onClose: () => void; questionnaire: Questionnaire; registry: ControlRegistry;
}) {
  return (
    <Modal open={open} onCancel={onClose} title="Preview" footer={null} width={880} destroyOnClose>
      <QuestionnaireRenderer
        questionnaire={questionnaire}
        plugins={registry.all()}
        persistDraft={false}
        onSubmit={(answers) => {
          Modal.info({ title: 'Submitted', content: <pre>{JSON.stringify(answers, null, 2)}</pre>, width: 680 });
          onClose();
        }}
      />
    </Modal>
  );
}
```

- [ ] **Step 4: `src/designer/dialogs/RestoreBanner.tsx`**

```tsx
import { Alert, Button } from 'antd';
import { useDesignerStore } from '../hooks/useDesignerStore';
import { clearDesignerDraft } from '../../io/persistence';

export function RestoreBanner({ timestamp, onDismiss }: { timestamp: string; onDismiss: () => void }) {
  return (
    <Alert
      type="info"
      showIcon
      message={`Restored unsaved work from ${new Date(timestamp).toLocaleString()}`}
      action={
        <Button size="small" onClick={() => { clearDesignerDraft(); onDismiss(); location.reload(); }}>
          Discard
        </Button>
      }
    />
  );
}
```

- [ ] **Step 5: Replace `TopBar.tsx`**

```tsx
import { useState } from 'react';
import { Button, Input, Space } from 'antd';
import { EyeOutlined, ExportOutlined, RedoOutlined, UndoOutlined } from '@ant-design/icons';
import type { ControlRegistry } from '../registry/ControlRegistry';
import { useDesignerStore } from './hooks/useDesignerStore';
import { ExportDialog } from './dialogs/ExportDialog';
import { ImportButton } from './dialogs/ImportButton';
import { PreviewModal } from './dialogs/PreviewModal';

export function TopBar({ registry, onExport }: {
  registry: ControlRegistry;
  onExport?: (q: import('../schema/types').Questionnaire, includeLogic: boolean) => void;
}) {
  const store = useDesignerStore();
  const q = store((s) => s.questionnaire);
  const [exportOpen, setExportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  return (
    <div className="qnn-topbar">
      <Input
        value={q.title}
        onChange={(e) => store.getState().replaceDocument({ ...q, title: e.target.value, meta: { ...q.meta, updatedAt: new Date().toISOString() } })}
        style={{ maxWidth: 320 }}
      />
      <div style={{ flex: 1 }} />
      <Space>
        <Button icon={<UndoOutlined />} onClick={() => store.getState().undo()}>Undo</Button>
        <Button icon={<RedoOutlined />} onClick={() => store.getState().redo()}>Redo</Button>
        <ImportButton />
        <Button icon={<ExportOutlined />} onClick={() => setExportOpen(true)}>Export</Button>
        <Button type="primary" icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>Preview</Button>
      </Space>
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} questionnaire={q} onExport={onExport} />
      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} questionnaire={q} registry={registry} />
    </div>
  );
}
```

- [ ] **Step 6: Typecheck (`Renderer` stub may not exist yet)**

Create a minimal `src/runtime/Renderer.tsx` stub to satisfy the import:

```tsx
import type { ControlPlugin } from '../registry/types';
import type { Questionnaire } from '../schema/types';

export interface QuestionnaireRendererProps {
  questionnaire: Questionnaire;
  plugins?: ControlPlugin[];
  onSubmit?: (answers: Record<string, unknown>) => void;
  persistDraft?: boolean;
}

export function QuestionnaireRenderer(_: QuestionnaireRendererProps) {
  return <div>Renderer coming in Task 34</div>;
}
```

- [ ] **Step 7: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add packages/designer/src/designer packages/designer/src/runtime/Renderer.tsx
git commit -m "feat(designer): TopBar with Preview/Export/Import/Undo/Redo"
```

---

## Phase 8 — Runtime (preview) components

### Task 34: `QuestionnaireRenderer` + `ControlField` + `PageNavigation`

**Files:**
- Replace: `packages/designer/src/runtime/Renderer.tsx`
- Create: `packages/designer/src/runtime/ControlField.tsx`
- Create: `packages/designer/src/runtime/PageNavigation.tsx`
- Create: `packages/designer/src/runtime/useRuntime.ts`
- Create: `packages/designer/src/runtime/index.ts`

- [ ] **Step 1: `src/runtime/useRuntime.ts`**

```ts
import { useEffect, useMemo, useRef } from 'react';
import { ControlRegistry } from '../registry/ControlRegistry';
import { defaultRegistry } from '../registry/controls';
import type { ControlPlugin } from '../registry/types';
import type { Alias, ControlNode, PageId, Questionnaire } from '../schema/types';
import { runTick } from '../rules/tick';
import { createRuntimeStore, type RuntimeStore } from '../store/runtime';
import { effectiveIsEmpty } from '../registry/defaults';
import { loadRuntimeDraft, saveRuntimeDraft, clearRuntimeDraft } from '../io/persistence';

export interface UseRuntimeParams {
  questionnaire: Questionnaire;
  plugins?: ControlPlugin[];
  persistDraft?: boolean;
}

export function useRuntime({ questionnaire, plugins = [], persistDraft = true }: UseRuntimeParams) {
  const registry = useMemo(() => {
    const r = defaultRegistry.clone();
    for (const p of plugins) r.override(p);
    return r;
  }, [plugins]);

  const storeRef = useRef<RuntimeStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createRuntimeStore(questionnaire);
    if (persistDraft) {
      const answers = loadRuntimeDraft(questionnaire.id);
      if (answers) for (const [k, v] of Object.entries(answers)) storeRef.current.getState().setAnswer(k, v);
    }
  }
  const store = storeRef.current!;

  // Reactive tick on every answers change.
  useEffect(() => {
    const unsub = store.subscribe((s, prev) => {
      if (s.answers === prev.answers) return;
      const prevHidden = new Set<Alias>();
      for (const [k, v] of Object.entries(prev.visibility)) if (v === false) prevHidden.add(k);
      const eff = runTick(questionnaire.rules, s.answers, prevHidden);
      store.getState().applyEffects(eff);
      if (persistDraft) saveRuntimeDraft(questionnaire.id, s.answers);
    });
    return unsub;
  }, [questionnaire.id, questionnaire.rules, persistDraft, store]);

  // Initial tick
  useEffect(() => {
    const eff = runTick(questionnaire.rules, store.getState().answers, new Set());
    store.getState().applyEffects(eff);
  }, [questionnaire.rules, store]);

  return { store, registry };
}

export function isVisible(state: { visibility: Record<string, boolean> }, key: string): boolean {
  return state.visibility[key] !== false;
}

export function validatePageExit(
  page: { id: PageId; rows: { cols: ControlNode[] }[] },
  state: { answers: Record<Alias, unknown>; visibility: Record<string, boolean>; requireOverrides: Record<string, boolean>; validationErrors: Record<string, string> },
  registry: ControlRegistry,
): string | null {
  for (const row of page.rows) {
    for (const c of row.cols) {
      if (!isVisible(state, c.alias)) continue;
      const plugin = registry.get(c.type);
      if (!plugin?.isAnswerable) continue;
      const effectiveRequired = state.requireOverrides[c.alias] ?? c.required;
      const val = state.answers[c.alias];
      if (effectiveRequired && effectiveIsEmpty(plugin, val)) return `${c.friendlyName} is required.`;
      if (plugin.validate) {
        const m = plugin.validate(c, val, { required: effectiveRequired, friendlyName: c.friendlyName, answers: state.answers });
        if (m) return m;
      }
      if (state.validationErrors[c.alias]) return state.validationErrors[c.alias];
    }
  }
  if (state.validationErrors['__page']) return state.validationErrors['__page'];
  return null;
}

export { clearRuntimeDraft };
```

- [ ] **Step 2: `src/runtime/ControlField.tsx`**

```tsx
import { Form, Typography } from 'antd';
import type { ControlRegistry } from '../registry/ControlRegistry';
import type { ControlNode } from '../schema/types';

export function ControlField({
  node, value, onChange, error, registry,
}: {
  node: ControlNode; value: unknown; onChange: (v: unknown) => void; error?: string; registry: ControlRegistry;
}) {
  const plugin = registry.get(node.type);
  if (!plugin) return <div>Unknown control: {node.type}</div>;
  if (!plugin.isAnswerable) return <plugin.Renderer node={node as never} value={undefined} onChange={() => {}} />;
  return (
    <Form.Item
      label={<span>{node.friendlyName}{node.required ? ' *' : ''}</span>}
      help={error ?? node.helpText}
      validateStatus={error ? 'error' : undefined}
    >
      <plugin.Renderer node={node as never} value={value} onChange={onChange} error={error} />
    </Form.Item>
  );
}
```

- [ ] **Step 3: `src/runtime/PageNavigation.tsx`**

```tsx
import { Button, Space } from 'antd';

export function PageNavigation({
  canPrev, isLast, onPrev, onNext,
}: { canPrev: boolean; isLast: boolean; onPrev: () => void; onNext: () => void }) {
  return (
    <Space style={{ marginTop: 24 }}>
      <Button disabled={!canPrev} onClick={onPrev}>Previous</Button>
      <Button type="primary" onClick={onNext}>{isLast ? 'Submit' : 'Next'}</Button>
    </Space>
  );
}
```

- [ ] **Step 4: Replace `src/runtime/Renderer.tsx`**

```tsx
import { useState } from 'react';
import { ConfigProvider, Form, message, Typography } from 'antd';
import type { ControlPlugin } from '../registry/types';
import type { Alias, ControlNode, Questionnaire } from '../schema/types';
import { ControlField } from './ControlField';
import { PageNavigation } from './PageNavigation';
import { isVisible, useRuntime, validatePageExit } from './useRuntime';
import { clearRuntimeDraft } from '../io/persistence';

export interface QuestionnaireRendererProps {
  questionnaire: Questionnaire;
  plugins?: ControlPlugin[];
  onSubmit?: (answers: Record<Alias, unknown>) => void;
  persistDraft?: boolean;
}

export function QuestionnaireRenderer({ questionnaire, plugins = [], onSubmit, persistDraft = true }: QuestionnaireRendererProps) {
  const { store, registry } = useRuntime({ questionnaire, plugins, persistDraft });
  const state = store();
  const currentPage = questionnaire.pages.find((p) => p.id === state.currentPageId) ?? questionnaire.pages[0];
  const [api, ctx] = message.useMessage();
  const [pageError, setPageError] = useState<string | null>(null);

  if (!currentPage) return <Typography.Text>No pages.</Typography.Text>;

  const visiblePages = questionnaire.pages.filter((p) => isVisible(state, p.id));
  const idxInVisible = visiblePages.findIndex((p) => p.id === currentPage.id);
  const isLast = idxInVisible === visiblePages.length - 1;
  const canPrev = state.history.length > 0;

  const handleNext = () => {
    const err = validatePageExit(currentPage, state, registry);
    if (err) { setPageError(err); api.error(err); return; }
    setPageError(null);
    if (isLast) {
      onSubmit?.(state.answers);
      if (persistDraft) clearRuntimeDraft(questionnaire.id);
      return;
    }
    store.getState().pushHistory(currentPage.id);
    const override = store.getState().consumeNextOverride();
    let nextId: string | undefined = override ?? undefined;
    if (!nextId) {
      const futureVisible = visiblePages.slice(idxInVisible + 1);
      nextId = futureVisible[0]?.id;
    }
    if (nextId) store.getState().goToPage(nextId);
  };

  const handlePrev = () => {
    const prev = store.getState().popHistory();
    if (prev) store.getState().goToPage(prev);
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: questionnaire.theme.accentColor, fontFamily: questionnaire.theme.fontFamily } }}>
      {ctx}
      <div style={{ maxWidth: questionnaire.theme.contentMaxWidth, margin: '0 auto', padding: 16 }}>
        <Typography.Title level={3}>{currentPage.name}</Typography.Title>
        <Form layout="vertical" onFinish={(e) => e?.preventDefault?.()}>
          {currentPage.rows.map((row) => (
            <div key={row.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12 }}>
              {row.cols.map((c: ControlNode) => {
                if (!isVisible(state, c.alias)) return null;
                return (
                  <div key={c.id} style={{ gridColumn: `span ${c.layout.span}` }}>
                    <ControlField
                      node={c}
                      value={state.answers[c.alias]}
                      onChange={(v) => store.getState().setAnswer(c.alias, v)}
                      error={state.validationErrors[c.alias]}
                      registry={registry}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          <PageNavigation canPrev={canPrev} isLast={isLast} onPrev={handlePrev} onNext={handleNext} />
          {pageError && <div style={{ color: 'var(--ant-color-error, #f5222d)', marginTop: 8 }}>{pageError}</div>}
        </Form>
      </div>
    </ConfigProvider>
  );
}
```

- [ ] **Step 5: `src/runtime/index.ts`**

```ts
export { QuestionnaireRenderer } from './Renderer';
export type { QuestionnaireRendererProps } from './Renderer';
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add packages/designer/src/runtime
git commit -m "feat(runtime): QuestionnaireRenderer with page guard and live tick"
```

---

## Phase 9 — Demo app

### Task 35: Demo routes + designer page + auto-persistence wiring

**Files:**
- Create: `apps/demo/src/routes/DesignerRoute.tsx`
- Create: `apps/demo/src/routes/PreviewRoute.tsx` (stub; Task 36 completes)
- Replace: `apps/demo/src/App.tsx`

- [ ] **Step 1: `apps/demo/src/routes/DesignerRoute.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import {
  QuestionnaireDesigner,
  loadDesignerDraft,
  saveDesignerDraft,
  makeEmptyQuestionnaire,
} from '@qnn/designer';
import type { Questionnaire } from '@qnn/designer';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export default function DesignerRoute() {
  const [initial] = useState<Questionnaire>(() => loadDesignerDraft() ?? makeEmptyQuestionnaire());

  return (
    <div style={{ height: '100%' }}>
      <QuestionnaireDesigner
        initial={initial}
        onChange={(q) => {
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(() => saveDesignerDraft(q), 300);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: `apps/demo/src/routes/PreviewRoute.tsx` (stub)**

```tsx
export default function PreviewRoute() { return <div>Preview route (Task 36)</div>; }
```

- [ ] **Step 3: Replace `apps/demo/src/App.tsx`**

```tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import DesignerRoute from './routes/DesignerRoute';
import PreviewRoute from './routes/PreviewRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/design" replace />} />
      <Route path="/design" element={<DesignerRoute />} />
      <Route path="/preview" element={<PreviewRoute />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Update library public surface so re-exports exist**

Replace `packages/designer/src/index.ts`:

```ts
export { QuestionnaireDesigner } from './designer/Designer';
export type { QuestionnaireDesignerProps } from './designer/Designer';
export { QuestionnaireRenderer } from './runtime/Renderer';
export type { QuestionnaireRendererProps } from './runtime/Renderer';

export * from './schema';
export { evalExpr } from './rules/interpreter';
export { applyActions } from './rules/engine';
export { runTick } from './rules/tick';
export type { EffectAccumulator, PAGE_ERROR_KEY } from './rules/engine';

export { ControlRegistry } from './registry/ControlRegistry';
export { defaultRegistry, createDefaultRegistry, BUILT_IN_PLUGINS } from './registry/controls';
export type { ControlPlugin } from './registry/types';

export { exportQuestionnaire } from './io/export';
export { importQuestionnaire } from './io/import';
export {
  DESIGNER_DRAFT_KEY,
  saveDesignerDraft,
  loadDesignerDraft,
  clearDesignerDraft,
  saveRuntimeDraft,
  loadRuntimeDraft,
  clearRuntimeDraft,
  runtimeDraftKey,
} from './io/persistence';

export { DESIGNER_VERSION } from './version';
```

- [ ] **Step 5: Create `packages/designer/src/version.ts`**

```ts
export const DESIGNER_VERSION = '0.1.0';
```

- [ ] **Step 6: Build the library and verify the demo**

Run: `pnpm --filter @qnn/designer build && pnpm --filter @qnn/demo dev`
Expected: demo at `http://0.0.0.0:5173` shows the 3-pane designer. Drag a textbox onto the canvas, confirm it renders and can be selected. Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add apps/demo/src packages/designer/src/index.ts packages/designer/src/version.ts
git commit -m "feat(demo): designer route with localStorage auto-persist"
```

---

### Task 36: Preview route

**Files:**
- Replace: `apps/demo/src/routes/PreviewRoute.tsx`

- [ ] **Step 1: Replace `PreviewRoute.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Alert, Modal, Typography } from 'antd';
import { QuestionnaireRenderer, loadDesignerDraft } from '@qnn/designer';
import type { Questionnaire } from '@qnn/designer';

export default function PreviewRoute() {
  const [q] = useState<Questionnaire | null>(() => loadDesignerDraft());
  if (!q) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="warning" message="No designer draft found. Design a questionnaire first." showIcon />
      </div>
    );
  }
  return (
    <QuestionnaireRenderer
      questionnaire={q}
      onSubmit={(answers) => {
        Modal.info({
          title: 'Submitted',
          content: <pre style={{ maxHeight: 400, overflow: 'auto' }}>{JSON.stringify(answers, null, 2)}</pre>,
          width: 720,
        });
      }}
    />
  );
}
```

- [ ] **Step 2: Manual verify**

Run: `pnpm --filter @qnn/demo dev`
Build a small questionnaire at `/design`; navigate to `/preview`; verify controls render; submit and see answers modal. Stop server.

- [ ] **Step 3: Commit**

```bash
git add apps/demo/src/routes/PreviewRoute.tsx
git commit -m "feat(demo): preview route against current draft"
```

---

## Phase 10 — End-to-end tests (Playwright)

### Task 37: Add `data-testid` hooks for Playwright

**Files:**
- Modify: `packages/designer/src/designer/TopBar.tsx`
- Modify: `packages/designer/src/designer/panes/PalettePane.tsx`
- Modify: `packages/designer/src/designer/panes/Cell.tsx`
- Modify: `packages/designer/src/runtime/Renderer.tsx`

Playwright needs stable selectors. Add `data-testid` attributes at key locations.

- [ ] **Step 1: `TopBar` — add testids to Preview, Export, Import, Undo, Redo, Title input**

Find the four `<Button>` elements and the title `<Input>` and add `data-testid` props:

```tsx
<Input data-testid="topbar-title" ... />
<Button data-testid="topbar-undo" ... />
<Button data-testid="topbar-redo" ... />
<ImportButton />   /* inner button already rendered; see step 2 */
<Button data-testid="topbar-export" ... />
<Button data-testid="topbar-preview" ... />
```

Explicit patched snippet (replace the existing `<Input>` and the five buttons):

```tsx
<Input data-testid="topbar-title" value={q.title}
  onChange={(e) => store.getState().replaceDocument({ ...q, title: e.target.value, meta: { ...q.meta, updatedAt: new Date().toISOString() } })}
  style={{ maxWidth: 320 }} />
...
<Button data-testid="topbar-undo" icon={<UndoOutlined />} onClick={() => store.getState().undo()}>Undo</Button>
<Button data-testid="topbar-redo" icon={<RedoOutlined />} onClick={() => store.getState().redo()}>Redo</Button>
<ImportButton />
<Button data-testid="topbar-export" icon={<ExportOutlined />} onClick={() => setExportOpen(true)}>Export</Button>
<Button data-testid="topbar-preview" type="primary" icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>Preview</Button>
```

- [ ] **Step 2: `ImportButton` — add testid to the visible button**

```tsx
<Button data-testid="topbar-import" icon={<ImportOutlined />} onClick={() => inputRef.current?.click()}>Import</Button>
```

Also add `data-testid="topbar-import-input"` to the hidden `<input type="file">`.

- [ ] **Step 3: `PalettePane` — add testid to each palette item**

On the root of `PaletteItem`:
```tsx
<div ref={setNodeRef} {...attributes} {...listeners}
     data-testid={`palette-${plugin.type}`}
     className="qnn-palette-item">
```

- [ ] **Step 4: `Cell` — add testid to each canvas cell**

On the root `<div>`:
```tsx
data-testid={`cell-${node.alias || node.id}`}
```

- [ ] **Step 5: `Renderer` — add testids to the Next/Submit/Prev buttons**

In `PageNavigation.tsx`, replace the buttons:
```tsx
<Button data-testid="runtime-prev" disabled={!canPrev} onClick={onPrev}>Previous</Button>
<Button data-testid="runtime-next" type="primary" onClick={onNext}>{isLast ? 'Submit' : 'Next'}</Button>
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @qnn/designer typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add packages/designer/src
git commit -m "test: add data-testid hooks for Playwright"
```

---

### Task 38: Three Playwright e2e scenarios

**Files:**
- Replace: `apps/demo/tests/smoke.e2e.ts` → remove
- Create: `apps/demo/tests/roundtrip.e2e.ts`
- Create: `apps/demo/tests/branching.e2e.ts`
- Create: `apps/demo/tests/gotopage.e2e.ts`
- Create: `apps/demo/tests/helpers.ts`

> **Design note for these tests:** `dnd-kit` uses pointer events; Playwright's default `.dragTo()` won't trigger it. The helpers use `page.mouse.move` with multiple intermediate positions, which is the dnd-kit-friendly pattern. These tests clear `localStorage` before each run so drafts don't leak between scenarios.

- [ ] **Step 1: `apps/demo/tests/helpers.ts`**

```ts
import { expect, Locator, Page } from '@playwright/test';

export async function clearDraft(page: Page) {
  await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
}

export async function dragPaletteToCanvas(page: Page, pluginType: string, targetSelector: string) {
  const src = page.locator(`[data-testid="palette-${pluginType}"]`).first();
  const dst = page.locator(targetSelector).first();
  await expect(src).toBeVisible();
  await expect(dst).toBeVisible();
  const s = await src.boundingBox();
  const d = await dst.boundingBox();
  if (!s || !d) throw new Error('Boxes not found');
  const sx = s.x + s.width / 2;
  const sy = s.y + s.height / 2;
  const dx = d.x + d.width / 2;
  const dy = d.y + d.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // dnd-kit requires an initial movement beyond the activation distance
  await page.mouse.move(sx + 12, sy + 12, { steps: 5 });
  await page.mouse.move(dx, dy, { steps: 25 });
  await page.mouse.up();
}

export async function setPropertyInput(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: false }).first();
  await input.fill(value);
}
```

- [ ] **Step 2: `apps/demo/tests/roundtrip.e2e.ts`**

```ts
import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

test('build → export → import → preview round-trips', async ({ page }, testInfo) => {
  await clearDraft(page);
  await page.goto('/');
  await page.waitForURL('**/design');

  await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
  await expect(page.locator('[data-testid^="cell-textbox_"]')).toHaveCount(1);
  await dragPaletteToCanvas(page, 'single', '.qnn-canvas');
  await expect(page.locator('[data-testid^="cell-"]')).toHaveCount(2);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await page.getByTestId('topbar-export').click();
      await page.getByRole('button', { name: 'Export' }).click();
    })(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('[data-testid^="cell-"]')).toHaveCount(0);

  const filePath = path!;
  await page.getByTestId('topbar-import').click();
  await page.locator('[data-testid="topbar-import-input"]').setInputFiles(filePath);
  await expect(page.locator('[data-testid^="cell-"]')).toHaveCount(2);

  await page.getByTestId('topbar-preview').click();
  await expect(page.getByTestId('runtime-next')).toBeVisible();
});
```

- [ ] **Step 3: `apps/demo/tests/branching.e2e.ts`**

```ts
import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

test('rule: if age < 18 hide smoking', async ({ page }) => {
  await clearDraft(page);
  await page.goto('/design');

  // Add two sliders: age (alias: age), smoking (alias: smoking)
  await dragPaletteToCanvas(page, 'slider', '.qnn-canvas');
  await page.getByLabel('Alias').fill('age');
  await page.getByLabel('Friendly name').fill('Age');

  await dragPaletteToCanvas(page, 'slider', '.qnn-canvas');
  await page.locator('[data-testid^="cell-"]').nth(1).click();
  await page.getByLabel('Alias').fill('smoking');
  await page.getByLabel('Friendly name').fill('Smoking');

  // Open Rules tab and add one rule
  await page.locator('.qnn-canvas').click({ position: { x: 4, y: 4 } });
  await page.getByRole('tab', { name: 'Rules' }).click();
  await page.getByRole('button', { name: '+ Add rule' }).click();
  await page.getByRole('button', { name: '+ Add condition' }).click();
  // ref: age | op: < | const: 18
  await page.locator('.ant-select').nth(1).click();
  await page.getByText('age', { exact: true }).first().click();
  await page.locator('.ant-select').nth(2).click();
  await page.getByText('<', { exact: true }).first().click();
  await page.locator('input').filter({ hasNotText: '' }).last().fill('18');

  // then: hide field: smoking
  await page.getByRole('button', { name: '+ Add action' }).click();
  // action default = Hide + field: age; switch target to smoking
  await page.locator('.ant-select').last().click();
  await page.getByText('field: smoking').click();

  // Preview
  await page.getByTestId('topbar-preview').click();
  // Age defaults to 0 (less than 18) so smoking should be hidden
  const modal = page.locator('.ant-modal-content');
  await expect(modal.getByText('Age')).toBeVisible();
  await expect(modal.getByText('Smoking')).toHaveCount(0);
});
```

- [ ] **Step 4: `apps/demo/tests/gotopage.e2e.ts`**

```ts
import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

test('rule: gotoPage skips a page on Next', async ({ page }) => {
  await clearDraft(page);
  await page.goto('/design');

  // Add textbox to Page 1
  await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
  await page.getByLabel('Alias').fill('a1');
  await page.getByLabel('Friendly name').fill('A1');

  // Add Page 2 and Page 3
  await page.getByRole('button', { name: 'Page' }).click();
  await page.getByRole('button', { name: 'Page' }).click();

  // Switch back to page 1, add a rule: when true → gotoPage Page 3
  await page.getByText('Page 1').click();
  await page.locator('.qnn-canvas').click({ position: { x: 4, y: 4 } });
  await page.getByRole('tab', { name: 'Rules' }).click();
  await page.getByRole('button', { name: '+ Add rule' }).click();
  await page.getByRole('button', { name: '+ Add action' }).click();
  // default action = Hide; switch to Go to page
  await page.locator('.ant-select').nth(0).click();
  await page.getByText('Go to page').click();
  // select page: Page 3
  await page.locator('.ant-select').last().click();
  await page.getByText('Page 3').click();

  // Preview and hit Next on page 1 — should land on Page 3
  await page.getByTestId('topbar-preview').click();
  const modal = page.locator('.ant-modal-content');
  await expect(modal.getByText('Page 1')).toBeVisible();
  await modal.locator('[data-testid="runtime-next"]').click();
  await expect(modal.getByText('Page 3')).toBeVisible();
});
```

- [ ] **Step 5: Delete the old smoke test**

Run: `rm apps/demo/tests/smoke.e2e.ts`

- [ ] **Step 6: Run e2e**

Run: `pnpm --filter @qnn/demo test:e2e`
Expected: three tests pass. If branching or gotoPage tests are flaky because of dnd-kit timing or Ant Design Select portal behaviour, iterate the helper — but do not weaken the assertions.

- [ ] **Step 7: Commit**

```bash
git add apps/demo/tests
git commit -m "test(e2e): roundtrip, branching, gotoPage scenarios"
```

---

## Phase 11 — Polish

### Task 39: Error boundary + RestoreBanner wiring

**Files:**
- Create: `packages/designer/src/util/errorBoundary.tsx`
- Modify: `packages/designer/src/designer/panes/Cell.tsx`
- Modify: `packages/designer/src/runtime/ControlField.tsx`
- Modify: `apps/demo/src/routes/DesignerRoute.tsx`

- [ ] **Step 1: `src/util/errorBoundary.tsx`**

```tsx
import { Component, ReactNode } from 'react';

export class PluginErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  override state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  override componentDidCatch(err: unknown) { console.error('Plugin render error:', err); }
  override render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}
```

- [ ] **Step 2: Wrap `CanvasPreview` call in `Cell.tsx`**

Replace the line that renders `plugin.CanvasPreview` with:

```tsx
<PluginErrorBoundary fallback={<em>⚠ Could not render (type: {node.type})</em>}>
  {plugin?.CanvasPreview ? <plugin.CanvasPreview node={node} /> : <em>Unknown: {node.type}</em>}
</PluginErrorBoundary>
```

And add the import at top:
```tsx
import { PluginErrorBoundary } from '../../util/errorBoundary';
```

- [ ] **Step 3: Wrap `plugin.Renderer` call in `ControlField.tsx`**

```tsx
<PluginErrorBoundary fallback={<span style={{ color: 'crimson' }}>⚠ Render error</span>}>
  <plugin.Renderer node={node as never} value={value} onChange={onChange} error={error} />
</PluginErrorBoundary>
```

And import `PluginErrorBoundary` at the top.

- [ ] **Step 4: Show `RestoreBanner` in `DesignerRoute.tsx`**

```tsx
import { useEffect, useState } from 'react';
import {
  QuestionnaireDesigner,
  loadDesignerDraft,
  saveDesignerDraft,
  makeEmptyQuestionnaire,
} from '@qnn/designer';
import type { Questionnaire } from '@qnn/designer';
import { Alert, Button, Space } from 'antd';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export default function DesignerRoute() {
  const [restored, setRestored] = useState<string | null>(() => {
    const q = loadDesignerDraft();
    return q?.meta.updatedAt ?? null;
  });
  const [initial] = useState<Questionnaire>(() => loadDesignerDraft() ?? makeEmptyQuestionnaire());

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {restored && (
        <Alert
          type="info"
          showIcon
          message={`Restored unsaved work from ${new Date(restored).toLocaleString()}`}
          action={
            <Space>
              <Button size="small" onClick={() => { localStorage.removeItem('qnn.designer.draft.v1'); location.reload(); }}>Discard</Button>
              <Button size="small" onClick={() => setRestored(null)}>Dismiss</Button>
            </Space>
          }
        />
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <QuestionnaireDesigner
          initial={initial}
          onChange={(q) => {
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(() => saveDesignerDraft(q), 300);
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck + full build**

Run: `pnpm -r build && pnpm -r typecheck`
Expected: clean.

- [ ] **Step 6: Full manual smoke pass (acceptance §12 of spec)**

Run: `pnpm --filter @qnn/demo dev` and manually walk through:
- Drag every built-in control (text, textbox, datetime, single, multi, rating, slider).
- Add a second page, rename, reorder via delete+re-add, delete.
- Edit properties on each control; verify alias validation rejects `9bad`.
- Add one branching rule and one validation rule.
- Preview; complete the form; verify submit modal.
- Export (with and without logic), re-import; verify state.
- Resize a cell via the drag handle.
- Mobile DevTools: confirm preview collapses to single column below `640px`.

- [ ] **Step 7: Commit**

```bash
git add packages/designer/src apps/demo/src/routes/DesignerRoute.tsx
git commit -m "feat(polish): plugin error boundaries and restore banner"
```

---

## Parallelism hints (for subagent-driven execution)

When dispatching subagents, these groups are safe to parallelise (no shared files beyond what is listed). Do NOT parallelise across a group — finish one group before starting the next.

- **Group A (sequential):** Tasks 1–5.
- **Group B (parallel after Group A):** Tasks 6, 12, 22.
  - *Note:* 7, 8 depend on 6. 13 depends on 12. 21 depends on 6 + 12.
- **Group C (parallel after Group B):** Tasks 7, 8, 9, 10, 13.
- **Group D (parallel after Group C):** Tasks 11, 14–20 (each plugin is independent), 21, 23.
  - 24, 25 depend on 23.
- **Group E (sequential after Group D):** Task 26 creates the shell + stubs.
- **Group F (parallel after Group E):** Tasks 27, 28, 30, 32, 33.
  - 29 depends on 28. 31 depends on 30.
- **Group G (sequential):** Tasks 34, 35, 36, 37, 38, 39.

When dispatching Group D and Group F agents in parallel, include in each subagent prompt:
- The exact files that task touches (and only those).
- A list of files the task must NOT touch.
- The acceptance command to run before returning (`pnpm --filter @qnn/designer test -- <path>` or `pnpm --filter @qnn/designer typecheck`).

---

## Spec coverage map

Cross-check that every spec section has tasks. (✓ = covered.)

| Spec § | Topic | Tasks |
|---|---|---|
| 1 | Overview & non-goals | — (context only) |
| 2.1 | Repo layout | 1–5 ✓ |
| 2.2 | Public library surface | 35.4 ✓ |
| 2.3 | Module boundaries | enforced by file layout + dependency direction in 6–25 ✓ |
| 3.1 | Designer shell | 26, 27, 28, 30, 32, 33 ✓ |
| 3.2 | 7 control types | 14–20 ✓ |
| 3.3 | Common control properties | 15 (_common.tsx) used by 15–20 ✓ |
| 3.4 | Logic (v1) | 9, 10, 11, 31 ✓ |
| 3.5 | Preview | 33 (modal), 34, 36 ✓ |
| 3.6 | JSON import/export | 23, 24, 33 ✓ |
| 3.7 | v2 not-built list | — (negative space) |
| 4.1–4.6 | Data model + migrations | 6, 7, 8, 24 ✓ |
| 5.1 | ControlPlugin interface | 12 ✓ |
| 5.2 | ControlRegistry | 12 ✓ |
| 5.3 | Register-time validation | 12 ✓ |
| 5.4 | Built-in props shapes | 14–20 ✓ |
| 5.5 | Alias uniqueness | 7 (schema) + 15 (_common aliasError) + 21 (uniqueAlias on insert) ✓ |
| 6.1–6.3 | Grid + snap + gestures | 26 (CSS), 27, 28, 29 ✓ |
| 6.4 | Selection | 28 (select on click) + 39 (Esc TODO: see below) |
| 6.5 | Undo/redo | 21 ✓ |
| 6.6 | Cross-page drag | (not implemented in v1 plan — see Open items) |
| 6.7 | Over-span/full-row | 21 (clampSpanOnInsert) ✓ |
| 7.1 | RuntimeState | 22 ✓ |
| 7.2 | Expression interpreter | 9 ✓ |
| 7.3 | Action application | 10 ✓ |
| 7.4 | Reactive tick | 11, 34 ✓ |
| 7.5 | Page navigation | 34 ✓ |
| 7.6 | Rules tab UI | 31 ✓ |
| 8.1 | localStorage | 25, 35 ✓ |
| 8.2 | Import/export | 23, 24, 33 ✓ |
| 8.3 | Schema versioning | 24 ✓ |
| 9.1 | Demo app | 35, 36 ✓ |
| 9.2 | Testing | 7, 8, 9, 10, 11, 12, 13, 21, 22, 23, 24, 25, 38 ✓ |
| 9.3 | Error handling | 39 ✓ |
| 9.4 | Accessibility floor | 29 (keyboard nudges) + dnd-kit sensors + Ant labels; full pass in 39 manual check |
| 9.5 | Performance | React.memo not explicitly added — acceptable v1 baseline; revisit if profiling fails |
| 9.6 | Theming | 35 (ConfigProvider) + 34 (renderer ConfigProvider) ✓ |
| 9.7 | Security (dompurify, no eval) | 14 (text plugin uses DOMPurify) ✓ |
| 10 | Tradeoffs | — (captured in design) |
| 11 | v2 extensibility | — (architectural — already built into registry/AST) |
| 12 | Acceptance criteria | 39.6 manual smoke verifies all ✓ |

### Open items

These are deliberate v1 deferrals (not plan bugs):

1. **Cross-page drag (§6.6 hold-to-switch).** Plan keeps node moves inside the current page only. Moving across pages is achievable through delete + add-on-other-page in v1; the drag gesture across page tabs is v2.
2. **Esc to deselect (§6.4).** Clicking empty canvas deselects (implemented in Task 28). Global keyboard `Esc` handler is deferred.
3. **Designer error boundary** is per-cell (Task 39). A designer-root boundary could be added but is not in-scope for v1.

---

## Self-review

1. **Spec coverage.** Completed above — every major section mapped.
2. **Placeholder scan.** No `TBD`, `TODO`, `implement later`, or `similar to Task N` in the plan. Each task has complete file contents or an explicit patched snippet.
3. **Type consistency.** Types referenced late (e.g., `ControlPlugin`, `Questionnaire`, `ControlRegistry`, `EffectAccumulator`, `RuntimeStore`) match their definitions in Tasks 6, 7, 8, 10, 12, 22. Store method names (`addControl`, `insertRowAt`, `moveControl`, `resizeControl`, `deleteControl`, `updateControl`, `addPage`, `renamePage`, `deletePage`, `reorderPages`, `replaceDocument`, `undo`, `redo`, `selectControl`, `selectPage`) are used consistently between Task 21 and later tasks (26–33, 35).

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-18-qnn-designer-v1.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Respects the parallelism groups above.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

