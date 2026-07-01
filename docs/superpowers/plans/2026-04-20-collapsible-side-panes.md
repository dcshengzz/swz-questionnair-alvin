# Collapsible Palette & Inspector Panes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users collapse the left (Palette) and right (Inspector) panes of `QuestionnaireDesigner` to a 44px icon rail, persisted per-pane via `localStorage`.

**Architecture:** Shell-owned state via a small `usePaneCollapsed` hook. CSS grid switches columns via `data-left-collapsed` / `data-right-collapsed` attributes on `.qnn-shell`. Each `<aside>` renders either the full pane or a functional rail (palette categories / inspector selection dot). No Zustand store changes.

**Tech Stack:** React 18, AntD 5 + `@ant-design/icons`, CSS Grid, Vitest + React Testing Library (unit), Playwright (E2E).

**Source of truth:** `docs/superpowers/specs/2026-04-20-collapsible-side-panes-design.md`.

---

## File Structure

**New files:**
- `packages/designer/src/designer/hooks/usePaneCollapsed.ts` — hook, ~30 lines.
- `packages/designer/src/designer/panes/PaletteRail.tsx` — collapsed palette UI.
- `packages/designer/src/designer/panes/InspectorRail.tsx` — collapsed inspector UI.
- `packages/designer/tests/designer/usePaneCollapsed.test.ts` — hook test.
- `packages/designer/tests/designer/PaletteRail.test.tsx` — rail render/click tests.
- `packages/designer/tests/designer/InspectorRail.test.tsx` — rail render/click tests.
- `apps/demo/tests/pane-collapse.e2e.ts` — E2E.

**Modified files:**
- `packages/designer/src/designer/Designer.tsx` — wire hooks + data attributes + rail switching.
- `packages/designer/src/designer/panes/PalettePane.tsx` — title-row wrapper, `data-category` on groups, `onCollapse` prop.
- `packages/designer/src/designer/panes/PropertiesPane.tsx` — title-row wrapper on both title variants, `onCollapse` prop.
- `packages/designer/src/designer/styles.css` — rail + collapsed-grid styles + responsive override.

**Working directory:** `/home/alvin/Projects/qnndesigner` on branch `feat/theme-toggle`. Run all commands from that root unless noted.

---

## Task 1: `usePaneCollapsed` hook

**Files:**
- Create: `packages/designer/src/designer/hooks/usePaneCollapsed.ts`
- Test: `packages/designer/tests/designer/usePaneCollapsed.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/designer/tests/designer/usePaneCollapsed.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePaneCollapsed } from '../../src/designer/hooks/usePaneCollapsed';

describe('usePaneCollapsed', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to false when no value stored', () => {
    const { result } = renderHook(() => usePaneCollapsed('qnn.test.key'));
    expect(result.current[0]).toBe(false);
  });

  it('uses provided initial when no value stored', () => {
    const { result } = renderHook(() => usePaneCollapsed('qnn.test.key', true));
    expect(result.current[0]).toBe(true);
  });

  it('reads "1" from localStorage as true', () => {
    window.localStorage.setItem('qnn.test.key', '1');
    const { result } = renderHook(() => usePaneCollapsed('qnn.test.key'));
    expect(result.current[0]).toBe(true);
  });

  it('reads "0" from localStorage as false even when initial=true', () => {
    window.localStorage.setItem('qnn.test.key', '0');
    const { result } = renderHook(() => usePaneCollapsed('qnn.test.key', true));
    expect(result.current[0]).toBe(false);
  });

  it('writes back on change', () => {
    const { result } = renderHook(() => usePaneCollapsed('qnn.test.key'));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem('qnn.test.key')).toBe('1');
    act(() => result.current[1](false));
    expect(window.localStorage.getItem('qnn.test.key')).toBe('0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @qnn/designer test -- usePaneCollapsed
```

Expected: FAIL with `Cannot find module '.../usePaneCollapsed'`.

- [ ] **Step 3: Implement the hook**

Create `packages/designer/src/designer/hooks/usePaneCollapsed.ts`:

```ts
import { useCallback, useState } from 'react';

function readInitial(storageKey: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === '1') return true;
    if (raw === '0') return false;
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Tracks a boolean pane-collapse flag in React state and persists it to
 * localStorage under `storageKey`. Values are stored as "1" / "0".
 */
export function usePaneCollapsed(
  storageKey: string,
  initial = false,
): [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => readInitial(storageKey, initial));

  const set = useCallback(
    (next: boolean) => {
      setCollapsed(next);
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        console.warn('[qnn] localStorage unavailable; pane state will not persist.');
      }
    },
    [storageKey],
  );

  return [collapsed, set];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @qnn/designer test -- usePaneCollapsed
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/designer/src/designer/hooks/usePaneCollapsed.ts \
        packages/designer/tests/designer/usePaneCollapsed.test.ts
git commit -m "feat(designer): add usePaneCollapsed hook with localStorage persistence"
```

---

## Task 2: CSS — rail, collapsed grid, responsive override

**Files:**
- Modify: `packages/designer/src/designer/styles.css`

- [ ] **Step 1: Add collapsed-grid rules after the existing `.qnn-shell` block**

In `packages/designer/src/designer/styles.css`, immediately after the existing rule ending at line ~260 (`.qnn-shell { grid-template-columns: 288px 1fr 344px; ... }`), insert:

```css
/* Collapsed grid states */
.qnn-shell[data-left-collapsed]  { grid-template-columns: 44px 1fr 344px; }
.qnn-shell[data-right-collapsed] { grid-template-columns: 288px 1fr 44px; }
.qnn-shell[data-left-collapsed][data-right-collapsed] {
  grid-template-columns: 44px 1fr 44px;
}

/* Remove default pane padding when a pane is collapsed; the rail handles its own spacing. */
.qnn-shell[data-left-collapsed]  > aside.qnn-left  { padding: 0; }
.qnn-shell[data-right-collapsed] > aside.qnn-right { padding: 0; }
```

- [ ] **Step 2: Append rail and pane-title-row styles**

Append the following block to the end of `styles.css`, **before** the final `@media (max-width: 960px)` block (we'll update that block in Step 4):

```css
/* ==========================================================================
   Collapsible pane rails (shown when a pane is collapsed)
   ========================================================================== */

.qnn-pane-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 0;
}

.qnn-pane-rail-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--qnn-ink-muted);
  cursor: pointer;
  transition:
    background 0.12s var(--qnn-ease),
    border-color 0.12s var(--qnn-ease),
    color 0.12s var(--qnn-ease);
}

.qnn-pane-rail-btn:hover {
  background: var(--qnn-surface-muted);
  border-color: var(--qnn-hairline);
  color: var(--qnn-accent);
}

.qnn-pane-rail-btn:focus-visible {
  outline: 2px solid var(--qnn-accent);
  outline-offset: 1px;
}

.qnn-inspector-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid var(--qnn-ink-muted);
  background: transparent;
}

.qnn-inspector-dot[data-selected] {
  background: var(--qnn-accent);
  border-color: var(--qnn-accent);
}

/* Pane title row (title + inline collapse chevron) */
.qnn-pane-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 4px;
  margin-bottom: 12px;
}

.qnn-pane-title-row .qnn-pane-title {
  margin: 0;
}

.qnn-pane-collapse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--qnn-ink-muted);
  border-radius: 6px;
  cursor: pointer;
  transition:
    background 0.12s var(--qnn-ease),
    color 0.12s var(--qnn-ease);
}

.qnn-pane-collapse-btn:hover {
  background: var(--qnn-surface-muted);
  color: var(--qnn-ink);
}

.qnn-pane-collapse-btn:focus-visible {
  outline: 2px solid var(--qnn-accent);
  outline-offset: 1px;
}
```

- [ ] **Step 3: Remove the default `margin: 0 0 12px` from `.qnn-pane-title`**

The new `.qnn-pane-title-row` provides the bottom margin. Find the existing rule in `styles.css`:

```css
.qnn-pane-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--qnn-ink-muted);
  margin: 0 0 12px;
  padding: 0 4px;
}
```

Change `margin: 0 0 12px;` to `margin: 0;` — the `.qnn-pane-title-row` selector above now owns the spacing. Panes that keep using the bare `<h3 className="qnn-pane-title">` (the "Properties" + plugin-label variant) will get a slight layout shift; this is accepted per the spec because both title variants will be wrapped in a `.qnn-pane-title-row` in Tasks 4–5.

- [ ] **Step 4: Update the responsive media query**

Find the existing block (at the bottom of `styles.css`):

```css
@media (max-width: 960px) {
  .qnn-shell {
    grid-template-columns: 1fr;
  }
  .qnn-shell > aside.qnn-left,
  .qnn-shell > aside.qnn-right {
    border: none;
    border-bottom: 1px solid var(--qnn-hairline);
  }
}
```

Replace with:

```css
@media (max-width: 960px) {
  .qnn-shell,
  .qnn-shell[data-left-collapsed],
  .qnn-shell[data-right-collapsed],
  .qnn-shell[data-left-collapsed][data-right-collapsed] {
    grid-template-columns: 1fr;
  }
  .qnn-shell > aside.qnn-left,
  .qnn-shell > aside.qnn-right {
    border: none;
    border-bottom: 1px solid var(--qnn-hairline);
  }
  .qnn-pane-rail,
  .qnn-pane-collapse-btn {
    display: none;
  }
  /* Restore default padding on collapsed asides in stacked layout. */
  .qnn-shell[data-left-collapsed]  > aside.qnn-left,
  .qnn-shell[data-right-collapsed] > aside.qnn-right {
    padding: 20px 16px;
  }
}
```

- [ ] **Step 5: Verify the package still builds**

```bash
pnpm --filter @qnn/designer build
```

Expected: build succeeds (CSS-only change, no new warnings).

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/designer/styles.css
git commit -m "feat(designer): add collapsed-grid + pane-rail CSS tokens"
```

---

## Task 3: `PalettePane` — title row, category anchors, `onCollapse` prop

**Files:**
- Modify: `packages/designer/src/designer/panes/PalettePane.tsx`

- [ ] **Step 1: Replace the file**

Full replacement contents for `packages/designer/src/designer/panes/PalettePane.tsx`:

```tsx
import { useDraggable } from '@dnd-kit/core';
import { Tooltip } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import type { ControlPlugin } from '../../registry/types';

function PaletteItem({ plugin }: { plugin: ControlPlugin }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `palette:${plugin.type}`,
    data: { source: 'palette', pluginType: plugin.type },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-testid={`palette-${plugin.type}`}
      className="qnn-palette-item"
    >
      <span className="qnn-palette-icon">{plugin.icon}</span>
      <span>{plugin.label}</span>
    </div>
  );
}

export interface PalettePaneProps {
  registry: ControlRegistry;
  onCollapse?: () => void;
}

export function PalettePane({ registry, onCollapse }: PalettePaneProps) {
  const grouped: Record<string, ControlPlugin[]> = { content: [], input: [], advanced: [] };
  for (const p of registry.all()) grouped[p.category]!.push(p);
  return (
    <div>
      <div className="qnn-pane-title-row">
        <h3 className="qnn-pane-title">Palette</h3>
        {onCollapse ? (
          <Tooltip title="Collapse palette">
            <button
              type="button"
              className="qnn-pane-collapse-btn"
              data-testid="palette-collapse"
              aria-label="Collapse palette"
              onClick={onCollapse}
            >
              <LeftOutlined />
            </button>
          </Tooltip>
        ) : null}
      </div>
      {(['content', 'input', 'advanced'] as const).map((cat) =>
        grouped[cat]!.length === 0 ? null : (
          <div
            key={cat}
            className="qnn-palette-group"
            data-category={cat}
          >
            <div className="qnn-palette-heading">{cat}</div>
            {grouped[cat]!.map((p) => (
              <PaletteItem key={p.type} plugin={p} />
            ))}
          </div>
        ),
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @qnn/designer typecheck
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/designer/src/designer/panes/PalettePane.tsx
git commit -m "feat(designer): add collapse chevron + category anchors to PalettePane"
```

---

## Task 4: `PropertiesPane` — title rows, `onCollapse` prop

**Files:**
- Modify: `packages/designer/src/designer/panes/PropertiesPane.tsx`

- [ ] **Step 1: Replace the file**

Full replacement contents for `packages/designer/src/designer/panes/PropertiesPane.tsx`:

```tsx
import { Tabs, Tooltip, Typography } from 'antd';
import { RightOutlined } from '@ant-design/icons';
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

function CollapseChevron({ onCollapse }: { onCollapse?: () => void }) {
  if (!onCollapse) return null;
  return (
    <Tooltip title="Collapse inspector">
      <button
        type="button"
        className="qnn-pane-collapse-btn"
        data-testid="inspector-collapse"
        aria-label="Collapse inspector"
        onClick={onCollapse}
      >
        <RightOutlined />
      </button>
    </Tooltip>
  );
}

export interface PropertiesPaneProps {
  registry: ControlRegistry;
  onCollapse?: () => void;
}

export function PropertiesPane({ registry, onCollapse }: PropertiesPaneProps) {
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
        <div className="qnn-pane-title-row">
          <h3 className="qnn-pane-title">Properties</h3>
          <CollapseChevron {...(onCollapse ? { onCollapse } : {})} />
        </div>
        <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>{plugin.label}</Typography.Title>
        <plugin.PropertyEditor
          node={node as never}
          otherAliases={others}
          onChange={(patch) => store.getState().updateControl({ controlId: node.id, patch: patch as Partial<ControlNode> })}
        />
      </div>
    );
  }
  return (
    <div>
      <div className="qnn-pane-title-row">
        <h3 className="qnn-pane-title">Inspector</h3>
        <CollapseChevron {...(onCollapse ? { onCollapse } : {})} />
      </div>
      <Tabs
        defaultActiveKey="page"
        items={[
          { key: 'page', label: 'Page', children: <Typography.Text type="secondary">Click a control to edit, or switch to Rules.</Typography.Text> },
          { key: 'rules', label: 'Rules', children: <RulesTab /> },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @qnn/designer typecheck
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add packages/designer/src/designer/panes/PropertiesPane.tsx
git commit -m "feat(designer): add collapse chevron to PropertiesPane (both title variants)"
```

---

## Task 5: `PaletteRail` component + test

**Files:**
- Create: `packages/designer/src/designer/panes/PaletteRail.tsx`
- Test: `packages/designer/tests/designer/PaletteRail.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/designer/tests/designer/PaletteRail.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaletteRail } from '../../src/designer/panes/PaletteRail';
import { defaultRegistry } from '../../src/registry/controls';

describe('PaletteRail', () => {
  beforeEach(() => {
    // JSDOM doesn't implement scrollIntoView; stub it so clicks don't throw.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders an expand chevron and one button per non-empty category', () => {
    render(<PaletteRail registry={defaultRegistry} onExpand={() => {}} />);
    expect(screen.getByTestId('palette-rail-expand')).toBeInTheDocument();
    // default registry has content, input, advanced
    expect(screen.getByTestId('palette-rail-category-content')).toBeInTheDocument();
    expect(screen.getByTestId('palette-rail-category-input')).toBeInTheDocument();
    expect(screen.getByTestId('palette-rail-category-advanced')).toBeInTheDocument();
  });

  it('calls onExpand when the chevron is clicked', () => {
    const onExpand = vi.fn();
    render(<PaletteRail registry={defaultRegistry} onExpand={onExpand} />);
    fireEvent.click(screen.getByTestId('palette-rail-expand'));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('calls onExpand and scrolls the matching group when a category is clicked', () => {
    const onExpand = vi.fn();
    const group = document.createElement('div');
    group.className = 'qnn-palette-group';
    group.setAttribute('data-category', 'input');
    document.body.appendChild(group);

    render(<PaletteRail registry={defaultRegistry} onExpand={onExpand} />);
    fireEvent.click(screen.getByTestId('palette-rail-category-input'));
    expect(onExpand).toHaveBeenCalledTimes(1);
    // scrollIntoView is stubbed on the prototype; confirm call count.
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    document.body.removeChild(group);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @qnn/designer test -- PaletteRail
```

Expected: FAIL with `Cannot find module '.../PaletteRail'`.

- [ ] **Step 3: Implement `PaletteRail`**

Create `packages/designer/src/designer/panes/PaletteRail.tsx`:

```tsx
import { Tooltip } from 'antd';
import {
  AppstoreOutlined,
  EditOutlined,
  FileTextOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { ControlRegistry } from '../../registry/ControlRegistry';

const CATEGORY_META: Record<'content' | 'input' | 'advanced', { label: string; icon: React.ReactNode }> = {
  content: { label: 'Content', icon: <FileTextOutlined /> },
  input: { label: 'Input', icon: <EditOutlined /> },
  advanced: { label: 'Advanced', icon: <AppstoreOutlined /> },
};

export interface PaletteRailProps {
  registry: ControlRegistry;
  onExpand: () => void;
}

export function PaletteRail({ registry, onExpand }: PaletteRailProps) {
  const counts: Record<string, number> = { content: 0, input: 0, advanced: 0 };
  for (const p of registry.all()) counts[p.category] = (counts[p.category] ?? 0) + 1;

  const handleCategoryClick = (cat: 'content' | 'input' | 'advanced') => {
    onExpand();
    // Let the pane mount before scrolling.
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`.qnn-palette-group[data-category="${cat}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="qnn-pane-rail">
      <Tooltip title="Expand palette" placement="right">
        <button
          type="button"
          className="qnn-pane-rail-btn"
          data-testid="palette-rail-expand"
          aria-label="Expand palette"
          onClick={onExpand}
        >
          <RightOutlined />
        </button>
      </Tooltip>
      {(['content', 'input', 'advanced'] as const).map((cat) =>
        counts[cat] === 0 ? null : (
          <Tooltip key={cat} title={`Expand palette and scroll to ${CATEGORY_META[cat].label}`} placement="right">
            <button
              type="button"
              className="qnn-pane-rail-btn"
              data-testid={`palette-rail-category-${cat}`}
              aria-label={`Expand palette and scroll to ${CATEGORY_META[cat].label}`}
              onClick={() => handleCategoryClick(cat)}
            >
              {CATEGORY_META[cat].icon}
            </button>
          </Tooltip>
        ),
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @qnn/designer test -- PaletteRail
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/designer/src/designer/panes/PaletteRail.tsx \
        packages/designer/tests/designer/PaletteRail.test.tsx
git commit -m "feat(designer): add PaletteRail with category anchors"
```

---

## Task 6: `InspectorRail` component + test

**Files:**
- Create: `packages/designer/src/designer/panes/InspectorRail.tsx`
- Test: `packages/designer/tests/designer/InspectorRail.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/designer/tests/designer/InspectorRail.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InspectorRail } from '../../src/designer/panes/InspectorRail';

describe('InspectorRail', () => {
  it('renders expand chevron and a hollow dot when nothing is selected', () => {
    render(<InspectorRail hasSelection={false} onExpand={() => {}} />);
    expect(screen.getByTestId('inspector-rail-expand')).toBeInTheDocument();
    const dot = screen.getByTestId('inspector-rail-dot');
    expect(dot).toBeInTheDocument();
    expect(dot.hasAttribute('data-selected')).toBe(false);
  });

  it('marks the dot as selected when hasSelection is true', () => {
    render(<InspectorRail hasSelection={true} onExpand={() => {}} />);
    const dot = screen.getByTestId('inspector-rail-dot');
    expect(dot.hasAttribute('data-selected')).toBe(true);
  });

  it('calls onExpand when either the chevron or the dot is clicked', () => {
    const onExpand = vi.fn();
    render(<InspectorRail hasSelection={false} onExpand={onExpand} />);
    fireEvent.click(screen.getByTestId('inspector-rail-expand'));
    fireEvent.click(screen.getByTestId('inspector-rail-dot-btn'));
    expect(onExpand).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @qnn/designer test -- InspectorRail
```

Expected: FAIL with `Cannot find module '.../InspectorRail'`.

- [ ] **Step 3: Implement `InspectorRail`**

Create `packages/designer/src/designer/panes/InspectorRail.tsx`:

```tsx
import { Tooltip } from 'antd';
import { LeftOutlined } from '@ant-design/icons';

export interface InspectorRailProps {
  hasSelection: boolean;
  onExpand: () => void;
}

export function InspectorRail({ hasSelection, onExpand }: InspectorRailProps) {
  return (
    <div className="qnn-pane-rail">
      <Tooltip title="Expand inspector" placement="left">
        <button
          type="button"
          className="qnn-pane-rail-btn"
          data-testid="inspector-rail-expand"
          aria-label="Expand inspector"
          onClick={onExpand}
        >
          <LeftOutlined />
        </button>
      </Tooltip>
      <Tooltip
        title={hasSelection ? 'Expand inspector (control selected)' : 'Expand inspector'}
        placement="left"
      >
        <button
          type="button"
          className="qnn-pane-rail-btn"
          data-testid="inspector-rail-dot-btn"
          aria-label="Expand inspector"
          onClick={onExpand}
        >
          <span
            className="qnn-inspector-dot"
            data-testid="inspector-rail-dot"
            {...(hasSelection ? { 'data-selected': '' } : {})}
          />
        </button>
      </Tooltip>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @qnn/designer test -- InspectorRail
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/designer/src/designer/panes/InspectorRail.tsx \
        packages/designer/tests/designer/InspectorRail.test.tsx
git commit -m "feat(designer): add InspectorRail with selection status dot"
```

---

## Task 7: Wire everything into `DesignerShell`

**Files:**
- Modify: `packages/designer/src/designer/Designer.tsx`

- [ ] **Step 1: Replace the shell wiring**

Full replacement contents for `packages/designer/src/designer/Designer.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { MouseSensor, TouchSensor, DndContext, useSensor, useSensors } from '@dnd-kit/core';
import { makeEmptyQuestionnaire } from '../schema/factories';
import { createDesignerStore, type DesignerStore } from '../store/designer';
import { DesignerStoreContext, useDesignerStore } from './hooks/useDesignerStore';
import { useCanvasDnd } from './hooks/useCanvasDnd';
import { usePaneCollapsed } from './hooks/usePaneCollapsed';
import { defaultRegistry } from '../registry/controls';
import type { ControlPlugin } from '../registry/types';
import type { Questionnaire } from '../schema/types';
import type { ControlRegistry } from '../registry/ControlRegistry';
import { TopBar } from './TopBar';
import { PalettePane } from './panes/PalettePane';
import { PaletteRail } from './panes/PaletteRail';
import { CanvasPane } from './panes/CanvasPane';
import { PropertiesPane } from './panes/PropertiesPane';
import { InspectorRail } from './panes/InspectorRail';
import { PageTabs } from './panes/PageTabs';
import './styles.css';

export interface QuestionnaireDesignerProps {
  initial?: Questionnaire;
  plugins?: ControlPlugin[];
  onChange?: (q: Questionnaire) => void;
  onExport?: (q: Questionnaire, includeLogic: boolean) => void;
}

const PALETTE_KEY = 'qnn.pane.palette.collapsed.v1';
const INSPECTOR_KEY = 'qnn.pane.inspector.collapsed.v1';

function InspectorRailSlot({ onExpand }: { onExpand: () => void }) {
  // Read selection inside the rail so shell doesn't re-render on every selection change.
  const store = useDesignerStore();
  const hasSelection = store((s) => s.selection.controlId !== null);
  return <InspectorRail hasSelection={hasSelection} onExpand={onExpand} />;
}

function DesignerShell({ registry, onExport }: { registry: ControlRegistry; onExport?: (q: Questionnaire, includeLogic: boolean) => void }) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
  );
  const { onDragEnd, onDragOver, onDragStart, overId, activeId } = useCanvasDnd(registry);
  const [paletteCollapsed, setPaletteCollapsed] = usePaneCollapsed(PALETTE_KEY);
  const [inspectorCollapsed, setInspectorCollapsed] = usePaneCollapsed(INSPECTOR_KEY);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar registry={registry} {...(onExport ? { onExport } : {})} />
        <PageTabs />
        <div
          className="qnn-shell"
          {...(paletteCollapsed ? { 'data-left-collapsed': '' } : {})}
          {...(inspectorCollapsed ? { 'data-right-collapsed': '' } : {})}
        >
          <aside className="qnn-left">
            {paletteCollapsed
              ? <PaletteRail registry={registry} onExpand={() => setPaletteCollapsed(false)} />
              : <PalettePane registry={registry} onCollapse={() => setPaletteCollapsed(true)} />}
          </aside>
          <main><CanvasPane registry={registry} overId={overId} activeId={activeId} /></main>
          <aside className="qnn-right">
            {inspectorCollapsed
              ? <InspectorRailSlot onExpand={() => setInspectorCollapsed(false)} />
              : <PropertiesPane registry={registry} onCollapse={() => setInspectorCollapsed(true)} />}
          </aside>
        </div>
      </div>
    </DndContext>
  );
}

export function QuestionnaireDesigner({ initial, plugins = [], onChange, onExport }: QuestionnaireDesignerProps) {
  const [store] = useState<DesignerStore>(() => createDesignerStore(initial ?? makeEmptyQuestionnaire()));
  const registry = useMemo(() => {
    const r = defaultRegistry.clone();
    for (const p of plugins) r.override(p);
    return r;
  }, [plugins]);

  if (onChange) {
    store.subscribe((s) => onChange(s.questionnaire));
  }

  return (
    <DesignerStoreContext.Provider value={store}>
      {onExport
        ? <DesignerShell registry={registry} onExport={onExport} />
        : <DesignerShell registry={registry} />}
    </DesignerStoreContext.Provider>
  );
}
```

- [ ] **Step 2: Typecheck the package**

```bash
pnpm --filter @qnn/designer typecheck
```

Expected: pass.

- [ ] **Step 3: Run full designer unit tests**

```bash
pnpm --filter @qnn/designer test
```

Expected: all pre-existing tests + 11 new tests pass.

- [ ] **Step 4: Build the workspace end-to-end**

```bash
pnpm build
```

Expected: both `@qnn/designer` and `@qnn/demo` build clean.

- [ ] **Step 5: Smoke-test in the browser**

Start preview on `0.0.0.0`:

```bash
pnpm --filter @qnn/demo preview
```

Open `http://127.0.0.1:4173/design`. Verify manually:

1. Click the chevron in the Palette header → palette collapses to a 44px rail; canvas widens.
2. Click a category icon on the rail → palette re-expands; scroll moves to that group.
3. Drop a control on the canvas; select it; click the chevron in Properties → inspector collapses to rail; dot appears filled.
4. Deselect (click canvas background); dot should go hollow.
5. Reload the page with both panes collapsed → both stay collapsed.
6. Toggle dark mode → rails read correctly in dark theme.
7. Narrow the window below 960px → rails and chevrons hide; panes stack normally.

Stop the preview (Ctrl+C) once verified.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/designer/Designer.tsx
git commit -m "feat(designer): wire PaletteRail + InspectorRail into shell"
```

---

## Task 8: Playwright E2E

**Files:**
- Create: `apps/demo/tests/pane-collapse.e2e.ts`

- [ ] **Step 1: Write the E2E**

Note: `clearDraft` from `helpers.ts` installs an `addInitScript` that wipes `localStorage` on **every** navigation (including `page.reload()`). That would defeat the persistence test, so the last test does a one-shot `localStorage.clear()` via `page.evaluate` instead.

Create `apps/demo/tests/pane-collapse.e2e.ts` with this exact content:

```ts
import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

test.describe('collapsible panes', () => {
  test('collapsing the palette shrinks the left column and exposes a rail', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/design');

    const shell = page.locator('.qnn-shell');
    await expect(shell).not.toHaveAttribute('data-left-collapsed', /.*/);

    await page.getByTestId('palette-collapse').click();

    await expect(shell).toHaveAttribute('data-left-collapsed', '');
    await expect(page.getByTestId('palette-rail-expand')).toBeVisible();
    await expect(page.getByTestId('palette-rail-category-content')).toBeVisible();
    await expect(page.getByTestId('palette-rail-category-input')).toBeVisible();
  });

  test('clicking a palette category on the rail expands and scrolls to that group', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/design');

    await page.getByTestId('palette-collapse').click();
    await page.getByTestId('palette-rail-category-input').click();

    const shell = page.locator('.qnn-shell');
    await expect(shell).not.toHaveAttribute('data-left-collapsed', /.*/);

    const group = page.locator('.qnn-palette-group[data-category="input"]');
    await expect(group).toBeVisible();
  });

  test('inspector rail dot reflects selection state', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/design');

    await page.getByTestId('inspector-collapse').click();
    await expect(page.getByTestId('inspector-rail-dot')).not.toHaveAttribute('data-selected', /.*/);

    await page.getByTestId('inspector-rail-expand').click();
    await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
    await page.locator('.qnn-cell').first().click();
    await page.getByTestId('inspector-collapse').click();
    await expect(page.getByTestId('inspector-rail-dot')).toHaveAttribute('data-selected', '');
  });

  test('collapse state persists across reload', async ({ page }) => {
    // One-shot clear — do not use clearDraft's init script, which runs again on reload.
    await page.goto('/design');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByTestId('palette-collapse').click();
    await page.getByTestId('inspector-collapse').click();

    await page.reload();

    const shell = page.locator('.qnn-shell');
    await expect(shell).toHaveAttribute('data-left-collapsed', '');
    await expect(shell).toHaveAttribute('data-right-collapsed', '');
    await expect(page.getByTestId('palette-rail-expand')).toBeVisible();
    await expect(page.getByTestId('inspector-rail-expand')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the E2E suite**

```bash
pnpm --filter @qnn/demo test:e2e pane-collapse
```

Expected: 4 tests pass. (Playwright's `webServer` config will auto-build and start the preview.)

If a test fails:
- Failure in test 3 on selection: make sure `dragPaletteToCanvas` drop actually inserts a cell — open a trace with `--trace on` and verify `.qnn-cell` exists.
- Failure on `data-left-collapsed` attribute: confirm the shell is rendering the attribute conditionally (React renders `data-x=""` only when the value is `""`, not `undefined`; an empty string shows up as the attribute with empty value).

- [ ] **Step 3: Run the full demo E2E suite to check for regressions**

```bash
pnpm --filter @qnn/demo test:e2e
```

Expected: all pre-existing E2E tests + 4 new ones pass.

- [ ] **Step 4: Run lint + typecheck across the workspace**

```bash
pnpm lint
pnpm typecheck
```

Expected: zero warnings / zero errors.

- [ ] **Step 5: Commit**

```bash
git add apps/demo/tests/pane-collapse.e2e.ts
git commit -m "test(demo): e2e coverage for collapsible panes"
```

---

## Completion criteria

- Clicking the chevron on either pane shrinks its column to 44px and renders a rail.
- Clicking any rail button (chevron, palette category icon, inspector dot) re-expands the pane.
- Clicking a palette category icon scrolls that group into view inside the `<aside>` scroll container.
- Inspector dot is filled when `selection.controlId !== null`, hollow otherwise.
- Collapse state for each pane persists across reload via `localStorage`.
- Below 960px viewport width, rails and collapse chevrons are hidden and the existing stacked layout wins.
- Dark mode reads correctly (token-driven; no hard-coded colors).
- `pnpm lint`, `pnpm typecheck`, `pnpm -r test`, `pnpm --filter @qnn/demo test:e2e` all green.
