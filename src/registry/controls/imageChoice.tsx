import { PictureOutlined, PlusOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Space, Switch } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export interface ImageChoiceOption {
  value: string;
  label: string;
  imageUrl: string;
}

export interface ImageChoiceProps {
  options: ImageChoiceOption[];
  /** If true, any number of tiles can be selected; otherwise one only. */
  allowMultiple: boolean;
  /** Grid columns. Defaults to 3. */
  cols?: number;
  /** Tile image height in px. Defaults to 120. */
  imageHeight?: number;
  /** Hide labels under each tile. */
  hideLabels?: boolean;
}

function toSelection(value: unknown, multi: boolean): string[] {
  if (multi) return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
  return typeof value === 'string' && value ? [value] : [];
}

const imageChoicePlugin: ControlPlugin<ImageChoiceProps> = {
  type: 'image-choice',
  category: 'input',
  group: 'basic',
  label: 'Image choice',
  icon: <PictureOutlined />,
  description: 'Pick one or more tiles from a grid of image options.',
  isAnswerable: true,

  defaultProps: () => ({
    allowMultiple: false,
    cols: 3,
    imageHeight: 120,
    options: [
      { value: 'a', label: 'Option A', imageUrl: '' },
      { value: 'b', label: 'Option B', imageUrl: '' },
      { value: 'c', label: 'Option C', imageUrl: '' },
    ],
  }),
  defaultNode: () => ({
    type: 'image-choice',
    friendlyName: 'Image choice',
    required: false,
    layout: { span: 12 },
    props: {
      allowMultiple: false,
      cols: 3,
      imageHeight: 120,
      options: [
        { value: 'a', label: 'Option A', imageUrl: '' },
        { value: 'b', label: 'Option B', imageUrl: '' },
        { value: 'c', label: 'Option C', imageUrl: '' },
      ],
    },
  }),

  CanvasPreview: ({ node }) => (
    <div>
      <QuestionText node={node} />
      <ImageChoiceGrid node={node} value={undefined} disabled />
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => {
    const setOpts = (options: ImageChoiceOption[]) => onChange({ props: { ...node.props, options } });
    return (
      <Form layout="vertical">
        {commonPropertyFields(node, onChange, otherAliases)}
        <Form.Item label="Allow multiple">
          <Switch
            checked={node.props.allowMultiple}
            onChange={(v) => onChange({ props: { ...node.props, allowMultiple: v } })}
          />
        </Form.Item>
        <Form.Item label="Grid columns (1–6)">
          <InputNumber
            min={1}
            max={6}
            value={node.props.cols ?? 3}
            onChange={(v) => onChange({ props: { ...node.props, cols: Math.max(1, Math.min(6, Number(v) || 3)) } })}
          />
        </Form.Item>
        <Form.Item label="Image height (px)">
          <InputNumber
            min={40}
            max={400}
            value={node.props.imageHeight ?? 120}
            onChange={(v) => onChange({ props: { ...node.props, imageHeight: Math.max(40, Math.min(400, Number(v) || 120)) } })}
          />
        </Form.Item>
        <Form.Item label="Hide labels">
          <Switch
            checked={!!node.props.hideLabels}
            onChange={(v) => onChange({ props: { ...node.props, hideLabels: v } })}
          />
        </Form.Item>
        <Form.Item label="Options">
          <Space direction="vertical" style={{ width: '100%' }}>
            {node.props.options.map((opt, i) => (
              <Space direction="vertical" key={i} style={{ width: '100%', padding: 8, border: '1px solid var(--qnn-hairline)', borderRadius: 4 }}>
                <Space.Compact style={{ width: '100%' }}>
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
                <Input
                  value={opt.imageUrl}
                  placeholder="Image URL (https://… or data:image/…)"
                  onChange={(e) => {
                    const next = [...node.props.options];
                    next[i] = { ...opt, imageUrl: e.target.value };
                    setOpts(next);
                  }}
                />
              </Space>
            ))}
            <Button
              icon={<PlusOutlined />}
              onClick={() => setOpts([
                ...node.props.options,
                {
                  value: `opt${node.props.options.length + 1}`,
                  label: `Option ${node.props.options.length + 1}`,
                  imageUrl: '',
                },
              ])}
            >Add option</Button>
          </Space>
        </Form.Item>
      </Form>
    );
  },

  Renderer: ({ node, value, onChange, disabled, error }) => (
    <ImageChoiceGrid
      node={node}
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={!!error}
    />
  ),

  isValueEmpty: (v) => {
    if (Array.isArray(v)) return v.length === 0;
    return typeof v !== 'string' || v === '';
  },
};

function ImageChoiceGrid({
  node,
  value,
  onChange,
  disabled,
  error,
}: {
  node: { props: ImageChoiceProps };
  value: unknown;
  onChange?: ((v: unknown) => void) | undefined;
  disabled?: boolean | undefined;
  error?: boolean | undefined;
}) {
  const { options, allowMultiple, hideLabels } = node.props;
  const cols = Math.max(1, Math.min(6, node.props.cols ?? 3));
  const height = Math.max(40, Math.min(400, node.props.imageHeight ?? 120));
  const selected = toSelection(value, allowMultiple);

  const toggle = (key: string) => {
    if (!onChange || disabled) return;
    if (allowMultiple) {
      const next = selected.includes(key)
        ? selected.filter((x) => x !== key)
        : [...selected, key];
      onChange(next);
    } else {
      onChange(selected[0] === key ? '' : key);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 8,
        border: error ? '1px solid #ff4d4f' : undefined,
        borderRadius: error ? 6 : undefined,
        padding: error ? 4 : undefined,
      }}
    >
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isSelected}
            aria-label={opt.label}
            disabled={!!disabled}
            onClick={() => toggle(opt.value)}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              padding: 4,
              border: `2px solid ${isSelected ? 'var(--qnn-accent)' : 'var(--qnn-hairline)'}`,
              borderRadius: 6,
              background: isSelected ? 'var(--qnn-accent-weak)' : 'var(--qnn-surface)',
              cursor: disabled ? 'default' : 'pointer',
              textAlign: 'center',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'inherit',
              transition: 'border-color 0.12s var(--qnn-ease), background 0.12s var(--qnn-ease)',
            }}
          >
            {isSelected && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'var(--qnn-accent)',
                  color: 'white',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  boxShadow: '0 0 0 2px white',
                }}
              >
                <CheckOutlined />
              </span>
            )}
            <div
              style={{
                width: '100%',
                height,
                borderRadius: 4,
                overflow: 'hidden',
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {opt.imageUrl ? (
                <img
                  src={opt.imageUrl}
                  alt=""
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <PictureOutlined style={{ fontSize: 28, color: '#bbb' }} />
              )}
            </div>
            {!hideLabels && (
              <div style={{ padding: '6px 4px 2px', fontWeight: 500 }}>{opt.label}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default imageChoicePlugin;
