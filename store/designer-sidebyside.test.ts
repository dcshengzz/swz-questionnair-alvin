import { describe, it, expect } from 'vitest';
import { createDesignerStore } from '../../src/store/designer';
import { makeEmptyQuestionnaire } from '../../src/schema/factories';
import { defaultRegistry } from '../../src/registry/controls';

const textbox = defaultRegistry.get('textbox')!;

describe('side-by-side insertion rebalances a full row', () => {
  it('dropping a second control into a full-width row yields two 6-span cells', () => {
    const store = createDesignerStore(makeEmptyQuestionnaire());
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const rowId = store.getState().questionnaire.pages[0]!.rows[0]!.id;

    store.getState().addControl({ pageId, rowId, index: 0, plugin: textbox });
    store.getState().addControl({ pageId, rowId, index: 1, plugin: textbox });

    const row = store.getState().questionnaire.pages[0]!.rows[0]!;
    expect(row.cols).toHaveLength(2);
    expect(row.cols.map((c) => c.layout.span)).toEqual([6, 6]);
  });

  it('three drops into the same row produce an even 4/4/4 split', () => {
    const store = createDesignerStore(makeEmptyQuestionnaire());
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const rowId = store.getState().questionnaire.pages[0]!.rows[0]!.id;

    store.getState().addControl({ pageId, rowId, index: 0, plugin: textbox });
    store.getState().addControl({ pageId, rowId, index: 1, plugin: textbox });
    store.getState().addControl({ pageId, rowId, index: 2, plugin: textbox });

    const row = store.getState().questionnaire.pages[0]!.rows[0]!;
    expect(row.cols).toHaveLength(3);
    expect(row.cols.map((c) => c.layout.span)).toEqual([4, 4, 4]);
  });

  it('drop into a partially-filled row uses the clamped span without rebalancing', () => {
    const store = createDesignerStore(makeEmptyQuestionnaire());
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const rowId = store.getState().questionnaire.pages[0]!.rows[0]!.id;

    store.getState().addControl({ pageId, rowId, index: 0, plugin: textbox });
    // Shrink the first cell so there's headroom for the next insert.
    const firstCellId = store.getState().questionnaire.pages[0]!.rows[0]!.cols[0]!.id;
    store.getState().resizeControl({ pageId, rowId, controlId: firstCellId, span: 8 });

    store.getState().addControl({ pageId, rowId, index: 1, plugin: textbox });

    const row = store.getState().questionnaire.pages[0]!.rows[0]!;
    expect(row.cols).toHaveLength(2);
    // First cell kept at 8; new cell clamped to the remaining 4; total 12, no rebalance needed.
    expect(row.cols.map((c) => c.layout.span)).toEqual([8, 4]);
  });
});
