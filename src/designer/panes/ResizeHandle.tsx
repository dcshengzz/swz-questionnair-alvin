import { useEffect, useRef, useState } from 'react';
import { useDesignerStore } from '../hooks/useDesignerStore';

export function ResizeHandle({
  pageId, rowId, controlId, currentSpan,
}: {
  pageId: string; rowId: string; controlId: string; currentSpan: number;
}) {
  const store = useDesignerStore();
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; startSpan: number; colWidth: number } | null>(null);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!startRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const delta = Math.round(dx / startRef.current.colWidth);
      const next = startRef.current.startSpan + delta;
      store.getState().resizeControl({ pageId, rowId, controlId, span: next });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, pageId, rowId, controlId, store]);

  return (
    <span
      className={`qnn-cell-resize${dragging ? ' qnn-active' : ''}`}
      role="separator"
      tabIndex={0}
      aria-label="Resize column span"
      aria-valuenow={currentSpan}
      aria-valuemin={1}
      aria-valuemax={12}
      onMouseDown={(e) => {
        e.stopPropagation();
        const rowEl = (e.target as HTMLElement).closest('.qnn-row') as HTMLElement | null;
        const colWidth = rowEl ? rowEl.getBoundingClientRect().width / 12 : 80;
        startRef.current = { x: e.clientX, startSpan: currentSpan, colWidth };
        setDragging(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || (e.key === 'ArrowLeft')) {
          e.preventDefault();
          const d = e.key === 'ArrowRight' ? 1 : -1;
          store.getState().resizeControl({ pageId, rowId, controlId, span: currentSpan + d });
        }
      }}
    />
  );
}
