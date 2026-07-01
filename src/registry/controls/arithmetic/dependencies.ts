import type { Expr, Questionnaire } from '../../../schema/types';

/**
 * Identifier used in the computed-field dependency graph.
 *  - A top-level arithmetic control is identified by its alias.
 *  - An arithmetic cell inside a matrix is identified by the dotted path
 *    `<matrixAlias>.<rowKey>.<colKey>`.
 */
export type ComputedId = string;

interface ComputedNode { id: ComputedId; refs: ComputedId[] }

/** Recursively collect every alias mentioned in a ref op of this sub-tree. */
function collectRefsAll(node: Expr | null): string[] {
  if (!node) return [];
  if (node.op === 'ref') return [node.alias];
  if (node.op === 'const') return [];
  const any = node as { args?: Expr[]; arg?: Expr };
  const out: string[] = [];
  if (any.args) for (const a of any.args) out.push(...collectRefsAll(a));
  if (any.arg) out.push(...collectRefsAll(any.arg));
  return out;
}

/**
 * Enumerate every computed field (top-level arithmetic + matrix arithmetic
 * cells) in the questionnaire along with the ids it references.
 */
export function computedNodes(q: Questionnaire): ComputedNode[] {
  const nodes: ComputedNode[] = [];
  for (const p of q.pages) {
    for (const r of p.rows) {
      for (const c of r.cols) {
        if (c.type === 'arithmetic') {
          const expr = (c.props as { expression?: Expr | null }).expression ?? null;
          nodes.push({ id: c.alias, refs: collectRefsAll(expr) });
        } else if (c.type === 'matrix') {
          const overrides = (c.props as {
            cellOverrides?: Record<
              string,
              Record<string, { kind: string; expression?: Expr | null }>
            >;
          }).cellOverrides ?? {};
          for (const [rk, row] of Object.entries(overrides)) {
            for (const [ck, ov] of Object.entries(row)) {
              if (ov.kind !== 'arithmetic') continue;
              nodes.push({
                id: `${c.alias}.${rk}.${ck}`,
                refs: collectRefsAll(ov.expression ?? null),
              });
            }
          }
        }
      }
    }
  }
  return nodes;
}

/**
 * Given a `selfId` that is about to be edited, return the set of ids that
 * must not appear in its formula to avoid creating a cycle. The result is:
 *   - `selfId` itself (direct self-reference)
 *   - every computed id whose own formula (transitively) already reaches
 *     `selfId` — referencing such an id would close the loop.
 *
 * Ids are matched as full strings: a plain alias `foo` or a dotted cell path
 * `matrix.r.c`. Callers should compare against the exact alias the user
 * typed in the formula.
 */
export function computeForbiddenRefs(q: Questionnaire, selfId: ComputedId): Set<ComputedId> {
  const nodes = computedNodes(q);
  // Build reverse graph: for every computed node N with refs R, add edges
  // r -> N for r in R. Reverse-reachable set from selfId = nodes that
  // (transitively) depend on selfId and would form a cycle if selfId
  // depended on them back.
  const reverse = new Map<ComputedId, Set<ComputedId>>();
  for (const n of nodes) {
    for (const r of n.refs) {
      let preds = reverse.get(r);
      if (!preds) { preds = new Set(); reverse.set(r, preds); }
      preds.add(n.id);
    }
  }
  const forbidden = new Set<ComputedId>([selfId]);
  const stack: ComputedId[] = [selfId];
  while (stack.length) {
    const cur = stack.pop()!;
    const preds = reverse.get(cur);
    if (!preds) continue;
    for (const p of preds) {
      if (!forbidden.has(p)) { forbidden.add(p); stack.push(p); }
    }
  }
  return forbidden;
}
