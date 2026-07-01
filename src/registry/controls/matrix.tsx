import { useEffect, useMemo, useRef } from 'react';
import { TableOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Divider, Form, Input, InputNumber, Radio, Select, Space, Tag, Typography } from 'antd';
import type { Expr } from '../../schema/types';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';
import { ArithmeticBuilder } from './arithmetic/ArithmeticBuilder';
import { evalArith } from './arithmetic/evaluate';
import { computeForbiddenRefs } from './arithmetic/dependencies';
import { setMatrixCellSelection, useMatrixCellSelection } from './matrix-selection';

export interface MatrixAxis { key: string; label: string; }

export type MatrixCellOverride =
  | { kind: 'disabled' }
  | { kind: 'arithmetic'; expression: Expr | null; decimals?: number };

export interface MatrixProps {
  rows: MatrixAxis[];
  cols: MatrixAxis[];
  cellMaxLen?: number;
  /** Per-cell overrides keyed as overrides[rowKey][colKey]. */
  cellOverrides?: Record<string, Record<string, MatrixCellOverride>>;
}

type MatrixValue = Record<string, Record<string, string | number | null>>;

function getOverride(props: MatrixProps, rowKey: string, colKey: string): MatrixCellOverride | undefined {
  return props.cellOverrides?.[rowKey]?.[colKey];
}

function setOverride(
  props: MatrixProps,
  rowKey: string,
  colKey: string,
  next: MatrixCellOverride | undefined,
): MatrixProps {
  const all = { ...(props.cellOverrides ?? {}) };
  const row = { ...(all[rowKey] ?? {}) };
  if (next === undefined) {
    delete row[colKey];
  } else {
    row[colKey] = next;
  }
  if (Object.keys(row).length === 0) {
    delete all[rowKey];
  } else {
    all[rowKey] = row;
  }
  if (Object.keys(all).length === 0) {
    const { cellOverrides: _drop, ...rest } = props;
    return rest;
  }
  return { ...props, cellOverrides: all };
}

function getCell(value: unknown, rowKey: string, colKey: string): string {
  const v = value as MatrixValue | undefined;
  const cell = v?.[rowKey]?.[colKey];
  return cell == null ? '' : String(cell);
}

function setCell(value: unknown, rowKey: string, colKey: string, cell: string | number | null): MatrixValue {
  const prev = (value as MatrixValue | undefined) ?? {};
  const row = { ...(prev[rowKey] ?? {}), [colKey]: cell };
  return { ...prev, [rowKey]: row };
}

function formatComputed(n: number | null, decimals: number | undefined): string {
  if (n == null) return '—';
  if (decimals == null) return String(n);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(n);
}

const matrixPlugin: ControlPlugin<MatrixProps> = {
  type: 'matrix',
  category: 'input',
  group: 'basic',
  label: 'Matrix text input',
  icon: <TableOutlined />,
  description: 'Grid of text inputs with labeled rows and columns. Cells can be disabled or computed.',
  isAnswerable: true,

  defaultProps: () => ({
    rows: [
      { key: 'r1', label: 'Row 1' },
      { key: 'r2', label: 'Row 2' },
    ],
    cols: [
      { key: 'c1', label: 'Column 1' },
      { key: 'c2', label: 'Column 2' },
    ],
  }),
  defaultNode: () => ({
    type: 'matrix',
    friendlyName: 'Matrix',
    required: false,
    layout: { span: 12 },
    props: {
      rows: [
        { key: 'r1', label: 'Row 1' },
        { key: 'r2', label: 'Row 2' },
      ],
      cols: [
        { key: 'c1', label: 'Column 1' },
        { key: 'c2', label: 'Column 2' },
      ],
    },
  }),

  CanvasPreview: ({ node }) => (
    <div>
      <QuestionText node={node} />
      <MatrixGrid node={node} value={undefined} mode="canvas" />
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases, questionnaire }) => {
    const setRows = (rows: MatrixAxis[]) => onChange({ props: { ...node.props, rows } });
    const setCols = (cols: MatrixAxis[]) => onChange({ props: { ...node.props, cols } });
    const selected = useMatrixCellSelection(node.id);
    const overridesRef = useRef<HTMLDivElement>(null);

    // When a cell is picked (either via canvas click or the dropdowns),
    // jump the Properties pane to the Cell overrides section so the user
    // sees the relevant editor without having to scroll.
    useEffect(() => {
      if (!selected) return;
      overridesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [selected?.rowKey, selected?.colKey]);

    const allOptions = useMemo(() => {
      // Field aliases for arithmetic include peer fields, this matrix's
      // own alias (so dotted paths validate against a known head), and
      // dotted cell paths from this matrix itself.
      const cellPaths = node.props.rows.flatMap((r) =>
        node.props.cols.map((c) => `${node.alias}.${r.key}.${c.key}`),
      );
      return [...otherAliases, node.alias, ...cellPaths];
    }, [otherAliases, node.alias, node.props.rows, node.props.cols]);

    const updateOverride = (next: MatrixCellOverride | undefined) => {
      if (!selected) return;
      onChange({ props: setOverride(node.props, selected.rowKey, selected.colKey, next) });
    };

    // Auto-clear selection if the selected cell's row/column was renamed or removed.
    useEffect(() => {
      if (!selected) return;
      const rowOk = node.props.rows.some((r) => r.key === selected.rowKey);
      const colOk = node.props.cols.some((c) => c.key === selected.colKey);
      if (!rowOk || !colOk) setMatrixCellSelection(node.id, null);
    }, [selected, node.id, node.props.rows, node.props.cols]);

    const selfCellPath = selected ? `${node.alias}.${selected.rowKey}.${selected.colKey}` : null;
    const forbidden = useMemo(
      () => (selfCellPath ? Array.from(computeForbiddenRefs(questionnaire, selfCellPath)) : []),
      [questionnaire, selfCellPath],
    );

    const currentOverride = selected ? getOverride(node.props, selected.rowKey, selected.colKey) : undefined;
    const currentKind: 'input' | 'disabled' | 'arithmetic' = currentOverride?.kind ?? 'input';

    return (
      <Form layout="vertical">
        {commonPropertyFields(node, onChange, otherAliases)}
        <Form.Item label="Max length per cell">
          <InputNumber
            min={0}
            value={node.props.cellMaxLen ?? null}
            onChange={(v) => {
              const { cellMaxLen: _drop, ...rest } = node.props;
              onChange({ props: v == null ? rest : { ...rest, cellMaxLen: Number(v) } });
            }}
          />
        </Form.Item>
        <Form.Item label="Rows">
          <AxisEditor axis={node.props.rows} onChange={setRows} prefix="r" />
        </Form.Item>
        <Form.Item label="Columns">
          <AxisEditor axis={node.props.cols} onChange={setCols} prefix="c" />
        </Form.Item>

        <div ref={overridesRef}>
          <Divider orientation="left" plain>Cell overrides</Divider>
        </div>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
          Click any cell on the canvas, or pick row + column below, to disable it or turn it into an arithmetic cell.
        </Typography.Paragraph>
        <Space size={8} wrap style={{ marginBottom: 12 }}>
          <Select
            size="small"
            style={{ minWidth: 140 }}
            value={selected?.rowKey ?? null}
            placeholder="Row"
            onChange={(rowKey) => {
              const colKey = selected?.colKey ?? node.props.cols[0]?.key;
              if (rowKey && colKey) setMatrixCellSelection(node.id, { rowKey, colKey });
            }}
            options={node.props.rows.map((r) => ({ value: r.key, label: r.label }))}
          />
          <Select
            size="small"
            style={{ minWidth: 140 }}
            value={selected?.colKey ?? null}
            placeholder="Column"
            onChange={(colKey) => {
              const rowKey = selected?.rowKey ?? node.props.rows[0]?.key;
              if (rowKey && colKey) setMatrixCellSelection(node.id, { rowKey, colKey });
            }}
            options={node.props.cols.map((c) => ({ value: c.key, label: c.label }))}
          />
          {selected && (
            <Button size="small" onClick={() => setMatrixCellSelection(node.id, null)}>Clear</Button>
          )}
        </Space>

        {selected ? (
          <>
            <Form.Item label="Cell type">
              <Radio.Group
                value={currentKind}
                onChange={(e) => {
                  const kind = e.target.value as 'input' | 'disabled' | 'arithmetic';
                  if (kind === 'input') updateOverride(undefined);
                  else if (kind === 'disabled') updateOverride({ kind: 'disabled' });
                  else updateOverride({ kind: 'arithmetic', expression: null });
                }}
              >
                <Radio.Button value="input">Text input</Radio.Button>
                <Radio.Button value="disabled">Disabled</Radio.Button>
                <Radio.Button value="arithmetic">Arithmetic</Radio.Button>
              </Radio.Group>
            </Form.Item>
            {currentOverride?.kind === 'arithmetic' && (
              <>
                <Form.Item label="Formula">
                  <ArithmeticBuilder
                    expression={currentOverride.expression}
                    onChange={(expression) =>
                      updateOverride({ kind: 'arithmetic', expression, ...(currentOverride.decimals != null ? { decimals: currentOverride.decimals } : {}) })
                    }
                    availableAliases={allOptions}
                    forbiddenAliases={forbidden}
                  />
                </Form.Item>
                <Form.Item label="Decimals (0–6)">
                  <InputNumber
                    min={0}
                    max={6}
                    value={currentOverride.decimals ?? null}
                    placeholder="raw"
                    onChange={(v) => {
                      const n = v == null ? null : Number(v);
                      updateOverride({
                        kind: 'arithmetic',
                        expression: currentOverride.expression,
                        ...(Number.isFinite(n) && n != null ? { decimals: n } : {}),
                      });
                    }}
                  />
                </Form.Item>
              </>
            )}
          </>
        ) : (
          <Tag color="default">No cell selected</Tag>
        )}
      </Form>
    );
  },

  Renderer: ({ node, value, onChange, error, disabled, answers }) => (
    <MatrixGrid
      node={node}
      value={value}
      onChange={onChange}
      error={!!error}
      disabled={disabled}
      mode="runtime"
      answers={answers}
    />
  ),

  validate: (node, value) => {
    const v = (value as MatrixValue | undefined) ?? {};
    const max = node.props.cellMaxLen;
    if (max == null) return null;
    for (const row of node.props.rows) {
      for (const col of node.props.cols) {
        const override = getOverride(node.props, row.key, col.key);
        if (override) continue; // disabled/arithmetic cells skip text-length validation
        const cell = v[row.key]?.[col.key];
        const s = typeof cell === 'string' ? cell : '';
        if (s.length > max) {
          return `${node.friendlyName}: "${row.label} / ${col.label}" exceeds ${max} characters.`;
        }
      }
    }
    return null;
  },

  isValueEmpty: (value) => {
    const v = value as MatrixValue | undefined;
    if (!v) return true;
    for (const rowKey of Object.keys(v)) {
      const row = v[rowKey] ?? {};
      for (const colKey of Object.keys(row)) {
        const c = row[colKey];
        if (c != null && c !== '') return false;
      }
    }
    return true;
  },
};

function AxisEditor({ axis, onChange, prefix }: { axis: MatrixAxis[]; onChange: (next: MatrixAxis[]) => void; prefix: string }) {
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
        onClick={() => onChange([...axis, { key: `${prefix}${axis.length + 1}`, label: `${prefix === 'r' ? 'Row' : 'Column'} ${axis.length + 1}` }])}
      >Add</Button>
    </Space>
  );
}

interface MatrixGridProps {
  node: { id: string; alias?: string; props: MatrixProps; placeholder?: string | undefined };
  value: unknown;
  onChange?: ((v: unknown) => void) | undefined;
  error?: boolean | undefined;
  disabled?: boolean | undefined;
  mode: 'canvas' | 'runtime';
  answers?: Record<string, unknown> | undefined;
}

function MatrixGrid({
  node,
  value,
  onChange,
  error,
  disabled,
  mode,
  answers,
}: MatrixGridProps) {
  const { rows, cols } = node.props;
  const selection = useMatrixCellSelection(node.id);

  // Build the answers map seen by arithmetic cells in this matrix.
  // Includes:
  //   - global answers (peer fields)
  //   - this matrix's own value at its alias, so dotted refs like
  //     `<alias>.r1.c1` resolve to sibling cells in the same matrix
  const arithAnswers = useMemo<Record<string, unknown>>(() => {
    if (mode !== 'runtime') return {};
    const base: Record<string, unknown> = { ...(answers ?? {}) };
    if (node.alias) base[node.alias] = value ?? {};
    return base;
  }, [answers, value, node.alias, mode]);

  // At runtime, materialize arithmetic cell results into the matrix value
  // so external refs and exports see them. We only write when the result
  // changes to avoid render loops.
  useEffect(() => {
    if (mode !== 'runtime' || !onChange) return;
    let next: MatrixValue | null = null;
    const v = (value as MatrixValue | undefined) ?? {};
    for (const r of rows) {
      for (const c of cols) {
        const override = getOverride(node.props, r.key, c.key);
        if (override?.kind !== 'arithmetic') continue;
        const computed = evalArith(override.expression, arithAnswers);
        const existing = v[r.key]?.[c.key];
        if (existing !== computed) {
          next = setCell(next ?? v, r.key, c.key, computed);
        }
      }
    }
    if (next) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arithAnswers, mode, rows, cols, node.props.cellOverrides]);

  return (
    <div className="qnn-matrix-wrap" style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <table className="qnn-matrix-table" style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 8px' }} />
            {cols.map((c) => (
              <th
                key={c.key}
                style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap', minWidth: 160 }}
              >{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.label}</th>
              {cols.map((c) => {
                const override = getOverride(node.props, r.key, c.key);
                const isSelected = mode === 'canvas'
                  && selection?.rowKey === r.key
                  && selection?.colKey === c.key;
                const cellStyle = {
                  padding: 4,
                  ...(isSelected ? { outline: '2px solid #1677ff', outlineOffset: -2 } : {}),
                  ...(mode === 'canvas' ? { cursor: 'pointer' } : {}),
                } as const;
                const onCellClick = mode === 'canvas'
                  ? () => setMatrixCellSelection(node.id, { rowKey: r.key, colKey: c.key })
                  : undefined;

                if (override?.kind === 'disabled') {
                  return (
                    <td
                      key={c.key}
                      style={{
                        ...cellStyle,
                        background: mode === 'canvas' ? 'repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 6px, #fafafa 6px, #fafafa 12px)' : undefined,
                      }}
                      {...(onCellClick ? { onClick: onCellClick } : {})}
                      data-testid={`matrix-cell-${r.key}-${c.key}`}
                    >
                      {mode === 'canvas' ? <Typography.Text type="secondary" style={{ fontSize: 11 }}>disabled</Typography.Text> : null}
                    </td>
                  );
                }

                if (override?.kind === 'arithmetic') {
                  if (mode === 'canvas') {
                    return (
                      <td
                        key={c.key}
                        style={{ ...cellStyle, background: '#f0f7ff' }}
                        {...(onCellClick ? { onClick: onCellClick } : {})}
                        data-testid={`matrix-cell-${r.key}-${c.key}`}
                      >
                        <Tag color="blue" style={{ fontSize: 11 }}>ƒ arithmetic</Tag>
                      </td>
                    );
                  }
                  const computed = evalArith(override.expression, arithAnswers);
                  return (
                    <td key={c.key} style={cellStyle} data-testid={`matrix-cell-${r.key}-${c.key}`}>
                      <div className="qnn-arith-value" style={{ padding: '4px 8px' }}>
                        {formatComputed(computed, override.decimals)}
                      </div>
                    </td>
                  );
                }

                // Plain text input cell.
                if (mode === 'canvas') {
                  return (
                    <td
                      key={c.key}
                      style={cellStyle}
                      {...(onCellClick ? { onClick: onCellClick } : {})}
                      data-testid={`matrix-cell-${r.key}-${c.key}`}
                    >
                      {/* `pointer-events: none` on the disabled Input lets
                          the td capture the click so the cell can be
                          selected in the property editor. */}
                      <div style={{ pointerEvents: 'none' }}>
                        <Input disabled placeholder={node.placeholder} />
                      </div>
                    </td>
                  );
                }
                return (
                  <td key={c.key} style={cellStyle} data-testid={`matrix-cell-${r.key}-${c.key}`}>
                    <Input
                      value={getCell(value, r.key, c.key)}
                      {...(disabled ? { disabled: true } : {})}
                      {...(node.placeholder ? { placeholder: node.placeholder } : {})}
                      {...(error ? { status: 'error' as const } : {})}
                      onChange={(e) => onChange?.(setCell(value, r.key, c.key, e.target.value))}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default matrixPlugin;
