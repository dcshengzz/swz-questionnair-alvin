import { CheckSquareOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, InputNumber, Space, Typography } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export interface MultiOption { value: string; label: string; }
export interface MultiProps {
  options: MultiOption[];
  minChecked?: number;
  maxChecked?: number;
  /** Pixel size of each checkbox square. Undefined = AntD default (16px). */
  size?: number;
}

const MIN_SIZE = 12;
const MAX_SIZE = 32;

function withChoiceSize(size: number | undefined, children: ReactNode) {
  if (size == null) return <>{children}</>;
  const style = { '--qnn-choice-size': `${size}px` } as CSSProperties;
  return <div className="qnn-choice-sized" style={style}>{children}</div>;
}

const multiPlugin: ControlPlugin<MultiProps> = {
  type: 'multi',
  category: 'input',
  group: 'basic',
  label: 'Multiple choice',
  icon: <CheckSquareOutlined />,
  description: 'Checkbox group — pick one or more.',
  isAnswerable: true,

  defaultProps: () => ({ options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }),
  defaultNode: () => ({
    type: 'multi',
    friendlyName: 'Choose any',
    required: false,
    layout: { span: 12 },
    props: { options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <QuestionText node={node} />
      {withChoiceSize(node.props.size, <Checkbox.Group disabled options={node.props.options} />)}
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => {
    const setOpts = (options: MultiOption[]) => onChange({ props: { ...node.props, options } });
    return (
      <Form layout="vertical">
        {commonPropertyFields(node, onChange, otherAliases)}
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
                <Button onClick={() => setOpts(node.props.options.filter((_, j) => j !== i))}>Remove</Button>
              </Space.Compact>
            ))}
            <Button
              icon={<PlusOutlined />}
              onClick={() => setOpts([...node.props.options, { value: `opt${node.props.options.length + 1}`, label: `Option ${node.props.options.length + 1}` }])}
            >Add option</Button>
          </Space>
        </Form.Item>
        <Form.Item label="Min checked">
          <InputNumber
            min={0}
            value={node.props.minChecked ?? null}
            onChange={(v) => {
              const { minChecked: _drop, ...rest } = node.props;
              onChange({ props: v == null ? rest : { ...rest, minChecked: Number(v) } });
            }}
          />
        </Form.Item>
        <Form.Item label="Max checked">
          <InputNumber
            min={0}
            value={node.props.maxChecked ?? null}
            onChange={(v) => {
              const { maxChecked: _drop, ...rest } = node.props;
              onChange({ props: v == null ? rest : { ...rest, maxChecked: Number(v) } });
            }}
          />
        </Form.Item>
        <Form.Item label={`Checkbox size (px, ${MIN_SIZE}–${MAX_SIZE})`}>
          <InputNumber
            min={MIN_SIZE}
            max={MAX_SIZE}
            value={node.props.size ?? null}
            placeholder="16"
            onChange={(v) => {
              const { size: _drop, ...rest } = node.props;
              onChange({ props: v == null ? rest : { ...rest, size: Number(v) } });
            }}
          />
        </Form.Item>
      </Form>
    );
  },

  Renderer: ({ node, value, onChange }) =>
    withChoiceSize(
      node.props.size,
      <Checkbox.Group
        value={(value as string[]) ?? []}
        options={node.props.options}
        onChange={(vals) => onChange(vals)}
      />,
    ),

  validate: (node, value) => {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    const { minChecked, maxChecked } = node.props;
    if (minChecked != null && arr.length < minChecked) return `${node.friendlyName}: select at least ${minChecked}.`;
    if (maxChecked != null && arr.length > maxChecked) return `${node.friendlyName}: select at most ${maxChecked}.`;
    return null;
  },
};

export default multiPlugin;
