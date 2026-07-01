import { create } from 'zustand';
import { temporal } from 'zundo';
import type { ControlPlugin } from '../registry/types';
import { newId } from '../util/ids';
import type { ControlNode, PageId, Questionnaire, Row } from '../schema/types';

export interface DesignerActions {
  addControl: (args: { pageId: PageId; rowId: string; index: number; plugin: ControlPlugin }) => void;
  insertRowAt: (args: { pageId: PageId; index: number; plugin: ControlPlugin }) => void;
  moveControl: (args: { pageId: PageId; rowId: string; index: number; controlId: string }) => void;
  moveControlToNewRow: (args: { pageId: PageId; rowIndex: number; controlId: string }) => void;
  resizeControl: (args: { pageId: PageId; rowId: string; controlId: string; span: number }) => void;
  deleteControl: (args: { pageId: PageId; controlId: string }) => void;
  updateControl: (args: { controlId: string; patch: Partial<ControlNode> }) => void;
  addPage: (name?: string) => void;
  renamePage: (pageId: PageId, name: string) => void;
  deletePage: (pageId: PageId) => void;
  clearPage: (pageId: PageId) => void;
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
  // Plugin types may contain characters that aren't valid in aliases (e.g.
  // `matrix-single`). Strip them to underscores so the seed alias passes
  // the alias regex.
  const safeBase = base.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[^a-zA-Z_]/, '_');
  const existing = new Set<string>();
  for (const p of q.pages) for (const r of p.rows) for (const c of r.cols) existing.add(c.alias);
  let i = 1;
  while (existing.has(`${safeBase}_${i}`)) i++;
  return `${safeBase}_${i}`;
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

/**
 * If a row's total span exceeds 12 (because a cell was just inserted into a
 * full row), redistribute spans evenly across every column. Keeps side-by-side
 * drops from producing 1fr-wide slivers — instead the existing full-width
 * cell and the new one end up 6/6, three cells become 4/4/4, and so on.
 */
function rebalanceIfOverflowing(cols: ControlNode[]): ControlNode[] {
  const total = cols.reduce((s, c) => s + c.layout.span, 0);
  if (total <= 12 || cols.length === 0) return cols;
  const n = cols.length;
  const base = Math.max(1, Math.floor(12 / n));
  const used = base * n;
  const remainder = 12 - used;
  return cols.map((c, i) => ({
    ...c,
    layout: { span: base + (i < remainder ? 1 : 0) },
  }));
}

function stamp(q: Questionnaire): Questionnaire {
  return { ...q, meta: { ...q.meta, updatedAt: new Date().toISOString() } };
}

export function createDesignerStore(initial: Questionnaire) {
  return create<DesignerState>()(
    temporal(
      (set, get, api) => ({
        questionnaire: initial,
        selection: { controlId: null, pageId: null },

        addControl: ({ pageId, rowId, index, plugin }) => set((s) => {
          const q = s.questionnaire;
          let insertedId: string | null = null;
          const pages = q.pages.map((p) => {
            if (p.id !== pageId) return p;
            return {
              ...p,
              rows: p.rows.map((r) => {
                if (r.id !== rowId) return r;
                const raw = nodeFromPlugin(plugin, q);
                // Start with the requested span; if the row overflows, every
                // cell in the row (new + existing) is rebalanced evenly below.
                const node = { ...raw, layout: { span: clampSpanOnInsert(r, raw.layout.span) } };
                insertedId = node.id;
                const cols = [...r.cols];
                cols.splice(Math.min(index, cols.length), 0, node);
                return { ...r, cols: rebalanceIfOverflowing(cols) };
              }),
            };
          });
          return {
            questionnaire: stamp({ ...q, pages }),
            ...(insertedId ? { selection: { controlId: insertedId, pageId } } : {}),
          };
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
          return { questionnaire: stamp({ ...q, pages }), selection: { controlId: node.id, pageId } };
        }),

        moveControl: ({ pageId, rowId, index, controlId }) => set((s) => {
          const q = s.questionnaire;
          let moved: ControlNode | null = null;
          // Strip the control from its current row but keep all rows intact —
          // if we filter empty rows here and the target row becomes empty, the
          // subsequent insert loop can't find `rowId` and the moved control
          // vanishes. Empty-row cleanup happens at the end, after insertion.
          const stripped = q.pages.map((p) => ({
            ...p,
            rows: p.rows.map((r) => {
              const remaining: ControlNode[] = [];
              for (const c of r.cols) if (c.id === controlId) moved = c; else remaining.push(c);
              return { ...r, cols: remaining };
            }),
          }));
          if (!moved) return {};
          const movedNode: ControlNode = moved;
          const inserted = stripped.map((p) => {
            if (p.id !== pageId) return p;
            return {
              ...p,
              rows: p.rows.map((r) => {
                if (r.id !== rowId) return r;
                const clamped = { ...movedNode, layout: { span: clampSpanOnInsert(r, movedNode.layout.span) } };
                const cols = [...r.cols];
                cols.splice(Math.min(index, cols.length), 0, clamped);
                return { ...r, cols: rebalanceIfOverflowing(cols) };
              }),
            };
          });
          // Final cleanup: drop empty rows, but always keep the first row so
          // the canvas has a drop target even when the page has no cells.
          const pages = inserted.map((p) => ({
            ...p,
            rows: p.rows.filter((r, i) => r.cols.length > 0 || i === 0),
          }));
          return { questionnaire: stamp({ ...q, pages }) };
        }),

        /**
         * Atomic: strip a canvas control from its current row and place it alone
         * in a newly created row at `rowIndex`. Used by the canvas DnD gap-drop
         * path where the previous insert/delete/move sequence lost the control
         * whenever `deleteControl`'s row-compaction dropped the placeholder row.
         */
        moveControlToNewRow: ({ pageId, rowIndex, controlId }) => set((s) => {
          const q = s.questionnaire;
          let moved: ControlNode | null = null;
          const pagesStripped = q.pages.map((p) => ({
            ...p,
            rows: p.rows
              .map((r) => {
                const remaining: ControlNode[] = [];
                for (const c of r.cols) {
                  if (c.id === controlId) moved = c;
                  else remaining.push(c);
                }
                return { ...r, cols: remaining };
              })
              .filter((r, i) => r.cols.length > 0 || i === 0),
          }));
          if (!moved) return {};
          // Re-bind through a const so TS stops narrowing `moved` to `never`
          // inside the closure below (same pattern as moveControl above).
          const movedNode: ControlNode = moved;
          const clampedSpan = Math.max(1, Math.min(12, movedNode.layout.span));
          const newRow: Row = { id: newId(), cols: [{ ...movedNode, layout: { span: clampedSpan } }] };
          const pages = pagesStripped.map((p) => {
            if (p.id !== pageId) return p;
            const base = [...p.rows];
            const insertAt = Math.min(Math.max(0, rowIndex), base.length);
            base.splice(insertAt, 0, newRow);
            // Drop any empty rows left behind by the strip pass; keep the new row
            // even though its id is fresh, since it carries the moved control.
            const cleaned = base.filter((r) => r.cols.length > 0 || r.id === newRow.id);
            return { ...p, rows: cleaned.length > 0 ? cleaned : [newRow] };
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

        clearPage: (pageId) => set((s) => {
          const q = s.questionnaire;
          const pages = q.pages.map((p) =>
            p.id === pageId ? { ...p, rows: [{ id: newId(), cols: [] }] } : p,
          );
          return {
            questionnaire: stamp({ ...q, pages }),
            selection: { ...s.selection, controlId: null },
          };
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

        undo: () => { (api as unknown as { temporal: { getState: () => { undo: () => void } } }).temporal?.getState().undo(); },
        redo: () => { (api as unknown as { temporal: { getState: () => { redo: () => void } } }).temporal?.getState().redo(); },
      }),
      {
        partialize: (state) => ({ questionnaire: state.questionnaire }),
        limit: 100,
      },
    ),
  );
}

export type DesignerStore = ReturnType<typeof createDesignerStore>;
