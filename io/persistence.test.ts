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
