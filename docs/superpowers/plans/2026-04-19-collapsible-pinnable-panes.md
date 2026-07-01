# Collapsible & Pinnable Palette / Inspector Panes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Palette (left) and Inspector (right) panes of the QNN Designer collapsible with optional pinning. When unpinned-and-open, panes overlay the canvas; when pinned, they dock and consume grid space. State persists across reloads.

**Architecture:** A small React hook (`useLayoutPrefs`) owns pin/open state per pane, persisted to `localStorage` outside the Zustand domain store. A second hook (`useAutoOpenInspector`) auto-opens Inspector on selection changes. `DesignerShell` reads both, sets `data-*` attributes on `.qnn-shell`, and conditionally renders pane wrappers (`PaneFrame`) alongside always-on rail tabs (`PaneRail`). CSS Grid handles docked widths; absolute positioning handles overlays.

**Tech Stack:** React 18, TypeScript (strict), Vitest + jsdom + `@testing-library/react`, AntD 5 + `@ant-design/icons`, plain CSS.

**Spec:** [`docs/superpowers/specs/2026-04-19-collapsible-pinnable-panes-design.md`](../specs/2026-04-19-collapsible-pinnable-panes-design.md)

**Test command shortcut (used throughout):**
```
pnpm --filter @qnn/designer exec vitest run <path> -t '<test name>'
```

---

## Task 1: `useLayoutPrefs` hook

**Files:**
- Create: `packages/designer/src/designer/hooks/useLayoutPrefs.ts`
- Create: `packages/designer/tests/designer/useLayoutPrefs.test.ts`

The hook owns `{ palette, inspector }` pane prefs, each `{ pinned, open }`. It reads/writes `localStorage` under a versioned key, falls back to defaults on missing/corrupted data, and exposes `togglePin(pane)` and `setOpen(pane, open)` that don't cross-modify each other.

- [ ] **Step 1: Write the failing tests**

Create `packages/designer/tests/designer/useLayoutPrefs.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLayoutPrefs } from '../../src/designer/hooks/useLayoutPrefs';

const KEY = 'qnn:layoutPrefs:v1';
const DEFAULTS = {
  palette: { pinned: false, open: false },
  inspector: { pinned: false, open: false },
};

describe('useLayoutPrefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when localStorage is empty', () => {
    const { result } = renderHook(() => useLayoutPrefs());
    expect(result.current.prefs).toEqual(DEFAULTS);
  });

  it('togglePin flips only that pane.pinned and persists', () => {
    const { result } = renderHook(() => useLayoutPrefs());
    act(() => result.current.togglePin('palette'));
    expect(result.current.prefs.palette).toEqual({ pinned: true, open: false });
    expect(result.current.prefs.inspector).toEqual({ pinned: false, open: false });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(result.current.prefs);
  });

  it('setOpen flips only that pane.open and persists', () => {
    const { result } = renderHook(() => useLayoutPrefs());
    act(() => result.current.setOpen('inspector', true));
    expect(result.current.prefs.inspector).toEqual({ pinned: false, open: true });
    expect(result.current.prefs.palette).toEqual({ pinned: false, open: false });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(result.current.prefs);
  });

  it('writes survive a remount (read back from localStorage)', () => {
    const { result, unmount } = renderHook(() => useLayoutPrefs());
    act(() => {
      result.current.togglePin('inspector');
      result.current.setOpen('palette', true);
    });
    unmount();
    const { result: r2 } = renderHook(() => useLayoutPrefs());
    expect(r2.current.prefs).toEqual({
      palette: { pinned: false, open: true },
      inspector: { pinned: true, open: false },
    });
  });

  it('falls back to defaults on corrupted JSON', () => {
    localStorage.setItem(KEY, 'not-json{');
    const { result } = renderHook(() => useLayoutPrefs());
    expect(result.current.prefs).toEqual(DEFAULTS);
  });

  it('falls back to defaults on object missing fields', () => {
    localStorage.setItem(KEY, JSON.stringify({}));
    const { result } = renderHook(() => useLayoutPrefs());
    expect(result.current.prefs).toEqual(DEFAULTS);
  });

  it('setOpen with same value is a no-op (does not change reference)', () => {
    const { result } = renderHook(() => useLayoutPrefs());
    const before = result.current.prefs;
    act(() => result.current.setOpen('palette', false));
    expect(result.current.prefs).toBe(before);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```
pnpm --filter @qnn/designer exec vitest run tests/designer/useLayoutPrefs.test.ts
```
Expected: all 7 tests fail with "Cannot find module '../../src/designer/hooks/useLayoutPrefs'".

- [ ] **Step 3: Implement the hook**

Create `packages/designer/src/designer/hooks/useLayoutPrefs.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';

export type PaneId = 'palette' | 'inspector';
export type PanePrefs = { pinned: boolean; open: boolean };
export type LayoutPrefs = { palette: PanePrefs; inspector: PanePrefs };

const STORAGE_KEY = 'qnn:layoutPrefs:v1';

const DEFAULTS: LayoutPrefs = {
  palette: { pinned: false, open: false },
  inspector: { pinned: false, open: false },
};

function isPanePrefs(v: unknown): v is PanePrefs {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as PanePrefs).pinned === 'boolean' &&
    typeof (v as PanePrefs).open === 'boolean'
  );
}

function isLayoutPrefs(v: unknown): v is LayoutPrefs {
  return (
    !!v &&
    typeof v === 'object' &&
    isPanePrefs((v as LayoutPrefs).palette) &&
    isPanePrefs((v as LayoutPrefs).inspector)
  );
}

function readPrefs(): LayoutPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as unknown;
    return isLayoutPrefs(parsed) ? parsed : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function writePrefs(prefs: LayoutPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode / quota — silently degrade to in-memory only */
  }
}

export function useLayoutPrefs(): {
  prefs: LayoutPrefs;
  togglePin: (pane: PaneId) => void;
  setOpen: (pane: PaneId, open: boolean) => void;
} {
  const [prefs, setPrefs] = useState<LayoutPrefs>(() => readPrefs());

  useEffect(() => {
    writePrefs(prefs);
  }, [prefs]);

  const togglePin = useCallback((pane: PaneId) => {
    setPrefs((p) => ({ ...p, [pane]: { ...p[pane], pinned: !p[pane].pinned } }));
  }, []);

  const setOpen = useCallback((pane: PaneId, open: boolean) => {
    setPrefs((p) => (p[pane].open === open ? p : { ...p, [pane]: { ...p[pane], open } }));
  }, []);

  return { prefs, togglePin, setOpen };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```
pnpm --filter @qnn/designer exec vitest run tests/designer/useLayoutPrefs.test.ts
```
Expected: all 7 tests pass.

- [ ] **Step 5: Run typecheck**

```
pnpm --filter @qnn/designer typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/designer/hooks/useLayoutPrefs.ts \
        packages/designer/tests/designer/useLayoutPrefs.test.ts
git commit -m "feat(designer): add useLayoutPrefs hook with localStorage persistence"
```

---

## Task 2: `useAutoOpenInspector` hook

**Files:**
- Create: `packages/designer/src/designer/hooks/useAutoOpenInspector.ts`
- Create: `packages/designer/tests/designer/useAutoOpenInspector.test.ts`

A small hook that watches `controlId` and calls `setOpen('inspector', true)` whenever it transitions from `null` to non-null OR from one id to another. Returns a `pulse: boolean` flag that flips true for 1200ms after the same trigger (consumed by the rail tab CSS as a fallback hint).

- [ ] **Step 1: Write the failing tests**

Create `packages/designer/tests/designer/useAutoOpenInspector.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAutoOpenInspector } from '../../src/designer/hooks/useAutoOpenInspector';
import type { PaneId } from '../../src/designer/hooks/useLayoutPrefs';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

function makeSetOpen() {
  const calls: Array<[PaneId, boolean]> = [];
  const setOpen = (pane: PaneId, open: boolean) => { calls.push([pane, open]); };
  return { calls, setOpen };
}

describe('useAutoOpenInspector', () => {
  it('does not call setOpen when initial controlId is null', () => {
    const { calls, setOpen } = makeSetOpen();
    renderHook(() => useAutoOpenInspector(null, setOpen));
    expect(calls).toEqual([]);
  });

  it('calls setOpen on initial mount when controlId is non-null', () => {
    const { calls, setOpen } = makeSetOpen();
    renderHook(() => useAutoOpenInspector('a', setOpen));
    expect(calls).toEqual([['inspector', true]]);
  });

  it('calls setOpen when controlId transitions null -> non-null', () => {
    const { calls, setOpen } = makeSetOpen();
    const { rerender } = renderHook(
      ({ id }: { id: string | null }) => useAutoOpenInspector(id, setOpen),
      { initialProps: { id: null as string | null } },
    );
    expect(calls).toEqual([]);
    rerender({ id: 'a' });
    expect(calls).toEqual([['inspector', true]]);
  });

  it('calls setOpen when controlId transitions from one id to another', () => {
    const { calls, setOpen } = makeSetOpen();
    const { rerender } = renderHook(
      ({ id }: { id: string | null }) => useAutoOpenInspector(id, setOpen),
      { initialProps: { id: 'a' as string | null } },
    );
    rerender({ id: 'b' });
    expect(calls).toEqual([['inspector', true], ['inspector', true]]);
  });

  it('does not call setOpen when controlId stays the same across rerenders', () => {
    const { calls, setOpen } = makeSetOpen();
    const { rerender } = renderHook(
      ({ id }: { id: string | null }) => useAutoOpenInspector(id, setOpen),
      { initialProps: { id: 'a' as string | null } },
    );
    rerender({ id: 'a' });
    rerender({ id: 'a' });
    expect(calls).toEqual([['inspector', true]]); // only the initial mount call
  });

  it('does not call setOpen when controlId transitions to null', () => {
    const { calls, setOpen } = makeSetOpen();
    const { rerender } = renderHook(
      ({ id }: { id: string | null }) => useAutoOpenInspector(id, setOpen),
      { initialProps: { id: 'a' as string | null } },
    );
    calls.length = 0;
    rerender({ id: null });
    expect(calls).toEqual([]);
  });

  it('returns pulse=true after a triggering change and pulse=false after 1200ms', () => {
    const { setOpen } = makeSetOpen();
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useAutoOpenInspector(id, setOpen),
      { initialProps: { id: null as string | null } },
    );
    expect(result.current).toBe(false);
    rerender({ id: 'a' });
    expect(result.current).toBe(true);
    act(() => { vi.advanceTimersByTime(1200); });
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```
pnpm --filter @qnn/designer exec vitest run tests/designer/useAutoOpenInspector.test.ts
```
Expected: all 7 tests fail with "Cannot find module".

- [ ] **Step 3: Implement the hook**

Create `packages/designer/src/designer/hooks/useAutoOpenInspector.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import type { PaneId } from './useLayoutPrefs';

export function useAutoOpenInspector(
  controlId: string | null,
  setOpen: (pane: PaneId, open: boolean) => void,
): boolean {
  const [pulse, setPulse] = useState(false);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    const last = prev.current;
    prev.current = controlId;
    if (controlId !== null && controlId !== last) {
      setOpen('inspector', true);
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [controlId, setOpen]);

  return pulse;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```
pnpm --filter @qnn/designer exec vitest run tests/designer/useAutoOpenInspector.test.ts
```
Expected: all 7 tests pass.

- [ ] **Step 5: Run typecheck**

```
pnpm --filter @qnn/designer typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/designer/src/designer/hooks/useAutoOpenInspector.ts \
        packages/designer/tests/designer/useAutoOpenInspector.test.ts
git commit -m "feat(designer): add useAutoOpenInspector hook"
```

---

## Task 3: `PaneRail` component

**Files:**
- Create: `packages/designer/src/designer/panes/PaneRail.tsx`

A pure-presentational `<button>` showing a small icon and a 90°-rotated label. Used as the always-visible click target inside the 36px edge rail. Per the spec, no unit tests for presentational components; manual verification covers integration.

- [ ] **Step 1: Create the component**

Create `packages/designer/src/designer/panes/PaneRail.tsx`:

```tsx
import type { ReactNode } from 'react';

export interface PaneRailProps {
  side: 'left' | 'right';
  label: string;
  icon: ReactNode;
  onClick: () => void;
  pulsing?: boolean;
}

export function PaneRail({ side, label, icon, onClick, pulsing }: PaneRailProps) {
  const cls = `qnn-rail-tab qnn-rail-tab--${side}${pulsing ? ' qnn-rail-tab--pulsing' : ''}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cls}
      aria-label={`Open ${label.toLowerCase()} pane`}
      data-testid={`rail-${side}`}
    >
      <span className="qnn-rail-tab-icon" aria-hidden>{icon}</span>
      <span className="qnn-rail-tab-label">{label}</span>
    </button>
  );
}
```

- [ ] **Step 2: Run typecheck**

```
pnpm --filter @qnn/designer typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/designer/src/designer/panes/PaneRail.tsx
git commit -m "feat(designer): add PaneRail tab component"
```

---

## Task 4: `PaneFrame` component

**Files:**
- Create: `packages/designer/src/designer/panes/PaneFrame.tsx`

Wraps pane content with a header that contains a static title and two icon buttons (pin and collapse). Pin button shows filled+accent when pinned, outlined+muted when not. Manual verification covers integration.

- [ ] **Step 1: Create the component**

Create `packages/designer/src/designer/panes/PaneFrame.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Button, Tooltip } from 'antd';
import { CloseOutlined, PushpinFilled, PushpinOutlined } from '@ant-design/icons';

export interface PaneFrameProps {
  title: string;
  pinned: boolean;
  onTogglePin: () => void;
  onClose: () => void;
  children: ReactNode;
}

export function PaneFrame({ title, pinned, onTogglePin, onClose, children }: PaneFrameProps) {
  const pinLabel = pinned ? 'Unpin pane' : 'Pin pane';
  return (
    <div className="qnn-pane-frame-inner">
      <div className="qnn-pane-frame-header">
        <h3 className="qnn-pane-title qnn-pane-frame-title">{title}</h3>
        <div className="qnn-pane-frame-actions">
          <Tooltip title={pinLabel}>
            <Button
              type="text"
              size="small"
              icon={
                pinned
                  ? <PushpinFilled style={{ color: 'var(--qnn-accent)' }} />
                  : <PushpinOutlined />
              }
              onClick={onTogglePin}
              aria-label={pinLabel}
              data-testid="pane-pin"
            />
          </Tooltip>
          <Tooltip title="Collapse">
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={onClose}
              aria-label="Collapse pane"
              data-testid="pane-collapse"
            />
          </Tooltip>
        </div>
      </div>
      <div className="qnn-pane-frame-body">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```
pnpm --filter @qnn/designer typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/designer/src/designer/panes/PaneFrame.tsx
git commit -m "feat(designer): add PaneFrame header wrapper component"
```

---

## Task 5: CSS — shell grid, rail, frame, animations, mobile

**Files:**
- Modify: `packages/designer/src/designer/styles.css`

Replace the existing `.qnn-shell` block, the `aside.qnn-left` / `aside.qnn-right` rules, the scrollbar selectors, and the `@media (max-width: 960px)` block. Add new sections for `.qnn-rail`, `.qnn-rail-tab`, `.qnn-pane-frame`, header, body, and animations. Mobile keeps the same model (no vertical stack).

The result still works with the existing `.qnn-canvas`, `.qnn-row`, `.qnn-cell`, etc. — only the shell and side-pane sections change.

- [ ] **Step 1: Replace the `.qnn-shell` block and side-pane rules**

In `packages/designer/src/designer/styles.css`, find the section starting with the comment:

```
/* ==========================================================================
   Shell — 3-pane layout
   ========================================================================== */
```

…and ending just before:

```
/* ==========================================================================
   Palette (left pane)
   ========================================================================== */
```

(In the current file this spans roughly the `.qnn-shell` block, the two `aside` background rules, and the four scrollbar selectors targeting `aside`.)

Replace that entire section with:

```css
/* ==========================================================================
   Shell — 5-track grid: rail | palette-track | main | inspector-track | rail
   Palette / inspector tracks collapse to 0 when their pane is closed or
   shown as overlay; the panes themselves are absolutely positioned in
   overlay mode and live in their grid track in docked mode.
   ========================================================================== */

.qnn-shell {
  display: grid;
  grid-template-columns: 36px 0 1fr 0 36px;
  flex: 1;
  min-height: 0;
  background: var(--qnn-bg);
  position: relative;
  transition: grid-template-columns 200ms var(--qnn-ease);
}

.qnn-shell[data-palette-state="docked"] {
  grid-template-columns: 36px 288px 1fr 0 36px;
}

.qnn-shell[data-inspector-state="docked"] {
  grid-template-columns: 36px 0 1fr 344px 36px;
}

.qnn-shell[data-palette-state="docked"][data-inspector-state="docked"] {
  grid-template-columns: 36px 288px 1fr 344px 36px;
}

@media (prefers-reduced-motion: reduce) {
  .qnn-shell {
    transition: none;
  }
}

.qnn-shell > .qnn-rail--left { grid-column: 1; }
.qnn-shell > .qnn-pane-frame--left { grid-column: 2; }
.qnn-shell > main { grid-column: 3; }
.qnn-shell > .qnn-pane-frame--right { grid-column: 4; }
.qnn-shell > .qnn-rail--right { grid-column: 5; }

.qnn-shell > main {
  min-height: 0;
  overflow: auto;
  padding: 28px 32px;
  background: var(--qnn-canvas-bg);
}

/* Custom thin scrollbars in the canvas and pane bodies */
.qnn-shell > main::-webkit-scrollbar,
.qnn-pane-frame-body::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.qnn-shell > main::-webkit-scrollbar-track,
.qnn-pane-frame-body::-webkit-scrollbar-track {
  background: transparent;
}

.qnn-shell > main::-webkit-scrollbar-thumb,
.qnn-pane-frame-body::-webkit-scrollbar-thumb {
  background: transparent;
  border: 2px solid transparent;
  border-radius: 8px;
  background-clip: padding-box;
}

.qnn-shell > main:hover::-webkit-scrollbar-thumb,
.qnn-pane-frame-body:hover::-webkit-scrollbar-thumb {
  background-color: rgba(15, 23, 42, 0.2);
  background-clip: padding-box;
}

/* ==========================================================================
   Edge rails — always visible 36px strip on each side
   ========================================================================== */

.qnn-rail {
  background: var(--qnn-surface);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12px;
  overflow: visible;
  min-height: 0;
}

.qnn-rail--left { border-right: 1px solid var(--qnn-hairline); }
.qnn-rail--right { border-left: 1px solid var(--qnn-hairline); }

.qnn-rail-tab {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  width: 28px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--qnn-ink-soft);
  cursor: pointer;
  transition:
    background 0.12s var(--qnn-ease),
    border-color 0.12s var(--qnn-ease),
    color 0.12s var(--qnn-ease),
    box-shadow 0.12s var(--qnn-ease);
}

.qnn-rail-tab:hover {
  background: var(--qnn-accent-weak);
  border-color: var(--qnn-accent-border);
  color: var(--qnn-accent);
}

.qnn-rail-tab:focus-visible {
  outline: 2px solid var(--qnn-accent);
  outline-offset: 1px;
}

.qnn-rail-tab-icon {
  font-size: 14px;
  display: inline-flex;
}

.qnn-rail-tab-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

@keyframes qnn-rail-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--qnn-accent-weak); }
  50% { box-shadow: 0 0 0 4px var(--qnn-accent-weak); }
}

.qnn-rail-tab--pulsing {
  animation: qnn-rail-pulse 0.6s var(--qnn-ease) 2;
  border-color: var(--qnn-accent-border);
}

@media (prefers-reduced-motion: reduce) {
  .qnn-rail-tab--pulsing { animation: none; }
}

/* ==========================================================================
   Pane frame — header (title + pin + collapse) above pane body
   Two presentations: docked (lives in grid track) or overlay (absolute).
   ========================================================================== */

.qnn-pane-frame {
  background: var(--qnn-surface);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.qnn-pane-frame--docked.qnn-pane-frame--left { border-right: 1px solid var(--qnn-hairline); }
.qnn-pane-frame--docked.qnn-pane-frame--right { border-left: 1px solid var(--qnn-hairline); }

.qnn-pane-frame--overlay {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 10;
  width: 288px;
  box-shadow: var(--qnn-shadow-lg);
  animation: qnn-pane-slide-in-left 200ms var(--qnn-ease);
}

.qnn-pane-frame--overlay.qnn-pane-frame--left {
  left: 36px;
  border-right: 1px solid var(--qnn-hairline);
}

.qnn-pane-frame--overlay.qnn-pane-frame--right {
  right: 36px;
  width: 344px;
  border-left: 1px solid var(--qnn-hairline);
  animation-name: qnn-pane-slide-in-right;
}

.qnn-pane-frame--docked.qnn-pane-frame--right .qnn-pane-frame-inner {
  /* docked right pane track is 344px from grid; nothing extra needed */
}

@keyframes qnn-pane-slide-in-left {
  from { transform: translateX(-16px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes qnn-pane-slide-in-right {
  from { transform: translateX(16px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .qnn-pane-frame--overlay { animation: none; }
}

.qnn-pane-frame-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.qnn-pane-frame-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--qnn-hairline);
  flex: none;
}

.qnn-pane-frame-title {
  margin: 0;
  padding: 0;
}

.qnn-pane-frame-actions {
  display: flex;
  gap: 2px;
}

.qnn-pane-frame-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
}
```

- [ ] **Step 2: Remove the old `<960px` mobile-stack media query**

Find this block at the bottom of the file:

```css
/* ==========================================================================
   Responsive — stack on narrow
   ========================================================================== */

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

Delete the block including its banner comment. The `@media (max-width: 640px)` topbar tightening block immediately below it stays.

- [ ] **Step 3: Run typecheck (CSS doesn't typecheck, but ensure the build still parses)**

```
pnpm --filter @qnn/designer build
```
Expected: build succeeds (it bundles `styles.css`).

- [ ] **Step 4: Commit**

```bash
git add packages/designer/src/designer/styles.css
git commit -m "feat(designer): rewrite shell CSS for collapsible panes"
```

---

## Task 6: Wire up `DesignerShell` and strip pane headings

**Files:**
- Modify: `packages/designer/src/designer/Designer.tsx` (entire `DesignerShell`)
- Modify: `packages/designer/src/designer/panes/PalettePane.tsx`
- Modify: `packages/designer/src/designer/panes/PropertiesPane.tsx`

`DesignerShell` reads layout prefs, sets `data-*` state attributes on `.qnn-shell`, renders rails always (with the rail tab visible only when the pane is closed), and conditionally renders the docked-or-overlay pane via `PaneFrame`. It also wires `useAutoOpenInspector` to the store's selection. The two pane components drop their internal `<h3 class="qnn-pane-title">` headings since `PaneFrame` owns the header now.

- [ ] **Step 1: Strip the heading from `PalettePane.tsx`**

In `packages/designer/src/designer/panes/PalettePane.tsx`, replace:

```tsx
  return (
    <div>
      <h3 className="qnn-pane-title">Palette</h3>
      {(['content', 'input', 'advanced'] as const).map((cat) =>
```

with:

```tsx
  return (
    <div>
      {(['content', 'input', 'advanced'] as const).map((cat) =>
```

(Removes only the `<h3>` line; everything else in the file stays.)

- [ ] **Step 2: Strip both headings from `PropertiesPane.tsx`**

In `packages/designer/src/designer/panes/PropertiesPane.tsx`, find the two `<h3 className="qnn-pane-title">` lines (one in the "Properties" branch, one in the "Inspector" branch) and delete them. The Typography titles below the deleted h3s stay.

After this change the selected-control branch reads:

```tsx
    return (
      <div>
        <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>{plugin.label}</Typography.Title>
        <plugin.PropertyEditor
          node={node as never}
          otherAliases={others}
          onChange={(patch) => store.getState().updateControl({ controlId: node.id, patch: patch as Partial<ControlNode> })}
        />
      </div>
    );
```

…and the no-selection branch reads:

```tsx
  return (
    <div>
      <Tabs
        defaultActiveKey="page"
        items={[
          { key: 'page', label: 'Page', children: <Typography.Text type="secondary">Click a control to edit, or switch to Rules.</Typography.Text> },
          { key: 'rules', label: 'Rules', children: <RulesTab /> },
        ]}
      />
    </div>
  );
```

- [ ] **Step 3: Replace `DesignerShell` in `Designer.tsx`**

In `packages/designer/src/designer/Designer.tsx`, replace the imports block and the `DesignerShell` function with the following. The outer `QuestionnaireDesigner` and surrounding exports stay unchanged.

Replace the imports block at the top (lines 1–16 in the current file):

```tsx
import { useMemo, useState } from 'react';
import { MouseSensor, TouchSensor, DndContext, useSensor, useSensors } from '@dnd-kit/core';
import { AppstoreOutlined, SettingOutlined } from '@ant-design/icons';
import { makeEmptyQuestionnaire } from '../schema/factories';
import { createDesignerStore, type DesignerStore } from '../store/designer';
import { DesignerStoreContext, useDesignerStore } from './hooks/useDesignerStore';
import { useCanvasDnd } from './hooks/useCanvasDnd';
import { useLayoutPrefs, type PaneId } from './hooks/useLayoutPrefs';
import { useAutoOpenInspector } from './hooks/useAutoOpenInspector';
import { defaultRegistry } from '../registry/controls';
import type { ControlPlugin } from '../registry/types';
import type { Questionnaire } from '../schema/types';
import type { ControlRegistry } from '../registry/ControlRegistry';
import { TopBar } from './TopBar';
import { PalettePane } from './panes/PalettePane';
import { CanvasPane } from './panes/CanvasPane';
import { PropertiesPane } from './panes/PropertiesPane';
import { PageTabs } from './panes/PageTabs';
import { PaneRail } from './panes/PaneRail';
import { PaneFrame } from './panes/PaneFrame';
import './styles.css';
```

Replace the entire `DesignerShell` function with:

```tsx
function DesignerShell({ registry, onExport }: { registry: ControlRegistry; onExport?: (q: Questionnaire, includeLogic: boolean) => void }) {
  // Separate Mouse + Touch sensors (instead of one PointerSensor). On mobile,
  // PointerSensor's PointerEvents race the browser's pan gesture and lose —
  // pointercancel fires mid-drag and the drop never registers. TouchSensor binds
  // non-passive touchmove listeners so its preventDefault() actually wins. We
  // use `distance` activation (not `delay`) so the non-passive listeners bind
  // at touchstart, before any passive touchmove can leak through and let the
  // browser hijack the gesture.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
  );
  const { onDragEnd, onDragOver, onDragStart, overId, activeId } = useCanvasDnd(registry);
  const { prefs, togglePin, setOpen } = useLayoutPrefs();
  const store = useDesignerStore();
  const controlId = store((s) => s.selection.controlId);
  const inspectorPulse = useAutoOpenInspector(controlId, setOpen);

  const stateAttr = (p: PaneId): 'closed' | 'docked' | 'overlay' => {
    if (!prefs[p].open) return 'closed';
    return prefs[p].pinned ? 'docked' : 'overlay';
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar registry={registry} {...(onExport ? { onExport } : {})} />
        <PageTabs />
        <div
          className="qnn-shell"
          data-palette-state={stateAttr('palette')}
          data-inspector-state={stateAttr('inspector')}
        >
          <aside className="qnn-rail qnn-rail--left">
            {!prefs.palette.open && (
              <PaneRail
                side="left"
                label="Palette"
                icon={<AppstoreOutlined />}
                onClick={() => setOpen('palette', true)}
              />
            )}
          </aside>
          {prefs.palette.open && (
            <aside
              className={`qnn-pane-frame qnn-pane-frame--${prefs.palette.pinned ? 'docked' : 'overlay'} qnn-pane-frame--left`}
              data-testid="pane-palette"
            >
              <PaneFrame
                title="Palette"
                pinned={prefs.palette.pinned}
                onTogglePin={() => togglePin('palette')}
                onClose={() => setOpen('palette', false)}
              >
                <PalettePane registry={registry} />
              </PaneFrame>
            </aside>
          )}
          <main><CanvasPane registry={registry} overId={overId} activeId={activeId} /></main>
          {prefs.inspector.open && (
            <aside
              className={`qnn-pane-frame qnn-pane-frame--${prefs.inspector.pinned ? 'docked' : 'overlay'} qnn-pane-frame--right`}
              data-testid="pane-inspector"
            >
              <PaneFrame
                title="Inspector"
                pinned={prefs.inspector.pinned}
                onTogglePin={() => togglePin('inspector')}
                onClose={() => setOpen('inspector', false)}
              >
                <PropertiesPane registry={registry} />
              </PaneFrame>
            </aside>
          )}
          <aside className="qnn-rail qnn-rail--right">
            {!prefs.inspector.open && (
              <PaneRail
                side="right"
                label="Inspector"
                icon={<SettingOutlined />}
                onClick={() => setOpen('inspector', true)}
                pulsing={inspectorPulse}
              />
            )}
          </aside>
        </div>
      </div>
    </DndContext>
  );
}
```

- [ ] **Step 4: Run the unit tests**

```
pnpm --filter @qnn/designer test
```
Expected: all tests pass (Tasks 1 and 2 added 14 new tests; nothing else should regress).

- [ ] **Step 5: Run typecheck**

```
pnpm --filter @qnn/designer typecheck
```
Expected: no errors.

- [ ] **Step 6: Run the build to verify CSS + TSX bundle**

```
pnpm --filter @qnn/designer build
```
Expected: build succeeds.

- [ ] **Step 7: Manual UI verification in the demo app**

Start the dev server:

```
pnpm dev
```

Open the demo in a browser and run through this checklist. Each step is a pass/fail.

1. Clear `localStorage` (devtools → Application → Storage). Reload. Both rails (left and right, ~36px) are visible. The canvas occupies the area between them.
2. Click the left rail tab ("Palette"). The Palette pane slides in as an overlay over the canvas. Canvas geometry is unchanged (no horizontal shift).
3. Click the same rail tab area (it's now hidden because the pane is open) — it shouldn't be visible. Click the X (collapse) button in the pane header instead. The pane closes; rail tab returns.
4. Open the Palette. Click the pin icon. The pin turns filled+accent. The canvas shrinks to make room (Palette is now docked at 288px).
5. Reload the page. Palette is still docked-open and pinned (state persisted).
6. Drag a control from the docked Palette onto the canvas. Drop succeeds.
7. Unpin the Palette (click pin again). It becomes an overlay; canvas widens. Drag a control from the overlay-Palette onto the canvas. Drop succeeds; overlay stays open after the drag.
8. Close the Palette via X. Click a control on the canvas. Inspector auto-opens (overlay) with the right contents.
9. Click a different control. Inspector contents update; pane stays open.
10. Click empty canvas. Inspector stays open. Click X to close it.
11. Pin Inspector (open it via rail tab → click pin). Reload. Inspector docked-open with no selection.
12. Resize the browser to a narrow width (~400px). Both rails still present; opening either pane shows it as an overlay over the (now narrow) canvas. Drag/select still work.
13. With both panes pinned-open on a wide viewport: layout is `[36 rail] [288 palette] [canvas] [344 inspector] [36 rail]`. No overlap or scrollbar weirdness in the topbar / page tabs.

If any item fails, fix and re-test before committing. Note any fixes in the commit message.

- [ ] **Step 8: Commit**

```bash
git add packages/designer/src/designer/Designer.tsx \
        packages/designer/src/designer/panes/PalettePane.tsx \
        packages/designer/src/designer/panes/PropertiesPane.tsx
git commit -m "feat(designer): collapsible & pinnable palette/inspector panes"
```

---

## Self-review checklist (run after the plan is complete)

- Spec coverage:
  - `useLayoutPrefs` hook (state, persistence, fallback) — Task 1.
  - Auto-open Inspector on selection — Task 2 (hook) + Task 6 (wired in shell).
  - Edge rail (always visible, click to expand) — Task 3 + Task 5 (CSS) + Task 6 (rendered).
  - Pane frame header (pin + collapse) — Task 4 + Task 5 (CSS) + Task 6 (rendered).
  - Docked-vs-overlay rendering — Task 5 (CSS uses `data-*-state` + `--docked`/`--overlay` modifiers) + Task 6 (sets attrs + classes).
  - Width transitions on grid template + slide-in on overlay + reduced-motion — Task 5.
  - No Esc handler — implementation never adds one.
  - Mobile: same model, no vertical stack — Task 5 deletes the old `<960px` block; no replacement added.
  - Drag from unpinned overlay onto canvas — manual checklist step 7 in Task 6.
  - Both panes pinned-open on narrow viewport — manual checklist step 13 in Task 6.
- No placeholders found (all code, paths, commands are concrete).
- Type/name consistency: `PaneId`, `LayoutPrefs`, `togglePin`, `setOpen`, `useAutoOpenInspector` are referenced consistently across tasks.
