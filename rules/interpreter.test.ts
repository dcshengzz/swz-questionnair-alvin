import { describe, it, expect } from 'vitest';
import { evalExpr, type EvalContext } from '../../src/rules/interpreter';
import type { Expr } from '../../src/schema/types';

const ctx = (answers: Record<string, unknown>, hidden: string[] = []): EvalContext => ({
  answers,
  hidden: new Set(hidden),
});

describe('evalExpr', () => {
  it('const returns value', () => {
    expect(evalExpr({ op: 'const', value: 42 }, ctx({}))).toBe(42);
  });

  it('ref returns answer', () => {
    expect(evalExpr({ op: 'ref', alias: 'x' }, ctx({ x: 5 }))).toBe(5);
  });

  it('ref on hidden alias returns undefined', () => {
    expect(evalExpr({ op: 'ref', alias: 'x' }, ctx({ x: 5 }, ['x']))).toBeUndefined();
  });

  it('eq undefined vs anything is false (never throws)', () => {
    const e: Expr = { op: 'eq', args: [{ op: 'ref', alias: 'nope' }, { op: 'const', value: 1 }] };
    expect(evalExpr(e, ctx({}))).toBe(false);
  });

  it('and short-circuits on false', () => {
    const e: Expr = { op: 'and', args: [{ op: 'const', value: false }, { op: 'const', value: true }] };
    expect(evalExpr(e, ctx({}))).toBe(false);
  });

  it('or short-circuits on true', () => {
    const e: Expr = { op: 'or', args: [{ op: 'const', value: true }, { op: 'const', value: false }] };
    expect(evalExpr(e, ctx({}))).toBe(true);
  });

  it('not inverts truthy/falsy', () => {
    expect(evalExpr({ op: 'not', arg: { op: 'const', value: 1 } }, ctx({}))).toBe(false);
    expect(evalExpr({ op: 'not', arg: { op: 'const', value: 0 } }, ctx({}))).toBe(true);
  });

  it('comparisons on numbers', () => {
    const gt: Expr = { op: 'gt', args: [{ op: 'const', value: 3 }, { op: 'const', value: 2 }] };
    const lte: Expr = { op: 'lte', args: [{ op: 'const', value: 2 }, { op: 'const', value: 2 }] };
    expect(evalExpr(gt, ctx({}))).toBe(true);
    expect(evalExpr(lte, ctx({}))).toBe(true);
  });

  it('in matches array membership', () => {
    const e: Expr = {
      op: 'in',
      value: { op: 'const', value: 'b' },
      set: { op: 'const', value: ['a', 'b', 'c'] as unknown as string },
    };
    expect(evalExpr(e, ctx({}))).toBe(true);
  });

  it('in returns false when set is not array/string', () => {
    const e: Expr = {
      op: 'in',
      value: { op: 'const', value: 'b' },
      set: { op: 'const', value: 42 },
    };
    expect(evalExpr(e, ctx({}))).toBe(false);
  });

  it('matches regex', () => {
    const e: Expr = { op: 'matches', value: { op: 'const', value: 'abc' }, pattern: '^a' };
    expect(evalExpr(e, ctx({}))).toBe(true);
  });

  it('matches with invalid regex is false (never throws)', () => {
    const e: Expr = { op: 'matches', value: { op: 'const', value: 'abc' }, pattern: '[' };
    expect(evalExpr(e, ctx({}))).toBe(false);
  });

  it('empty: undefined/null/""/[]', () => {
    for (const v of [undefined, null, '', []]) {
      expect(evalExpr({ op: 'empty', arg: { op: 'const', value: v as never } }, ctx({}))).toBe(true);
    }
    expect(evalExpr({ op: 'empty', arg: { op: 'const', value: 0 } }, ctx({}))).toBe(false);
    expect(evalExpr({ op: 'empty', arg: { op: 'const', value: 'x' } }, ctx({}))).toBe(false);
  });

  it('arithmetic on non-numbers yields NaN, compared to anything is false', () => {
    const add: Expr = { op: '+', args: [{ op: 'const', value: 'a' }, { op: 'const', value: 1 }] };
    expect(Number.isNaN(evalExpr(add, ctx({})) as number)).toBe(true);
    const cmp: Expr = { op: 'gt', args: [add, { op: 'const', value: 0 }] };
    expect(evalExpr(cmp, ctx({}))).toBe(false);
  });

  it('realistic tree: age >= 18 AND country in [US, CA]', () => {
    const tree: Expr = {
      op: 'and',
      args: [
        { op: 'gte', args: [{ op: 'ref', alias: 'age' }, { op: 'const', value: 18 }] },
        {
          op: 'in',
          value: { op: 'ref', alias: 'country' },
          set: { op: 'const', value: ['US', 'CA'] as unknown as string },
        },
      ],
    };
    expect(evalExpr(tree, ctx({ age: 20, country: 'US' }))).toBe(true);
    expect(evalExpr(tree, ctx({ age: 17, country: 'US' }))).toBe(false);
    expect(evalExpr(tree, ctx({ age: 20, country: 'FR' }))).toBe(false);
  });
});
