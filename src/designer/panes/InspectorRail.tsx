import { Tooltip } from 'antd';
import { MenuUnfoldOutlined } from '@ant-design/icons';

export interface InspectorRailProps {
  hasSelection: boolean;
  onExpand: () => void;
}

export function InspectorRail({ hasSelection, onExpand }: InspectorRailProps) {
  return (
    <div className="qnn-pane-rail">
      <Tooltip title="Expand inspector" placement="left">
        <button
          type="button"
          className="qnn-pane-rail-btn"
          data-testid="inspector-rail-expand"
          aria-label="Expand inspector"
          onClick={onExpand}
        >
          <MenuUnfoldOutlined className="qnn-icon-flip" />
        </button>
      </Tooltip>
      <Tooltip
        title={hasSelection ? 'Expand inspector (control selected)' : 'Expand inspector'}
        placement="left"
      >
        <button
          type="button"
          className="qnn-pane-rail-btn"
          data-testid="inspector-rail-dot-btn"
          aria-label="Expand inspector"
          onClick={onExpand}
        >
          <span
            className="qnn-inspector-dot"
            data-testid="inspector-rail-dot"
            {...(hasSelection ? { 'data-selected': '' } : {})}
          />
        </button>
      </Tooltip>
    </div>
  );
}
