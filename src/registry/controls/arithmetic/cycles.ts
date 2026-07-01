import type { Expr, Questionnaire } from '../../../schema/types';

/**
 * Return the set of arithmetic-field aliases that participate in a
 * dependency cycle. Non-arithmetic fields never appear in the result even
 * if they appear on a cyclic path (they can't create cycles because their
 * "outgoing" edges are empty by definition).
 */
export function findArithmeticCycles(q: Questionnaire): Set<string> {
  const graph = new Map<string, string[]>();
  for (const p of q.pages) {
    for (const r of p.rows) {
      for (const c of r.cols) {
        if (c.type !== 'arithmetic') continue;
        const expr = (c.props as { expression?: Expr | null }).expression ?? null;
        graph.set(c.alias, collectRefs(expr));
      }
    }
  }

  const arithAliases = new Set(graph.keys());
  for (const [alias, refs] of graph) {
    graph.set(alias, refs.filter((r) => arithAliases.has(r)));
  }

  const GREY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const cyclic = new Set<string>();

  for (const start of graph.keys()) {
    if (color.get(start)) continue;
    const stack: string[] = [start];
    const path: string[] = [];
    const childIter = new Map<string, Iterator<string>>();

    while (stack.length) {
      const node = stack[stack.length - 1]!;
      if (!childIter.has(node)) {
        color.set(node, GREY);
        path.push(node);
        childIter.set(node, (graph.get(node) ?? [])[Symbol.iterator]());
      }
      const next = childIter.get(node)!.next();
      if (next.done) {
        color.set(node, BLACK);
        path.pop();
        stack.pop();
        continue;
      }
      const child = next.value;
      if (color.get(child) === GREY) {
        const startIdx = path.indexOf(child);
        for (let i = startIdx; i < path.length; i++) cyclic.add(path[i]!);
        continue;
      }
      if (color.get(child) === BLACK) continue;
      stack.push(child);
    }
  }

  return cyclic;
}

function collectRefs(node: Expr | null): string[] {
  if (!node) return [];
  if (node.op === 'ref') return [node.alias];
  if (node.op === 'const') return [];
  const out: string[] = [];
  // Collect any Expr children, regardless of which key holds them.
  // The arithmetic builder only ever emits `+ - * /` nodes (which use
  // `args`), but imported or hand-edited JSON could embed other Expr
  // variants that carry children under `arg`, `value`, or `set` —
  // treat those the same way so cycle detection stays defensive.
  const anyNode = node as {
    args?: Expr[];
    arg?: Expr;
    value?: unknown;
    set?: unknown;
  };
  if (anyNode.args) for (const a of anyNode.args) out.push(...collectRefs(a));
  if (anyNode.arg) out.push(...collectRefs(anyNode.arg));
  if (anyNode.value && typeof anyNode.value === 'object') {
    out.push(...collectRefs(anyNode.value as Expr));
  }
  if (anyNode.set && typeof anyNode.set === 'object') {
    out.push(...collectRefs(anyNode.set as Expr));
  }
  return out;
}
