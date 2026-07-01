import { DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import type { ControlNode } from '../../schema/types';
import { useDesignerStore } from '../hooks/useDesignerStore';
import { ResizeHandle } from './ResizeHandle';
import { PluginErrorBoundary } from '../../util/errorBoundary';

/**
 * Thin drop zones on the left/right edges of a cell. They sit on top of the
 * cell so they take priority in collision detection during a drag, giving the
 * user an unambiguous "insert before/after this cell" affordance with a
 * visible vertical indicator bar. The cell body itself is still draggable.
 */
function InsertEdgeAfter({
  pageId,
  rowId,
  colIndex,
}: {
  pageId: string;
  rowId: string;
  colIndex: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `edge:${rowId}:${colIndex}:after`,
    data: { kind: 'in-row', pageId, rowId, colIndex },
  });
  return (
    <div
      ref={setNodeRef}
      aria-hidden="true"
      data-testid={`edge-${rowId}-${colIndex}-after`}
      className={`qnn-cell-edge qnn-cell-edge-after${isOver ? ' qnn-dropactive' : ''}`}
    />
  );
}

function InsertEdgeBefore({
  pageId,
  rowId,
  colIndex,
}: {
  pageId: string;
  rowId: string;
  colIndex: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `edge:${rowId}:${colIndex}:before`,
    data: { kind: 'in-row', pageId, rowId, colIndex },
  });
  return (
    <div
      ref={setNodeRef}
      aria-hidden="true"
      data-testid={`edge-${rowId}-${colIndex}-before`}
      className={`qnn-cell-edge qnn-cell-edge-before${isOver ? ' qnn-dropactive' : ''}`}
    />
  );
}

export function Cell({
  node, pageId, rowId, colIndex, registry, lastInRow, firstInRow,
}: {
  node: ControlNode;
  pageId: string;
  rowId: string;
  colIndex: number;
  registry: ControlRegistry;
  lastInRow: boolean;
  firstInRow: boolean;
}) {
  const store = useDesignerStore();
  const selection = store((s) => s.selection);
  const plugin = registry.get(node.type);

  const { attributes, listeners, setNodeRef: dragRef, isDragging } = useDraggable({
    id: `cell:${node.id}`,
    data: { source: 'canvas', controlId: node.id, controlType: node.type, pageId },
  });
  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `in-row:${rowId}:${colIndex}`,
    data: { kind: 'in-row', pageId, rowId, colIndex },
  });
  const selected = selection.controlId === node.id;

  return (
    <div
      ref={(el) => { dragRef(el); dropRef(el); }}
      data-testid={`cell-${node.alias || node.id}`}
      style={{ ['--span' as string]: node.layout.span }}
      className={
        `qnn-cell${selected ? ' qnn-selected' : ''}${isOver ? ' qnn-hover' : ''}${isDragging ? ' qnn-dragging' : ''}`
      }
      onClick={(e) => { e.stopPropagation(); store.getState().selectControl(node.id); }}
    >
      <button
        type="button"
        className="qnn-cell-handle"
        aria-label="Drag to reorder"
        data-testid={`handle-${node.alias || node.id}`}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <HolderOutlined />
      </button>
      <Tooltip title="Remove control">
        <button
          type="button"
          className="qnn-cell-delete"
          aria-label="Remove control"
          data-testid={`delete-${node.alias || node.id}`}
          onClick={(e) => {
            e.stopPropagation();
            store.getState().deleteControl({ pageId, controlId: node.id });
          }}
        >
          <DeleteOutlined />
        </button>
      </Tooltip>
      <PluginErrorBoundary fallback={<em>⚠ Could not render (type: {node.type})</em>}>
        {plugin?.CanvasPreview ? <plugin.CanvasPreview node={node} /> : <em>Unknown: {node.type}</em>}
      </PluginErrorBoundary>
      <ResizeHandle pageId={pageId} rowId={rowId} controlId={node.id} currentSpan={node.layout.span} />
      {firstInRow && (
        <InsertEdgeBefore pageId={pageId} rowId={rowId} colIndex={colIndex} />
      )}
      {lastInRow && (
        <InsertEdgeAfter pageId={pageId} rowId={rowId} colIndex={colIndex + 1} />
      )}
    </div>
  );
}
