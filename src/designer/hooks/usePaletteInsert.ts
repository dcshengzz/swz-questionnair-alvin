import { useCallback } from 'react';
import type { ControlPlugin } from '../../registry/types';
import { useDesignerStore } from './useDesignerStore';

export function usePaletteInsert() {
  const store = useDesignerStore();
  return useCallback((plugin: ControlPlugin) => {
    const state = store.getState();
    const q = state.questionnaire;
    const pageId = state.selection.pageId ?? q.pages[0]?.id;
    if (!pageId) return;
    const page = q.pages.find((p) => p.id === pageId);
    if (!page) return;
    state.insertRowAt({ pageId, index: page.rows.length, plugin });
  }, [store]);
}
