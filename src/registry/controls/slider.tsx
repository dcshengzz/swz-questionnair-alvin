import { SlidersOutlined } from '@ant-design/icons';
import { Form, InputNumber, Slider, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export interface SliderProps {
  min: number;
  max: number;
  step: number;
  marks?: Record<number, string>;
}

const sliderPlugin: ControlPlugin<SliderProps> = {
  type: 'slider',
  category: 'input',
  group: 'scales',
  label: 'Slider',
  icon: <SlidersOutlined />,
  description: 'Numeric range slider.',
  isAnswerable: true,

  defaultProps: () => ({ min: 0, max: 100, step: 1 }),
  defaultNode: () => ({
    type: 'slider',
    friendlyName: 'Slider',
    required: false,
    layout: { span: 12 },
    props: { min: 0, max: 100, step: 1 },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <QuestionText node={node} />
      <Slider disabled min={node.props.min} max={node.props.max} step={node.props.step} />
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => (
    <Form layout="vertical">
      {commonPropertyFields(node, onChange, otherAliases)}
      <Form.Item label="Min"><InputNumber value={node.props.min} onChange={(v) => onChange({ props: { ...node.props, min: Number(v) || 0 } })} /></Form.Item>
      <Form.Item label="Max"><InputNumber value={node.props.max} onChange={(v) => onChange({ props: { ...node.props, max: Number(v) || 100 } })} /></Form.Item>
      <Form.Item label="Step"><InputNumber min={0.0001} value={node.props.step} onChange={(v) => onChange({ props: { ...node.props, step: Number(v) || 1 } })} /></Form.Item>
    </Form>
  ),

  Renderer: ({ node, value, onChange }) => (
    <Slider
      value={typeof value === 'number' ? value : node.props.min}
      min={node.props.min}
      max={node.props.max}
      step={node.props.step}
      marks={node.props.marks}
      onChange={(v) => onChange(v)}
    />
  ),

  isValueEmpty: (v) => v === undefined || v === null,
};

export default sliderPlugin;
