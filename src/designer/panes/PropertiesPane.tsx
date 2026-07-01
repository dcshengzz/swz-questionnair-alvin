import { Tabs, Tooltip, Typography } from 'antd';
import { MenuFoldOutlined } from '@ant-design/icons';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import type { ControlNode, Page } from '../../schema/types';
import { useDesignerStore } from '../hooks/useDesignerStore';
import { RulesTab } from './RulesTab';

function findControl(q: { pages: Page[] }, id: string): ControlNode | null {
  for (const p of q.pages) for (const r of p.rows) for (const c of r.cols) if (c.id === id) return c;
  return null;
}
function otherAliases(q: { pages: Page[] }, id: string): string[] {
  const out: string[] = [];
  for (const p of q.pages) for (const r of p.rows) for (const c of r.cols) if (c.id !== id) out.push(c.alias);
  return out;
}

function CollapseChevron({ onCollapse }: { onCollapse?: () => void }) {
  if (!onCollapse) return null;
  return (
    <Tooltip title="Collapse inspector">
      <button
        type="button"
        className="qnn-pane-collapse-btn"
        data-testid="inspector-collapse"
        aria-label="Collapse inspector"
        onClick={onCollapse}
      >
        <MenuFoldOutlined className="qnn-icon-flip" />
      </button>
    </Tooltip>
  );
}

export interface PropertiesPaneProps {
  registry: ControlRegistry;
  onCollapse?: () => void;
}

export function PropertiesPane({ registry, onCollapse }: PropertiesPaneProps) {
  const store = useDesignerStore();
  const q = store((s) => s.questionnaire);
  const selControlId = store((s) => s.selection.controlId);

  if (selControlId) {
    const node = findControl(q, selControlId);
    if (!node) return <Typography.Text type="secondary">Selection lost.</Typography.Text>;
    const plugin = registry.get(node.type);
    if (!plugin?.PropertyEditor) return <Typography.Text type="secondary">No editor for {node.type}.</Typography.Text>;
    const others = otherAliases(q, node.id);
    return (
      <div>
        <div className="qnn-pane-title-row">
          <h3 className="qnn-pane-title">Properties</h3>
          <CollapseChevron {...(onCollapse ? { onCollapse } : {})} />
        </div>
        <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>{plugin.label}</Typography.Title>
        <plugin.PropertyEditor
          node={node as never}
          otherAliases={others}
          questionnaire={q}
          onChange={(patch) => store.getState().updateControl({ controlId: node.id, patch: patch as Partial<ControlNode> })}
        />
      </div>
    );
  }
  return (
    <div>
      <div className="qnn-pane-title-row">
        <h3 className="qnn-pane-title">Inspector</h3>
        <CollapseChevron {...(onCollapse ? { onCollapse } : {})} />
      </div>
      <Tabs
        defaultActiveKey="page"
        items={[
          { key: 'page', label: 'Page', children: <Typography.Text type="secondary">Click a control to edit, or switch to Rules.</Typography.Text> },
          { key: 'rules', label: 'Rules', children: <RulesTab /> },
        ]}
      />
    </div>
  );
}
