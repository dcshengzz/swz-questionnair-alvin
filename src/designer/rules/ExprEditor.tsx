import { Button, Select, Space } from 'antd';
import type { Expr } from '../../schema/types';

const COMP_OPS: Expr['op'][] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn', 'matches', 'empty', 'notEmpty'];
const OP_LABEL: Record<string, string> = {
  eq: 'is', neq: 'is not', gt: '>', gte: '>=', lt: '<', lte: '<=',
  in: 'is one of', notIn: 'is not one of', matches: 'matches regex', empty: 'is empty', notEmpty: 'is not empty',
};

function ExprAtom({ value, onChange, aliases }: { value: Expr; onChange: (e: Expr) => void; aliases: string[] }) {
  // minimal v1 editor: "ref alias | const value" operand.
  if (value.op === 'ref') {
    return (
      <Select
        virtual={false}
        style={{ minWidth: 140 }}
        value={value.alias || null}
        placeholder="field"
        options={aliases.map((a) => ({ value: a, label: a }))}
        onChange={(v: string) => onChange({ op: 'ref', alias: v })}
      />
    );
  }
  if (value.op === 'const') {
    return (
      <input
        value={String(value.value ?? '')}
        onChange={(e) => onChange({ op: 'const', value: e.target.value })}
        style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 6, minWidth: 120 }}
      />
    );
  }
  return <span>(expr)</span>;
}

export function ExprEditor({ value, onChange, aliases }: { value: Expr; onChange: (e: Expr) => void; aliases: string[] }) {
  // v1: top-level is AND/OR of condition rows; each condition row is (ref alias) (op) (const value).
  if (value.op !== 'and' && value.op !== 'or') {
    // Wrap single condition as AND
    onChange({ op: 'and', args: [value] });
    return null;
  }
  const rows = value.args;
  const updateRow = (i: number, next: Expr) => onChange({ ...value, args: rows.map((r, j) => (j === i ? next : r)) });
  const removeRow = (i: number) => onChange({ ...value, args: rows.filter((_, j) => j !== i) });
  const addRow = () => onChange({ ...value, args: [...rows, defaultCondition(aliases)] });

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {rows.length >= 1 && (
        <Space>
          <span>Match</span>
          <Select
            virtual={false}
            value={value.op}
            options={[{ value: 'and', label: 'ALL' }, { value: 'or', label: 'ANY' }]}
            onChange={(op) => onChange({ ...value, op })}
            style={{ width: 100 }}
          />
          <span>of:</span>
        </Space>
      )}
      {rows.map((r, i) => (
        <ConditionRow
          key={i}
          value={r}
          onChange={(e) => updateRow(i, e)}
          onRemove={() => removeRow(i)}
          aliases={aliases}
        />
      ))}
      <Button onClick={addRow}>+ Add condition</Button>
    </Space>
  );
}

function defaultCondition(_aliases: string[]): Expr {
  return {
    op: 'eq',
    args: [
      { op: 'ref', alias: '' },
      { op: 'const', value: '' },
    ],
  };
}

function ConditionRow({ value, onChange, onRemove, aliases }: { value: Expr; onChange: (e: Expr) => void; onRemove: () => void; aliases: string[] }) {
  const isUnary = value.op === 'empty' || value.op === 'notEmpty';
  const lhs = isUnary ? (value as { arg: Expr }).arg : (value as { args: [Expr, Expr] }).args[0];
  const rhs = isUnary ? null : (value as { args: [Expr, Expr] }).args[1];
  return (
    <Space.Compact block>
      <ExprAtom value={lhs} onChange={(e) => onChange(isUnary ? { op: value.op as 'empty' | 'notEmpty', arg: e } : { op: value.op as 'eq', args: [e, rhs!] })} aliases={aliases} />
      <Select
        virtual={false}
        style={{ width: 150 }}
        value={value.op}
        options={COMP_OPS.map((o) => ({ value: o, label: OP_LABEL[o] ?? o }))}
        onChange={(op) => {
          if (op === 'empty' || op === 'notEmpty') onChange({ op, arg: lhs });
          else onChange({ op: op as 'eq', args: [lhs, rhs ?? { op: 'const', value: '' }] });
        }}
      />
      {!isUnary && rhs && (
        <ExprAtom value={rhs} onChange={(e) => onChange({ op: value.op as 'eq', args: [lhs, e] })} aliases={aliases} />
      )}
      <Button onClick={onRemove}>×</Button>
    </Space.Compact>
  );
}
