import { AppstoreAddOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { CSSProperties } from 'react';
import { Button, Checkbox, Form, Input, InputNumber, Space } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';
import type { MatrixAxis } from './matrix';

export interface MatrixMultiProps {
  rows: MatrixAxis[];
  cols: MatrixAxis[];
  /** Pixel size of each checkbox square. Undefined = AntD default (16px). */
  size?: number;
}

type MatrixMultiValue = Record<string, string[]>;

const MIN_SIZE = 12;
const MAX_SIZE = 32;

const matrixMultiPlugin: ControlPlugin<MatrixMultiProps> = {
  type: 'matrix-multi',
  category: 'input',
  group: 'basic',
  label: 'Matrix multiple choice',
  icon: <AppstoreAddOutlined />,
  description: 'Grid where each row can pick one or more columns (checkbox-style).',
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
    type: 'matrix-multi',
    friendlyName: 'Matrix multi choice',
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
      <MatrixMultiGrid node={node} value={undefined} disabled />
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

  Renderer: ({ node, value, onChange, error, disabled }) => (
    <MatrixMultiGrid
      node={node}
      value={value}
      onChange={onChange}
      error={!!error}
      disabled={disabled}
    />
  ),

  isValueEmpty: (value) => {
    const v = value as MatrixMultiValue | undefined;
    if (!v) return true;
    return Object.values(v).every((arr) => !arr || arr.length === 0);
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

function MatrixMultiGrid({
  node,
  value,
  onChange,
  error,
  disabled,
}: {
  node: { props: MatrixMultiProps };
  value: unknown;
  onChange?: ((v: unknown) => void) | undefined;
  error?: boolean | undefined;
  disabled?: boolean | undefined;
}) {
  const { rows, cols, size } = node.props;
  const v = (value as MatrixMultiValue | undefined) ?? {};
  const sizedStyle: CSSProperties | undefined =
    size != null ? ({ '--qnn-choice-size': `${size}px` } as CSSProperties) : undefined;
  const wrapClass = size != null ? 'qnn-matrix-wrap qnn-choice-sized' : 'qnn-matrix-wrap';

  const toggle = (rowKey: string, colKey: string) => {
    const prev = v[rowKey] ?? [];
    const next = prev.includes(colKey)
      ? prev.filter((k) => k !== colKey)
      : [...prev, colKey];
    onChange?.({ ...v, [rowKey]: next });
  };

  return (
    <div
      className={wrapClass}
      style={{ overflowX: 'auto', maxWidth: '100%', ...(sizedStyle ?? {}) }}
    >
      <table
        className="qnn-matrix-table"
        style={{
          borderCollapse: 'collapse',
          width: 'max-content',
          minWidth: '100%',
          ...(error ? { outline: '1px solid #ff4d4f' } : {}),
        }}
      >
        <thead>
          <tr>
            <th style={{ padding: '4px 8px' }} />
            {cols.map((c) => (
              <th
                key={c.key}
                style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 500, whiteSpace: 'nowrap' }}
              >{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {r.label}
              </th>
              {cols.map((c) => (
                <td key={c.key} style={{ padding: 4, textAlign: 'center' }}>
                  <Checkbox
                    checked={(v[r.key] ?? []).includes(c.key)}
                    disabled={!!disabled}
                    onChange={() => toggle(r.key, c.key)}
                    aria-label={`${r.label}: ${c.label}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default matrixMultiPlugin;
