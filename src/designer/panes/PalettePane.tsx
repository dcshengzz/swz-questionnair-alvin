import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Tooltip } from 'antd';
import { DeleteOutlined, MenuFoldOutlined } from '@ant-design/icons';
import type { ControlRegistry } from '../../registry/ControlRegistry';
import type { ControlPlugin, PaletteGroup } from '../../registry/types';
import { usePaletteInsert } from '../hooks/usePaletteInsert';

function PaletteItem({ plugin }: { plugin: ControlPlugin }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `palette:${plugin.type}`,
    data: { source: 'palette', pluginType: plugin.type },
  });
  const insert = usePaletteInsert();
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-testid={`palette-${plugin.type}`}
      className="qnn-palette-item"
      onClick={() => insert(plugin)}
    >
      <span className="qnn-palette-icon">{plugin.icon}</span>
      <span>{plugin.label}</span>
    </div>
  );
}

function PaletteTrash() {
  const { setNodeRef, isOver, active } = useDroppable({
    id: 'palette-trash',
    data: { kind: 'trash' },
  });
  const fromCanvas = active?.data.current?.source === 'canvas';
  // Only arm the trash while a canvas cell is in flight — palette drags that
  // land here fall through to the snap-back path instead of silently vanishing.
  const armed = isOver && fromCanvas;
  return (
    <div
      ref={setNodeRef}
      data-testid="palette-trash"
      aria-label="Drop a control here to delete it"
      className={`qnn-palette-trash${armed ? ' qnn-dropactive' : ''}`}
    >
      <DeleteOutlined className="qnn-palette-trash-icon" />
      <span>Drop here to delete</span>
    </div>
  );
}

export interface PalettePaneProps {
  registry: ControlRegistry;
  onCollapse?: () => void;
}

const GROUP_ORDER: PaletteGroup[] = ['content', 'basic', 'scales', 'device', 'compute'];
const GROUP_LABELS: Record<PaletteGroup, string> = {
  content: 'Content',
  basic: 'Basic input',
  scales: 'Scales',
  device: 'Device capture',
  compute: 'Computed',
};

/** Map a plugin to its palette group. `group` field wins; fall back to category. */
function groupOf(p: ControlPlugin): PaletteGroup {
  if (p.group) return p.group;
  if (p.category === 'content') return 'content';
  if (p.category === 'advanced') return 'compute';
  return 'basic';
}

export function PalettePane({ registry, onCollapse }: PalettePaneProps) {
  const grouped: Record<PaletteGroup, ControlPlugin[]> = {
    content: [], basic: [], scales: [], device: [], compute: [],
  };
  for (const p of registry.all()) grouped[groupOf(p)].push(p);
  return (
    <div className="qnn-palette-pane">
      <div className="qnn-pane-title-row">
        <h3 className="qnn-pane-title">Palette</h3>
        {onCollapse ? (
          <Tooltip title="Collapse palette">
            <button
              type="button"
              className="qnn-pane-collapse-btn"
              data-testid="palette-collapse"
              aria-label="Collapse palette"
              onClick={onCollapse}
            >
              <MenuFoldOutlined />
            </button>
          </Tooltip>
        ) : null}
      </div>
      <div className="qnn-palette-groups">
        {GROUP_ORDER.map((g) =>
          grouped[g].length === 0 ? null : (
            <div
              key={g}
              className="qnn-palette-group"
              data-group={g}
            >
              <div className="qnn-palette-heading">{GROUP_LABELS[g]}</div>
              {grouped[g].map((p) => (
                <PaletteItem key={p.type} plugin={p} />
              ))}
            </div>
          ),
        )}
      </div>
      <PaletteTrash />
    </div>
  );
}
