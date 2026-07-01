import { Tooltip } from 'antd';
import { DeleteOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import type { ControlPlugin, PaletteGroup } from '../../registry/types';
import { usePaletteInsert } from '../hooks/usePaletteInsert';

const GROUP_ORDER: PaletteGroup[] = ['content', 'basic', 'scales', 'device', 'compute'];

function groupOf(p: ControlPlugin): PaletteGroup {
  if (p.group) return p.group;
  if (p.category === 'content') return 'content';
  if (p.category === 'advanced') return 'compute';
  return 'basic';
}

function PaletteRailItem({ plugin }: { plugin: ControlPlugin }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `palette:${plugin.type}`,
    data: { source: 'palette', pluginType: plugin.type },
  });
  const insert = usePaletteInsert();
  return (
    <Tooltip title={plugin.label} placement="right">
      <button
        ref={setNodeRef}
        type="button"
        className="qnn-pane-rail-btn"
        data-testid={`palette-rail-${plugin.type}`}
        aria-label={plugin.label}
        {...attributes}
        {...listeners}
        onClick={() => insert(plugin)}
      >
        {plugin.icon}
      </button>
    </Tooltip>
  );
}

function PaletteRailTrash() {
  const { setNodeRef, isOver, active } = useDroppable({
    id: 'palette-trash',
    data: { kind: 'trash' },
  });
  const armed = isOver && active?.data.current?.source === 'canvas';
  const classes = `qnn-pane-rail-btn qnn-pane-rail-trash${armed ? ' qnn-dropactive' : ''}`;
  return (
    <Tooltip title="Drop here to delete" placement="right">
      <div
        ref={setNodeRef}
        data-testid="palette-trash"
        aria-label="Drop a control here to delete it"
        className={classes}
      >
        <DeleteOutlined />
      </div>
    </Tooltip>
  );
}

export interface PaletteRailProps {
  registry: ControlRegistry;
  onExpand: () => void;
}

export function PaletteRail({ registry, onExpand }: PaletteRailProps) {
  const grouped: Record<PaletteGroup, ControlPlugin[]> = {
    content: [], basic: [], scales: [], device: [], compute: [],
  };
  for (const p of registry.all()) grouped[groupOf(p)].push(p);
  const visibleGroups = GROUP_ORDER.filter((g) => grouped[g].length > 0);
  return (
    <div className="qnn-pane-rail">
      <Tooltip title="Expand palette" placement="right">
        <button
          type="button"
          className="qnn-pane-rail-btn"
          data-testid="palette-rail-expand"
          aria-label="Expand palette"
          onClick={onExpand}
        >
          <MenuUnfoldOutlined />
        </button>
      </Tooltip>
      <div className="qnn-pane-rail-scroll">
        {visibleGroups.map((g, gi) => (
          <div key={g} className="qnn-pane-rail-group" data-group={g}>
            {gi > 0 && <div className="qnn-pane-rail-sep" aria-hidden="true" />}
            {grouped[g].map((plugin) => (
              <PaletteRailItem key={plugin.type} plugin={plugin} />
            ))}
          </div>
        ))}
      </div>
      <PaletteRailTrash />
    </div>
  );
}
