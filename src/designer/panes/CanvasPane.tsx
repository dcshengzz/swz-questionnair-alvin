import { useDroppable } from '@dnd-kit/core';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import { useDesignerStore } from '../hooks/useDesignerStore';
import { Row } from './Row';

function RowGap({ pageId, index, active }: { pageId: string; index: number; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `gap:${pageId}:${index}`,
    data: { kind: 'gap', pageId, rowIndex: index },
  });
  return <div ref={setNodeRef} className={`qnn-row-gap${(isOver || active) ? ' qnn-dropactive' : ''}`} />;
}

/** A catch-all droppable that covers the empty canvas area; resolves to gap:0. */
function CanvasDropZone({ pageId, active }: { pageId: string; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `canvas:${pageId}`,
    data: { kind: 'gap', pageId, rowIndex: 0 },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      className={active || isOver ? 'qnn-dropactive' : ''}
    />
  );
}

export function CanvasPane({ registry, overId, activeId }: { registry: ControlRegistry; overId: string | null; activeId: string | null }) {
  const store = useDesignerStore();
  const q = store((s) => s.questionnaire);
  const currentPageId = store((s) => s.selection.pageId) ?? q.pages[0]?.id;
  const page = q.pages.find((p) => p.id === currentPageId) ?? q.pages[0];

  if (!page) return <div>No page</div>;
  const dragging = activeId != null;
  return (
    <div
      className={`qnn-canvas${dragging ? ' qnn-drop-active' : ''}`}
      style={{ position: 'relative' }}
      onClick={() => store.getState().selectControl(null)}
    >
      <CanvasDropZone pageId={page.id} active={overId === `canvas:${page.id}`} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <RowGap pageId={page.id} index={0} active={overId === `gap:${page.id}:0`} />
        {page.rows.map((row, i) => (
          <div key={row.id}>
            <Row row={row} pageId={page.id} registry={registry} />
            <RowGap pageId={page.id} index={i + 1} active={overId === `gap:${page.id}:${i + 1}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
