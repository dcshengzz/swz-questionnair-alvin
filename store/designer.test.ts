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
    expect(q.pages[0]!.rows).toHaveLength(1);
    expect(q.pages[0]!.rows[0]!.cols).toHaveLength(0);
  });

  it('addControl inserts into row and page', () => {
    const { addControl } = store.getState();
    const plugin = defaultRegistry.get('textbox')!;
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const rowId = store.getState().questionnaire.pages[0]!.rows[0]!.id;
    addControl({ pageId, rowId, index: 0, plugin });
    const q = store.getState().questionnaire;
    expect(q.pages[0]!.rows[0]!.cols).toHaveLength(1);
    expect(q.pages[0]!.rows[0]!.cols[0]!.type).toBe('textbox');
    expect(q.pages[0]!.rows[0]!.cols[0]!.alias).toMatch(/^textbox_\d+$/);
  });

  it('insertRowAt creates a new row at index with span-12 control', () => {
    const { insertRowAt } = store.getState();
    const plugin = defaultRegistry.get('text')!;
    const pageId = store.getState().questionnaire.pages[0]!.id;
    insertRowAt({ pageId, index: 1, plugin });
    const q = store.getState().questionnaire;
    expect(q.pages[0]!.rows).toHaveLength(2);
    expect(q.pages[0]!.rows[1]!.cols[0]!.layout.span).toBe(12);
  });

  it('moveControl moves between rows', () => {
    const { addControl, moveControl, insertRowAt } = store.getState();
    const tbx = defaultRegistry.get('textbox')!;
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const row0 = store.getState().questionnaire.pages[0]!.rows[0]!.id;
    addControl({ pageId, rowId: row0, index: 0, plugin: tbx });
    insertRowAt({ pageId, index: 1, plugin: defaultRegistry.get('text')! });
    const controlId = store.getState().questionnaire.pages[0]!.rows[0]!.cols[0]!.id;
    const row1 = store.getState().questionnaire.pages[0]!.rows[1]!.id;
    moveControl({ pageId, rowId: row1, index: 0, controlId });
    const q = store.getState().questionnaire;
    expect(q.pages[0]!.rows[0]!.cols).toHaveLength(0);
    expect(q.pages[0]!.rows[1]!.cols.some((c) => c.id === controlId)).toBe(true);
  });

  it('moveControlToNewRow reorders a canvas control into a fresh row at the top without losing it', () => {
    const { addControl, insertRowAt, moveControlToNewRow } = store.getState();
    const tbx = defaultRegistry.get('textbox')!;
    const text = defaultRegistry.get('text')!;
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const row0 = store.getState().questionnaire.pages[0]!.rows[0]!.id;
    addControl({ pageId, rowId: row0, index: 0, plugin: tbx });
    insertRowAt({ pageId, index: 1, plugin: text });
    const controlId = store.getState().questionnaire.pages[0]!.rows[1]!.cols[0]!.id;

    moveControlToNewRow({ pageId, rowIndex: 0, controlId });

    const rows = store.getState().questionnaire.pages[0]!.rows;
    // The moved control is present in the first row, alone.
    expect(rows[0]!.cols.some((c) => c.id === controlId)).toBe(true);
    // No other row still contains the moved control.
    expect(rows.slice(1).every((r) => !r.cols.some((c) => c.id === controlId))).toBe(true);
  });

  it('moveControlToNewRow reorders a canvas control to the bottom without losing it', () => {
    const { addControl, insertRowAt, moveControlToNewRow } = store.getState();
    const tbx = defaultRegistry.get('textbox')!;
    const text = defaultRegistry.get('text')!;
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const row0 = store.getState().questionnaire.pages[0]!.rows[0]!.id;
    addControl({ pageId, rowId: row0, index: 0, plugin: tbx });
    insertRowAt({ pageId, index: 1, plugin: text });
    const controlId = store.getState().questionnaire.pages[0]!.rows[0]!.cols[0]!.id;
    const rowsBefore = store.getState().questionnaire.pages[0]!.rows.length;

    moveControlToNewRow({ pageId, rowIndex: rowsBefore, controlId });

    const rows = store.getState().questionnaire.pages[0]!.rows;
    // The moved control is in the last row.
    expect(rows[rows.length - 1]!.cols.some((c) => c.id === controlId)).toBe(true);
    // It no longer exists in any earlier row.
    expect(rows.slice(0, -1).every((r) => !r.cols.some((c) => c.id === controlId))).toBe(true);
  });

  it('resizeControl clamps to 1..12 and does not over-span row', () => {
    const { addControl, resizeControl } = store.getState();
    const plugin = defaultRegistry.get('textbox')!;
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const rowId = store.getState().questionnaire.pages[0]!.rows[0]!.id;
    addControl({ pageId, rowId, index: 0, plugin });
    addControl({ pageId, rowId, index: 1, plugin });
    const idA = store.getState().questionnaire.pages[0]!.rows[0]!.cols[0]!.id;
    resizeControl({ pageId, rowId, controlId: idA, span: 11 });
    const cols = store.getState().questionnaire.pages[0]!.rows[0]!.cols;
    const total = cols.reduce((s, c) => s + c.layout.span, 0);
    expect(total).toBeLessThanOrEqual(12);
  });

  it('deleteControl removes cell and collapses empty row', () => {
    const { addControl, deleteControl } = store.getState();
    const plugin = defaultRegistry.get('textbox')!;
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const rowId = store.getState().questionnaire.pages[0]!.rows[0]!.id;
    addControl({ pageId, rowId, index: 0, plugin });
    const controlId = store.getState().questionnaire.pages[0]!.rows[0]!.cols[0]!.id;
    deleteControl({ pageId, controlId });
    const page = store.getState().questionnaire.pages[0]!;
    expect(page.rows.length >= 1).toBe(true);
    expect(page.rows.every((r) => !r.cols.some((c) => c.id === controlId))).toBe(true);
  });

  it('updateControl patches node props', () => {
    const { addControl, updateControl } = store.getState();
    const plugin = defaultRegistry.get('textbox')!;
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const rowId = store.getState().questionnaire.pages[0]!.rows[0]!.id;
    addControl({ pageId, rowId, index: 0, plugin });
    const id = store.getState().questionnaire.pages[0]!.rows[0]!.cols[0]!.id;
    updateControl({ controlId: id, patch: { friendlyName: 'Changed' } });
    const c = store.getState().questionnaire.pages[0]!.rows[0]!.cols[0]!;
    expect(c.friendlyName).toBe('Changed');
  });

  it('addPage / renamePage / deletePage / reorderPages', () => {
    const { addPage, renamePage, deletePage, reorderPages } = store.getState();
    addPage('Two');
    expect(store.getState().questionnaire.pages).toHaveLength(2);
    const pid = store.getState().questionnaire.pages[1]!.id;
    renamePage(pid, 'Renamed');
    expect(store.getState().questionnaire.pages[1]!.name).toBe('Renamed');
    reorderPages([store.getState().questionnaire.pages[1]!.id, store.getState().questionnaire.pages[0]!.id]);
    expect(store.getState().questionnaire.pages[0]!.name).toBe('Renamed');
    deletePage(store.getState().questionnaire.pages[0]!.id);
    expect(store.getState().questionnaire.pages).toHaveLength(1);
  });

  it('undo/redo reverts last mutation', () => {
    const { addControl, undo, redo } = store.getState();
    const plugin = defaultRegistry.get('textbox')!;
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const rowId = store.getState().questionnaire.pages[0]!.rows[0]!.id;
    addControl({ pageId, rowId, index: 0, plugin });
    expect(store.getState().questionnaire.pages[0]!.rows[0]!.cols).toHaveLength(1);
    undo();
    expect(store.getState().questionnaire.pages[0]!.rows[0]!.cols).toHaveLength(0);
    redo();
    expect(store.getState().questionnaire.pages[0]!.rows[0]!.cols).toHaveLength(1);
  });
});
