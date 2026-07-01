import { CalendarOutlined } from '@ant-design/icons';
import { DatePicker, Form, Input, Radio, TimePicker, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';

export interface DatetimeProps {
  mode: 'date' | 'time' | 'datetime';
  format: string;
}

function defaultFormat(mode: DatetimeProps['mode']): string {
  switch (mode) {
    case 'date': return 'DD-MM-YYYY';
    case 'time': return 'HH:mm';
    case 'datetime': return 'DD-MM-YYYY HH:mm';
  }
}

const datetimePlugin: ControlPlugin<DatetimeProps> = {
  type: 'datetime',
  category: 'input',
  group: 'basic',
  label: 'Date / Time',
  icon: <CalendarOutlined />,
  description: 'Date, time, or date+time picker with configurable format.',
  isAnswerable: true,

  defaultProps: () => ({ mode: 'date', format: 'DD-MM-YYYY' }),
  defaultNode: () => ({
    type: 'datetime',
    friendlyName: 'Date',
    required: false,
    layout: { span: 6 },
    props: { mode: 'date', format: 'DD-MM-YYYY' },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <QuestionText node={node} />
      {node.props.mode === 'time'
        ? <TimePicker disabled format={node.props.format} style={{ width: '100%' }} />
        : <DatePicker disabled showTime={node.props.mode === 'datetime'} format={node.props.format} style={{ width: '100%' }} />}
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => (
    <Form layout="vertical">
      {commonPropertyFields(node, onChange, otherAliases)}
      <Form.Item label="Mode">
        <Radio.Group
          value={node.props.mode}
          onChange={(e) => {
            const mode = e.target.value as DatetimeProps['mode'];
            onChange({ props: { mode, format: defaultFormat(mode) } });
          }}
        >
          <Radio value="date">Date</Radio>
          <Radio value="time">Time</Radio>
          <Radio value="datetime">Date + Time</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item label="Format" help="dayjs format tokens e.g. DD-MM-YYYY, MMM D, YYYY, HH:mm">
        <Input value={node.props.format} onChange={(e) => onChange({ props: { ...node.props, format: e.target.value } })} />
      </Form.Item>
    </Form>
  ),

  Renderer: ({ node, value, onChange, error }) => {
    const parsed = value ? dayjs(value as string) : null;
    if (node.props.mode === 'time') {
      return (
        <TimePicker
          value={parsed?.isValid() ? parsed : null}
          format={node.props.format}
          {...(error ? { status: 'error' as const } : {})}
          onChange={(d) => onChange(d ? d.toISOString() : undefined)}
          style={{ width: '100%' }}
        />
      );
    }
    return (
      <DatePicker
        value={parsed?.isValid() ? parsed : null}
        showTime={node.props.mode === 'datetime'}
        format={node.props.format}
        {...(error ? { status: 'error' as const } : {})}
        onChange={(d: Dayjs | null) => onChange(d ? d.toISOString() : undefined)}
        style={{ width: '100%' }}
      />
    );
  },
};

export default datetimePlugin;
