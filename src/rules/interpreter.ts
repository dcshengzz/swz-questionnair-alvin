import type { Expr, Alias } from '../schema/types';

export interface EvalContext {
  answers: Record<Alias, unknown>;
  hidden: Set<Alias>;
}

const regexCache = new Map<string, RegExp | null>();
function getRegex(pattern: string): RegExp | null {
  if (regexCache.has(pattern)) return regexCache.get(pattern)!;
  try {
    const re = new RegExp(pattern);
    regexCache.set(pattern, re);
    return re;
  } catch {
    regexCache.set(pattern, null);
    return null;
  }
}

export function defaultIsEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

export function evalExpr(expr: Expr, ctx: EvalContext): unknown {
  switch (expr.op) {
    case 'const':
      return expr.value;
    case 'ref':
      if (ctx.hidden.has(expr.alias)) return undefined;
      return ctx.answers[expr.alias];
    case 'and': {
      for (const a of expr.args) if (!evalExpr(a, ctx)) return false;
      return true;
    }
    case 'or': {
      for (const a of expr.args) if (evalExpr(a, ctx)) return true;
      return false;
    }
    case 'not':
      return !evalExpr(expr.arg, ctx);
    case 'eq':
    case 'neq':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const [la, ra] = expr.args as [Expr, Expr];
      const l = evalExpr(la, ctx);
      const r = evalExpr(ra, ctx);
      if (l === undefined || r === undefined) return false;
      if (typeof l === 'number' && Number.isNaN(l)) return false;
      if (typeof r === 'number' && Number.isNaN(r)) return false;
      switch (expr.op) {
        case 'eq': return l === r;
        case 'neq': return l !== r;
        case 'gt': return (l as number) > (r as number);
        case 'gte': return (l as number) >= (r as number);
        case 'lt': return (l as number) < (r as number);
        case 'lte': return (l as number) <= (r as number);
      }
      return false;
    }
    case 'in':
    case 'notIn': {
      const v = evalExpr(expr.value, ctx);
      const s = evalExpr(expr.set, ctx);
      let hit = false;
      if (Array.isArray(s)) hit = s.includes(v);
      else if (typeof s === 'string' && typeof v === 'string') hit = s.includes(v);
      else return false;
      return expr.op === 'in' ? hit : !hit;
    }
    case 'matches': {
      const v = evalExpr(expr.value, ctx);
      if (typeof v !== 'string') return false;
      const re = getRegex(expr.pattern);
      if (!re) return false;
      return re.test(v);
    }
    case 'empty': {
      const v = evalExpr(expr.arg, ctx);
      return defaultIsEmpty(v);
    }
    case 'notEmpty': {
      const v = evalExpr(expr.arg, ctx);
      return !defaultIsEmpty(v);
    }
    case '+':
    case '-':
    case '*':
    case '/': {
      const [la, ra] = expr.args as [Expr, Expr];
      const l = Number(evalExpr(la, ctx));
      const r = Number(evalExpr(ra, ctx));
      if (Number.isNaN(l) || Number.isNaN(r)) return NaN;
      switch (expr.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r === 0 ? NaN : l / r;
      }
      return NaN;
    }
  }
}
