import { DownSquareOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Space } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';
import type { MatrixAxis } from './matrix';

export interface MatrixDropdownProps {
  rows: MatrixAxis[];
  cols: MatrixAxis[];
}

type MatrixDropdownValue = Record<string, string>;

const matrixDropdownPlugin: ControlPlugin<MatrixDropdownProps> = {
  type: 'matrix-dropdown',
  category: 'input',
  group: 'basic',
  label: 'Matrix dropdown',
  icon: <DownSquareOutlined />,
  description: 'Grid where each row has a dropdown of column options.',
  isAnswerable: true,

  defaultProps: () => ({
    rows: [
      { key: 'q1', label: 'Question 1' },
      { key: 'q2', label: 'Question 2' },
    ],
    cols: [
      { key: 'a', label: 'Option A' },
      { key: 'b', label: 'Option B' },
      { key: 'c', label: 'Option C' },
    ],
  }),
  defaultNode: () => ({
    type: 'matrix-dropdown',
    friendlyName: 'Matrix dropdown',
    required: false,
    layout: { span: 12 },
    props: {
      rows: [
        { key: 'q1', label: 'Question 1' },
        { key: 'q2', label: 'Question 2' },
      ],
      cols: [
        { key: 'a', label: 'Option A' },
        { key: 'b', label: 'Option B' },
        { key: 'c', label: 'Option C' },
      ],
    },
  }),

  CanvasPreview: ({ node }) => (
    <div>
      <QuestionText node={node} />
      <MatrixDropdownGrid node={node} value={undefined} disabled />
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => {
    const setRows = (rows: MatrixAxis[]) => onChange({ props: { ...node.props, rows } });
    const setCols = (cols: MatrixAxis[]) => onChange({ props: { ...node.props, cols } });
    return (
      <Form layout="vertical">
        {commonPropertyFields(node, onChange, otherAliases)}
        <Form.Item label="Rows (questions)">
          <AxisEditor axis={node.props.rows} onChange={setRows} prefix="q" noun="Question" />
        </Form.Item>
        <Form.Item label="Columns (options)">
          <AxisEditor axis={node.props.cols} onChange={setCols} prefix="c" noun="Option" />
        </Form.Item>
      </Form>
    );
  },

  Renderer: ({ node, value, onChange, error, disabled }) => (
    <MatrixDropdownGrid
      node={node}
      value={value}
      onChange={onChange}
      error={!!error}
      disabled={disabled}
    />
  ),

  isValueEmpty: (value) => {
    const v = value as MatrixDropdownValue | undefined;
    if (!v) return true;
    return Object.values(v).every((x) => !x);
  },
};

function AxisEditor({
  axis,
  onChange,
  prefix,
  noun,
}: {
  axis: MatrixAxis[];
  onChange: (next: MatrixAxis[]) => void;
  prefix: string;
  noun: string;
}) {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {axis.map((item, i) => (
        <Space.Compact key={i} style={{ width: '100%' }}>
          <Input
            value={item.key}
            placeholder="key"
            onChange={(e) => {
              const next = [...axis];
              next[i] = { ...item, key: e.target.value };
              onChange(next);
            }}
          />
          <Input
            value={item.label}
            placeholder="label"
            onChange={(e) => {
              const next = [...axis];
              next[i] = { ...item, label: e.target.value };
              onChange(next);
            }}
          />
          <Button icon={<DeleteOutlined />} onClick={() => onChange(axis.filter((_, j) => j !== i))} />
        </Space.Compact>
      ))}
      <Button
        icon={<PlusOutlined />}
        onClick={() => onChange([...axis, { key: `${prefix}${axis.length + 1}`, label: `${noun} ${axis.length + 1}` }])}
      >Add</Button>
    </Space>
  );
}

function MatrixDropdownGrid({
  node,
  value,
  onChange,
  error,
  disabled,
}: {
  node: { props: MatrixDropdownProps };
  value: unknown;
  onChange?: ((v: unknown) => void) | undefined;
  error?: boolean | undefined;
  disabled?: boolean | undefined;
}) {
  const { rows, cols } = node.props;
  const v = (value as MatrixDropdownValue | undefined) ?? {};
  const options = cols.map((c) => ({ value: c.key, label: c.label }));
  return (
    <div className="qnn-matrix-wrap" style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <table
        className="qnn-matrix-table"
        style={{
          borderCollapse: 'collapse',
          width: 'max-content',
          minWidth: '100%',
          ...(error ? { outline: '1px solid #ff4d4f' } : {}),
        }}
      >
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th
                style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap' }}
              >{r.label}</th>
              <td style={{ padding: 4, minWidth: 220 }}>
                <Select
                  value={v[r.key] ? v[r.key] : null}
                  options={options}
                  disabled={!!disabled}
                  allowClear
                  style={{ width: '100%' }}
                  {...(error ? { status: 'error' as const } : {})}
                  onChange={(k: string | undefined) => {
                    const next = { ...v };
                    if (k) next[r.key] = k;
                    else delete next[r.key];
                    onChange?.(next);
                  }}
                  aria-label={`${r.label}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default matrixDropdownPlugin;
