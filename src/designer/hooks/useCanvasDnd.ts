import { useCallback, useState } from 'react';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import { useDesignerStore } from './useDesignerStore';

export interface DropTargetData {
  kind: 'gap' | 'in-row' | 'trash';
  pageId?: string;        // omitted for kind='trash' (pageId comes from the active payload)
  rowIndex?: number;      // for kind='gap'
  rowId?: string;         // for kind='in-row'
  colIndex?: number;
}

export function useCanvasDnd(registry: ControlRegistry) {
  const store = useDesignerStore();
  const [overId, setOverId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const onDragStart = useCallback((e: DragStartEvent) => {
    setOverId(null);
    setActiveId(String(e.active.id));
  }, []);
  const onDragOver = useCallback((e: DragOverEvent) => { setOverId(String(e.over?.id ?? '') || null); }, []);

  const onDragEnd = useCallback((e: DragEndEvent) => {
    setOverId(null);
    setActiveId(null);
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
      if (targetData.kind === 'gap' && targetData.pageId) {
        store.getState().insertRowAt({ pageId: targetData.pageId, index: targetData.rowIndex ?? 0, plugin });
      } else if (targetData.kind === 'in-row' && targetData.pageId && targetData.rowId) {
        store.getState().addControl({
          pageId: targetData.pageId,
          rowId: targetData.rowId,
          index: targetData.colIndex ?? 0,
          plugin,
        });
      }
      // kind==='trash' from the palette is a no-op (the control never existed).
      return;
    }
    if (fromCanvas) {
      const controlId = String(active.data.current?.controlId);
      if (targetData.kind === 'trash') {
        // Delete uses the pageId stamped on the drag payload — the trash target
        // itself is page-agnostic so it can live outside the canvas tree.
        const pageId = active.data.current?.pageId;
        if (typeof pageId === 'string') {
          store.getState().deleteControl({ pageId, controlId });
        }
        return;
      }
      if (targetData.kind === 'gap' && targetData.pageId) {
        // Atomic: strip the control from its current row and plant it alone in a
        // fresh row at the drop index. The old insert/delete/move sequence lost
        // the control when deleteControl's row-compaction collapsed the
        // placeholder row it had just inserted.
        store.getState().moveControlToNewRow({
          pageId: targetData.pageId,
          rowIndex: targetData.rowIndex ?? 0,
          controlId,
        });
      } else if (targetData.kind === 'in-row' && targetData.pageId && targetData.rowId) {
        store.getState().moveControl({
          pageId: targetData.pageId,
          rowId: targetData.rowId,
          index: targetData.colIndex ?? 0,
          controlId,
        });
      }
    }
  }, [registry, store]);

  return { onDragStart, onDragOver, onDragEnd, overId, activeId };
}
