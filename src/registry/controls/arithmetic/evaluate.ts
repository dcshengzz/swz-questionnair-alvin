import type { Expr } from '../../../schema/types';

/**
 * Evaluate an arithmetic sub-tree against a flat answer map.
 *
 * Accepts any `Expr` node but only supports `const`, `ref`, `+ - * /`.
 * Non-arithmetic Expr variants (comparisons, logicals, `in`, etc.) degrade
 * to 0 rather than throwing — this keeps runtime rendering robust against
 * hand-edited or imported JSON.
 *
 * Returns `null` (not NaN) when the final result is not a finite number so
 * callers have a single sentinel to branch on.
 */
export function evalArith(
  node: Expr | null,
  answers: Record<string, unknown>,
): number | null {
  if (!node) return null;
  const v = evalInner(node, answers);
  return Number.isFinite(v) ? v : null;
}

/**
 * Resolve a possibly-dotted alias against the answer map. Plain aliases
 * read the top level (`price`); dotted aliases walk into nested records
 * (`matrixAlias.rowKey.colKey`).
 */
function resolvePath(path: string, answers: Record<string, unknown>): unknown {
  if (!path.includes('.')) return answers[path];
  const segments = path.split('.');
  let cur: unknown = answers;
  for (const seg of segments) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function evalInner(node: Expr, answers: Record<string, unknown>): number {
  switch (node.op) {
    case 'const': {
      const n = Number(node.value);
      return Number.isFinite(n) ? n : 0;
    }
    case 'ref': {
      const raw = resolvePath(node.alias, answers);
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }
    case '+': return evalInner(node.args[0], answers) + evalInner(node.args[1], answers);
    case '-': return evalInner(node.args[0], answers) - evalInner(node.args[1], answers);
    case '*': return evalInner(node.args[0], answers) * evalInner(node.args[1], answers);
    case '/': {
      const rhs = evalInner(node.args[1], answers);
      if (rhs === 0) return NaN;
      return evalInner(node.args[0], answers) / rhs;
    }
    default:
      return 0;
  }
}
