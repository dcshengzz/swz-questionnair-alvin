import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Dropdown, Input, Space, Tooltip, Typography } from 'antd';
import type { Expr } from '../../../schema/types';
import { formatFormula, parseFormula } from './formula';

export interface ArithmeticBuilderProps {
  expression: Expr | null;
  onChange: (next: Expr | null) => void;
  availableAliases: string[];
  /**
   * Aliases/paths that must not be referenced because doing so would create
   * a circular dependency with the field being edited.
   */
  forbiddenAliases?: string[];
}

const OP_BUTTONS: { label: string; insert: string; title: string }[] = [
  { label: '+', insert: ' + ', title: 'Add' },
  { label: '−', insert: ' - ', title: 'Subtract' },
  { label: '×', insert: ' * ', title: 'Multiply' },
  { label: '÷', insert: ' / ', title: 'Divide' },
  { label: '(', insert: '(', title: 'Open group' },
  { label: ')', insert: ')', title: 'Close group' },
];

/**
 * Spreadsheet-style formula bar: free-text expression with chip toolbar and
 * field-alias autocomplete dropdown. Parses on every change; the parent's
 * `onChange` is only called when the formula is valid (or empty).
 */
export function ArithmeticBuilder({
  expression,
  onChange,
  availableAliases,
  forbiddenAliases = [],
}: ArithmeticBuilderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Local text state; sync from external `expression` only when the parent
  // gives us a tree we didn't just emit ourselves.
  const [text, setText] = useState<string>(() => formatFormula(expression));
  const lastEmittedRef = useRef<string>(formatFormula(expression));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = formatFormula(expression);
    if (next !== lastEmittedRef.current) {
      setText(next);
      lastEmittedRef.current = next;
      setError(null);
    }
  }, [expression]);

  const commit = (raw: string) => {
    setText(raw);
    const { expr, error: err } = parseFormula(raw, availableAliases, forbiddenAliases);
    setError(err);
    if (!err) {
      lastEmittedRef.current = raw;
      onChange(expr);
    }
  };

  const insertAtCursor = (snippet: string) => {
    const el = inputRef.current;
    if (!el) { commit(text + snippet); return; }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + snippet + text.slice(end);
    commit(next);
    // Restore caret after React updates the input value.
    requestAnimationFrame(() => {
      const caret = start + snippet.length;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const forbiddenSet = useMemo(() => new Set(forbiddenAliases), [forbiddenAliases]);
  const selectable = availableAliases.filter((a) => !forbiddenSet.has(a));
  const fieldMenuItems = selectable.length === 0
    ? [{ key: '__none', label: 'No fields available', disabled: true }]
    : selectable.map((a) => ({ key: a, label: a }));

  return (
    <div className="qnn-arith-formula">
      <Space.Compact style={{ width: '100%' }}>
        <Input
          ref={(el) => { inputRef.current = el?.input ?? null; }}
          data-testid="arith-formula-input"
          value={text}
          placeholder="e.g. price * qty + tax"
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => commit(e.target.value)}
          {...(error && error !== 'Unexpected end of formula' ? { status: 'error' as const } : {})}
          style={{ fontFamily: 'monospace' }}
        />
        <Dropdown
          menu={{
            items: fieldMenuItems,
            onClick: ({ key }) => { if (key !== '__none') insertAtCursor(key); },
          }}
          trigger={['click']}
        >
          <Button data-testid="arith-insert-field">Insert field ▾</Button>
        </Dropdown>
      </Space.Compact>
      <Space size={4} wrap style={{ marginTop: 8 }}>
        {OP_BUTTONS.map((b) => (
          <Tooltip key={b.label} title={b.title}>
            <Button
              size="small"
              data-testid={`arith-op-${b.label}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertAtCursor(b.insert)}
              style={{ fontFamily: 'monospace', minWidth: 32 }}
            >
              {b.label}
            </Button>
          </Tooltip>
        ))}
        <Tooltip title="Clear formula">
          <Button
            size="small"
            danger
            data-testid="arith-clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => commit('')}
          >
            Clear
          </Button>
        </Tooltip>
      </Space>
      {(() => {
        // "Unexpected end of formula" is the parser's signal for a
        // mid-edit state (trailing operator, dangling open paren, etc.).
        // Treat it as informational — a red Alert would be noisy while
        // the user is still typing or just clicked an operator chip.
        const isIncomplete = error === 'Unexpected end of formula';
        if (error && !isIncomplete) {
          return (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 8 }}
              message={error}
              data-testid="arith-formula-error"
            />
          );
        }
        return (
          <Typography.Paragraph
            type="secondary"
            style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}
          >
            {isIncomplete
              ? 'Formula is incomplete — keep typing.'
              : <>Type field aliases (e.g. <code>price</code>) and operators, or use the toolbar.</>}
          </Typography.Paragraph>
        );
      })()}
    </div>
  );
}
