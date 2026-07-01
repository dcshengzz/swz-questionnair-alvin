import { TrophyOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Space, Switch, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export interface TopNOption { value: string; label: string; }
export interface TopNProps {
  options: TopNOption[];
  /** How many items the respondent must pick. */
  topN: number;
  /** If true, selections are ordered (1st, 2nd, …); otherwise it's a capped multi-select. */
  ordered: boolean;
}

function toArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

const topnPlugin: ControlPlugin<TopNProps> = {
  type: 'topn',
  category: 'input',
  group: 'basic',
  label: 'Top N picker',
  icon: <TrophyOutlined />,
  description: 'Pick the top X from a list of options — ordered or unordered.',
  isAnswerable: true,

  defaultProps: () => ({
    topN: 3,
    ordered: true,
    options: [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
      { value: 'c', label: 'Option C' },
      { value: 'd', label: 'Option D' },
      { value: 'e', label: 'Option E' },
    ],
  }),
  defaultNode: () => ({
    type: 'topn',
    friendlyName: 'Top picks',
    required: false,
    layout: { span: 12 },
    props: {
      topN: 3,
      ordered: true,
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
        { value: 'c', label: 'Option C' },
        { value: 'd', label: 'Option D' },
        { value: 'e', label: 'Option E' },
      ],
    },
  }),

  CanvasPreview: ({ node }) => (
    <div>
      <QuestionText node={node} />
      <TopNList node={node} value={undefined} disabled />
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => {
    const setOpts = (options: TopNOption[]) => onChange({ props: { ...node.props, options } });
    return (
      <Form layout="vertical">
        {commonPropertyFields(node, onChange, otherAliases)}
        <Form.Item label="How many picks (top N)">
          <InputNumber
            min={1}
            max={Math.max(1, node.props.options.length)}
            value={node.props.topN}
            onChange={(v) => {
              const n = Math.max(1, Math.min(Math.max(1, node.props.options.length), Number(v) || 1));
              onChange({ props: { ...node.props, topN: n } });
            }}
          />
        </Form.Item>
        <Form.Item label="Ordered (1st, 2nd, …)">
          <Switch
            checked={node.props.ordered}
            onChange={(v) => onChange({ props: { ...node.props, ordered: v } })}
          />
        </Form.Item>
        <Form.Item label="Options">
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
    <TopNList
      node={node}
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={!!error}
    />
  ),

  validate: (node, value, ctx) => {
    const arr = toArray(value);
    const { topN } = node.props;
    if (!ctx.required && arr.length === 0) return null;
    if (arr.length !== topN) {
      return `${node.friendlyName}: please pick exactly ${topN} option${topN === 1 ? '' : 's'}.`;
    }
    return null;
  },

  isValueEmpty: (v) => toArray(v).length === 0,
};

function TopNList({
  node,
  value,
  onChange,
  disabled,
  error,
}: {
  node: { props: TopNProps };
  value: unknown;
  onChange?: ((v: unknown) => void) | undefined;
  disabled?: boolean | undefined;
  error?: boolean | undefined;
}) {
  const { options, topN, ordered } = node.props;
  const selected = toArray(value);
  const rankOf = (k: string) => selected.indexOf(k); // -1 if not selected

  const toggle = (k: string) => {
    if (!onChange || disabled) return;
    const idx = selected.indexOf(k);
    if (idx >= 0) {
      onChange(selected.filter((x) => x !== k));
      return;
    }
    if (selected.length >= topN) return; // cap reached
    onChange([...selected, k]);
  };

  return (
    <div
      className="qnn-topn-list"
      style={{
        border: `1px solid ${error ? '#ff4d4f' : 'var(--qnn-hairline)'}`,
        borderRadius: 6,
        padding: 4,
      }}
    >
      <Typography.Paragraph
        type="secondary"
        style={{ margin: '4px 8px 8px', fontSize: 12 }}
      >
        Pick {topN} {ordered ? 'in order of preference' : 'from the list'} ({selected.length}/{topN} selected).
      </Typography.Paragraph>
      {options.map((opt) => {
        const rank = rankOf(opt.value);
        const isSelected = rank >= 0;
        const atCap = !isSelected && selected.length >= topN;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            disabled={!!disabled || atCap}
            aria-pressed={isSelected}
            style={{
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              marginBottom: 4,
              borderRadius: 4,
              border: `1px solid ${isSelected ? 'var(--qnn-accent)' : 'var(--qnn-hairline)'}`,
              background: isSelected ? 'var(--qnn-accent-weak)' : 'var(--qnn-surface)',
              color: atCap ? 'var(--qnn-ink-muted)' : 'inherit',
              cursor: disabled ? 'default' : atCap ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 28,
                height: 24,
                padding: '0 6px',
                borderRadius: 12,
                border: `1px solid ${isSelected ? 'var(--qnn-accent)' : 'var(--qnn-hairline)'}`,
                background: isSelected ? 'var(--qnn-accent)' : 'transparent',
                color: isSelected ? 'white' : 'var(--qnn-ink-muted)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {isSelected ? (ordered ? rank + 1 : '✓') : '+'}
            </span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default topnPlugin;
