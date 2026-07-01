import { useSyncExternalStore } from 'react';

/**
 * Lightweight per-matrix-node "selected cell" store. Lets the matrix
 * `CanvasPreview` (where the user clicks) and the `PropertyEditor` (where
 * the per-cell options live) share state without touching the global
 * designer store. State is keyed by node id, so multiple matrices on the
 * same page don't collide.
 */
export type CellSelection = { rowKey: string; colKey: string } | null;

const state = new Map<string, CellSelection>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setMatrixCellSelection(nodeId: string, sel: CellSelection): void {
  if (sel == null) state.delete(nodeId);
  else state.set(nodeId, sel);
  emit();
}

export function useMatrixCellSelection(nodeId: string): CellSelection {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => state.get(nodeId) ?? null,
    () => null,
  );
}
