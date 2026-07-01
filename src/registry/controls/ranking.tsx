import { useMemo } from 'react';
import { BarsOutlined, HolderOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Form, Input, Space, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export interface RankingOption { value: string; label: string; }
export interface RankingProps {
  options: RankingOption[];
}

const rankingPlugin: ControlPlugin<RankingProps> = {
  type: 'ranking',
  category: 'input',
  group: 'basic',
  label: 'Ranking',
  icon: <BarsOutlined />,
  description: 'Drag to order a list of options from most to least preferred.',
  isAnswerable: true,

  defaultProps: () => ({
    options: [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
      { value: 'c', label: 'Option C' },
    ],
  }),
  defaultNode: () => ({
    type: 'ranking',
    friendlyName: 'Ranking',
    required: false,
    layout: { span: 12 },
    props: {
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
        { value: 'c', label: 'Option C' },
      ],
    },
  }),

  CanvasPreview: ({ node }) => (
    <div>
      <QuestionText node={node} />
      <RankingList options={node.props.options} value={null} disabled />
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => {
    const setOpts = (options: RankingOption[]) => onChange({ props: { ...node.props, options } });
    return (
      <Form layout="vertical">
        {commonPropertyFields(node, onChange, otherAliases)}
        <Form.Item label="Options (initial order)">
          <Space direction="vertical" style={{ width: '100%' }}>
            {node.props.options.map((opt, i) => (
              <Space.Compact key={i} style={{ width: '100%' }}>
                <Input
                  value={opt.value}
                  placeholder="value"
                  onChange={(e) => {
                    const next = [...node.props.options];
                    next[i] = { ...opt, value: e.target.value };
                    setOpts(next);
                  }}
                />
                <Input
                  value={opt.label}
                  placeholder="label"
                  onChange={(e) => {
                    const next = [...node.props.options];
                    next[i] = { ...opt, label: e.target.value };
                    setOpts(next);
                  }}
                />
                <Button icon={<DeleteOutlined />} onClick={() => setOpts(node.props.options.filter((_, j) => j !== i))} />
              </Space.Compact>
            ))}
            <Button
              icon={<PlusOutlined />}
              onClick={() =>
                setOpts([
                  ...node.props.options,
                  { value: `opt${node.props.options.length + 1}`, label: `Option ${node.props.options.length + 1}` },
                ])
              }
            >Add option</Button>
          </Space>
        </Form.Item>
      </Form>
    );
  },

  Renderer: ({ node, value, onChange, disabled, error }) => (
    <RankingList
      options={node.props.options}
      value={(value as string[] | undefined) ?? null}
      disabled={disabled}
      error={!!error}
      onChange={(next) => onChange(next)}
    />
  ),

  isValueEmpty: (v) => !Array.isArray(v) || (v as string[]).length === 0,
};

/**
 * Reconcile the persisted order with the current option set: preserve the
 * saved order for values that still exist, drop removed values, and append
 * any newly-added options to the end.
 */
function reconcileOrder(options: RankingOption[], saved: string[] | null): string[] {
  const validKeys = new Set(options.map((o) => o.value));
  const fromSaved = (saved ?? []).filter((k) => validKeys.has(k));
  const seen = new Set(fromSaved);
  const tail = options.map((o) => o.value).filter((k) => !seen.has(k));
  return [...fromSaved, ...tail];
}

function RankingList({
  options,
  value,
  onChange,
  disabled,
  error,
}: {
  options: RankingOption[];
  value: string[] | null;
  onChange?: (next: string[]) => void;
  disabled?: boolean | undefined;
  error?: boolean | undefined;
}) {
  const order = useMemo(() => reconcileOrder(options, value), [options, value]);
  const labelByKey = useMemo(
    () => new Map(options.map((o) => [o.value, o.label])),
    [options],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    if (disabled || !onChange) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onChange(arrayMove(order, from, to));
  };

  return (
    <div
      className="qnn-ranking-list"
      style={{
        border: `1px solid ${error ? '#ff4d4f' : 'var(--qnn-hairline)'}`,
        borderRadius: 6,
        padding: 4,
      }}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((key, idx) => (
            <SortableItem
              key={key}
              id={key}
              index={idx}
              label={labelByKey.get(key) ?? key}
              disabled={disabled}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableItem({
  id,
  index,
  label,
  disabled,
}: {
  id: string;
  index: number;
  label: string;
  disabled?: boolean | undefined;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !!disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    background: isDragging ? 'var(--qnn-accent-weak)' : 'var(--qnn-surface)',
    border: '1px solid var(--qnn-hairline)',
    borderRadius: 4,
    marginBottom: 4,
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <button
        type="button"
        aria-label={`Drag to reorder ${label}`}
        {...attributes}
        {...listeners}
        disabled={!!disabled}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: disabled ? 'not-allowed' : 'grab',
          color: 'var(--qnn-ink-muted)',
          display: 'inline-flex',
        }}
      >
        <HolderOutlined />
      </button>
      <Typography.Text strong style={{ minWidth: 22, color: 'var(--qnn-ink-muted)' }}>
        {index + 1}.
      </Typography.Text>
      <Typography.Text>{label}</Typography.Text>
    </div>
  );
}

export default rankingPlugin;
