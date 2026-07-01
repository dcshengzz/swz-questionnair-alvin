import { CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Radio, Select, Space, Typography } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export interface SingleOption { value: string; label: string; }
export interface SingleProps {
  renderAs: 'radio' | 'dropdown';
  options: SingleOption[];
  /** Pixel size of each radio circle. Undefined = AntD default (16px). */
  size?: number;
}

const MIN_SIZE = 12;
const MAX_SIZE = 32;

function withChoiceSize(size: number | undefined, children: ReactNode) {
  if (size == null) return <>{children}</>;
  const style = { '--qnn-choice-size': `${size}px` } as CSSProperties;
  return <div className="qnn-choice-sized" style={style}>{children}</div>;
}

const singlePlugin: ControlPlugin<SingleProps> = {
  type: 'single',
  category: 'input',
  group: 'basic',
  label: 'Single choice',
  icon: <CheckCircleOutlined />,
  description: 'Radio group or dropdown — pick one.',
  isAnswerable: true,

  defaultProps: () => ({ renderAs: 'radio', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] }),
  defaultNode: () => ({
    type: 'single',
    friendlyName: 'Choose one',
    required: false,
    layout: { span: 12 },
    props: { renderAs: 'radio', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <QuestionText node={node} />
      {node.props.renderAs === 'dropdown'
        ? <Select disabled options={node.props.options} style={{ width: '100%' }} />
        : withChoiceSize(node.props.size, <Radio.Group disabled options={node.props.options} />)}
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => {
    const setOpts = (options: SingleOption[]) => onChange({ props: { ...node.props, options } });
    return (
      <Form layout="vertical">
        {commonPropertyFields(node, onChange, otherAliases)}
        <Form.Item label="Render as">
          <Radio.Group
            value={node.props.renderAs}
            onChange={(e) => onChange({ props: { ...node.props, renderAs: e.target.value } })}
          >
            <Radio value="radio">Radio group</Radio>
            <Radio value="dropdown">Dropdown</Radio>
          </Radio.Group>
        </Form.Item>
        {node.props.renderAs === 'radio' && (
          <Form.Item label={`Radio size (px, ${MIN_SIZE}–${MAX_SIZE})`}>
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
        )}
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
      </Form>
    );
  },

  Renderer: ({ node, value, onChange, error }) => {
    if (node.props.renderAs === 'dropdown') {
      return (
        <Select
          value={(value as string) ?? undefined}
          options={node.props.options}
          {...(error ? { status: 'error' as const } : {})}
          onChange={(v) => onChange(v)}
          style={{ width: '100%' }}
          allowClear
        />
      );
    }
    return withChoiceSize(
      node.props.size,
      <Radio.Group
        value={(value as string) ?? undefined}
        options={node.props.options}
        onChange={(e) => onChange(e.target.value)}
      />,
    );
  },
};

export default singlePlugin;
