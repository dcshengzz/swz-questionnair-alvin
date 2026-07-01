import { StarOutlined } from '@ant-design/icons';
import { Form, InputNumber, Rate, Switch, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export interface RatingProps {
  count: number;
  allowHalf: boolean;
}

const ratingPlugin: ControlPlugin<RatingProps> = {
  type: 'rating',
  category: 'input',
  group: 'scales',
  label: 'Rating',
  icon: <StarOutlined />,
  description: 'Star rating scale (also covers Likert in v1).',
  isAnswerable: true,

  defaultProps: () => ({ count: 5, allowHalf: false }),
  defaultNode: () => ({
    type: 'rating',
    friendlyName: 'Rating',
    required: false,
    layout: { span: 6 },
    props: { count: 5, allowHalf: false },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <QuestionText node={node} />
      <div><Rate disabled count={node.props.count} allowHalf={node.props.allowHalf} /></div>
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => (
    <Form layout="vertical">
      {commonPropertyFields(node, onChange, otherAliases)}
      <Form.Item label="Count">
        <InputNumber
          min={1}
          max={10}
          value={node.props.count}
          onChange={(v) => onChange({ props: { ...node.props, count: Math.min(10, Math.max(1, Number(v) || 5)) } })}
        />
      </Form.Item>
      <Form.Item label="Allow half">
        <Switch
          checked={node.props.allowHalf}
          onChange={(v) => onChange({ props: { ...node.props, allowHalf: v } })}
        />
      </Form.Item>
    </Form>
  ),

  Renderer: ({ node, value, onChange }) => (
    <Rate
      value={typeof value === 'number' ? value : 0}
      count={node.props.count}
      allowHalf={node.props.allowHalf}
      onChange={(v) => onChange(v)}
    />
  ),

  isValueEmpty: (v) => v === undefined || v === null || v === 0,
};

export default ratingPlugin;
