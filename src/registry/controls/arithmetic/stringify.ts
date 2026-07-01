import type { Expr } from '../../../schema/types';

const GLYPH: Record<string, string> = { '+': '+', '-': '-', '*': '×', '/': '÷' };

/** Human-readable fully-parenthesized rendering. `null` → em-dash. */
export function stringifyArith(node: Expr | null): string {
  if (!node) return '—';
  if (node.op === 'const') return String(node.value);
  if (node.op === 'ref') return node.alias || '?';
  if (node.op === '+' || node.op === '-' || node.op === '*' || node.op === '/') {
    const lhs = stringifyArith(node.args[0]);
    const rhs = stringifyArith(node.args[1]);
    return `(${lhs} ${GLYPH[node.op]} ${rhs})`;
  }
  return '?';
}
