import type { ControlRegistry } from '../../registry/ControlRegistry';
import type { Row as RowT } from '../../schema/types';
import { Cell } from './Cell';

export function Row({ row, pageId, registry }: { row: RowT; pageId: string; registry: ControlRegistry }) {
  return (
    <div className="qnn-row" data-row-id={row.id}>
      {row.cols.map((c, i) => (
        <Cell
          key={c.id}
          node={c}
          pageId={pageId}
          rowId={row.id}
          colIndex={i}
          registry={registry}
          firstInRow={i === 0}
          lastInRow={i === row.cols.length - 1}
        />
      ))}
    </div>
  );
}
