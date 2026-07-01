import { describe, it, expect } from 'vitest';
import { createDesignerStore } from '../../src/store/designer';
import { makeEmptyQuestionnaire } from '../../src/schema/factories';
import { defaultRegistry } from '../../src/registry/controls';

const textbox = defaultRegistry.get('textbox')!;
const text = defaultRegistry.get('text')!;

describe('designer moveControl — regression: sole-in-row move must not drop the control', () => {
  it('moving a sole-in-row cell back into its own rowId keeps the cell', () => {
    const store = createDesignerStore(makeEmptyQuestionnaire());
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const firstRowId = store.getState().questionnaire.pages[0]!.rows[0]!.id;
    store.getState().addControl({ pageId, rowId: firstRowId, index: 0, plugin: textbox });
    const q1 = store.getState().questionnaire;
    const row = q1.pages[0]!.rows[0]!;
    const cell = row.cols[0]!;
    expect(row.cols).toHaveLength(1);

    store.getState().moveControl({ pageId, rowId: row.id, index: 0, controlId: cell.id });

    const q2 = store.getState().questionnaire;
    const allCells = q2.pages[0]!.rows.flatMap((r) => r.cols);
    expect(allCells.map((c) => c.id)).toContain(cell.id);
  });

  it('moving a sole-in-row cell in a non-first row back into the same row keeps the cell', () => {
    const store = createDesignerStore(makeEmptyQuestionnaire());
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const firstRowId = store.getState().questionnaire.pages[0]!.rows[0]!.id;
    store.getState().addControl({ pageId, rowId: firstRowId, index: 0, plugin: textbox });
    store.getState().insertRowAt({ pageId, index: 1, plugin: text });

    const q1 = store.getState().questionnaire;
    expect(q1.pages[0]!.rows).toHaveLength(2);
    const row1 = q1.pages[0]!.rows[1]!;
    const soleCell = row1.cols[0]!;
    expect(row1.cols).toHaveLength(1);

    store.getState().moveControl({ pageId, rowId: row1.id, index: 0, controlId: soleCell.id });

    const q2 = store.getState().questionnaire;
    const allCells = q2.pages[0]!.rows.flatMap((r) => r.cols);
    expect(allCells.map((c) => c.id)).toContain(soleCell.id);
  });

  it('moving a sole-in-row cell into a different rowId keeps the cell', () => {
    const store = createDesignerStore(makeEmptyQuestionnaire());
    const pageId = store.getState().questionnaire.pages[0]!.id;
    const firstRowId = store.getState().questionnaire.pages[0]!.rows[0]!.id;
    // First cell alone in row 0.
    store.getState().addControl({ pageId, rowId: firstRowId, index: 0, plugin: textbox });
    // Second cell in a new row (row 1) via insertRowAt.
    store.getState().insertRowAt({ pageId, index: 1, plugin: text });

    const q1 = store.getState().questionnaire;
    const soleCell = q1.pages[0]!.rows[0]!.cols[0]!;
    const targetRow = q1.pages[0]!.rows[1]!;
    expect(q1.pages[0]!.rows[0]!.cols).toHaveLength(1);

    // Drop sole cell into targetRow at index 1 (after the existing cell).
    store.getState().moveControl({ pageId, rowId: targetRow.id, index: 1, controlId: soleCell.id });

    const q2 = store.getState().questionnaire;
    const allCells = q2.pages[0]!.rows.flatMap((r) => r.cols);
    expect(allCells.map((c) => c.id)).toContain(soleCell.id);
  });
});
