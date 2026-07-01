import { AppstoreOutlined, PlusOutlined } from '@ant-design/icons';
import type { CSSProperties } from 'react';
import { Button, Form, Input, InputNumber, Radio, Space, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';
import type { MatrixAxis } from './matrix';

export interface MatrixSingleProps {
  rows: MatrixAxis[];
  cols: MatrixAxis[];
  /** Pixel size of each radio circle. Undefined = AntD default (16px). */
  size?: number;
}

const MIN_SIZE = 12;
const MAX_SIZE = 32;

type MatrixSingleValue = Record<string, string>;

const matrixSinglePlugin: ControlPlugin<MatrixSingleProps> = {
  type: 'matrix-single',
  category: 'input',
  group: 'basic',
  label: 'Matrix single choice',
  icon: <AppstoreOutlined />,
  description: 'Grid where each row picks one column (Likert-style).',
  isAnswerable: true,

  defaultProps: () => ({
    rows: [
      { key: 'q1', label: 'Question 1' },
      { key: 'q2', label: 'Question 2' },
    ],
    cols: [
      { key: 'agree', label: 'Agree' },
      { key: 'neutral', label: 'Neutral' },
      { key: 'disagree', label: 'Disagree' },
    ],
  }),
  defaultNode: () => ({
    type: 'matrix-single',
    friendlyName: 'Matrix choice',
    required: false,
    layout: { span: 12 },
    props: {
      rows: [
        { key: 'q1', label: 'Question 1' },
        { key: 'q2', label: 'Question 2' },
      ],
      cols: [
        { key: 'agree', label: 'Agree' },
        { key: 'neutral', label: 'Neutral' },
        { key: 'disagree', label: 'Disagree' },
      ],
    },
  }),

  CanvasPreview: ({ node }) => (
    // No outer `pointer-events: none` — that would block the overflow
    // scroller inside MatrixSingleGrid from being draggable. The radios
    // are made non-interactive via `disabled` instead.
    <div>
      <QuestionText node={node} />
      <MatrixSingleGrid node={node} value={undefined} disabled />
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
        <Form.Item label="Columns (choices)">
          <AxisEditor axis={node.props.cols} onChange={setCols} prefix="c" noun="Choice" />
        </Form.Item>
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
      </Form>
    );
  },

  Renderer: ({ node, value, onChange, error, disabled }) => (
    <MatrixSingleGrid
      node={node}
      value={value}
      onChange={onChange}
      error={!!error}
      disabled={disabled}
    />
  ),

  validate: (node, value, ctx) => {
    if (!ctx.required) return null;
    const v = (value as MatrixSingleValue | undefined) ?? {};
    const missing = node.props.rows.filter((r) => !v[r.key]);
    if (missing.length > 0) {
      return `${node.friendlyName}: please answer "${missing[0]!.label}".`;
    }
    return null;
  },

  isValueEmpty: (value) => {
    const v = value as MatrixSingleValue | undefined;
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
          <Button onClick={() => onChange(axis.filter((_, j) => j !== i))}>Remove</Button>
        </Space.Compact>
      ))}
      <Button
        icon={<PlusOutlined />}
        onClick={() => onChange([...axis, { key: `${prefix}${axis.length + 1}`, label: `${noun} ${axis.length + 1}` }])}
      >Add</Button>
    </Space>
  );
}

function MatrixSingleGrid({
  node,
  value,
  onChange,
  error,
  disabled,
}: {
  node: { props: MatrixSingleProps };
  value: unknown;
  onChange?: ((v: unknown) => void) | undefined;
  error?: boolean | undefined;
  disabled?: boolean | undefined;
}) {
  const { rows, cols, size } = node.props;
  const v = (value as MatrixSingleValue | undefined) ?? {};
  const sizedWrapStyle: CSSProperties | undefined =
    size != null ? ({ '--qnn-choice-size': `${size}px` } as CSSProperties) : undefined;
  const wrapClass = size != null ? 'qnn-matrix-wrap qnn-choice-sized' : 'qnn-matrix-wrap';
  return (
    <div
      className={wrapClass}
      style={{ overflowX: 'auto', maxWidth: '100%', ...(sizedWrapStyle ?? {}) }}
    >
      <table
        className="qnn-matrix-table"
        style={{
          borderCollapse: 'collapse',
          // `max-content` lets the table overflow its wrapper when columns
          // add up to more than the pane width; `minWidth: 100%` keeps it
          // flush when there's slack.
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
              <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.label}</th>
              {cols.map((c) => (
                <td key={c.key} style={{ padding: 4, textAlign: 'center' }}>
                  <Radio
                    checked={v[r.key] === c.key}
                    disabled={!!disabled}
                    onChange={() => onChange?.({ ...v, [r.key]: c.key })}
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

export default matrixSinglePlugin;
