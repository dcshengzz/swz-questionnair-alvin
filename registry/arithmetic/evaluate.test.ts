import { describe, it, expect } from 'vitest';
import { evalArith } from '../../../src/registry/controls/arithmetic/evaluate';
import type { Expr } from '../../../src/schema/types';

describe('evalArith', () => {
  it('returns null for a null expression', () => {
    expect(evalArith(null, {})).toBeNull();
  });

  it('evaluates a constant', () => {
    const e: Expr = { op: 'const', value: 5 };
    expect(evalArith(e, {})).toBe(5);
  });

  it('coerces a string answer to a number on ref', () => {
    const e: Expr = { op: 'ref', alias: 'price' };
    expect(evalArith(e, { price: '12.5' })).toBe(12.5);
  });

  it('treats a missing ref as 0', () => {
    const e: Expr = { op: 'ref', alias: 'missing' };
    expect(evalArith(e, {})).toBe(0);
  });

  it('treats a non-numeric ref as 0', () => {
    const e: Expr = { op: 'ref', alias: 'name' };
    expect(evalArith(e, { name: 'alice' })).toBe(0);
  });

  it('adds two constants', () => {
    const e: Expr = { op: '+', args: [{ op: 'const', value: 1 }, { op: 'const', value: 2 }] };
    expect(evalArith(e, {})).toBe(3);
  });

  it('evaluates a nested tree with mixed ops and refs', () => {
    // (price + tax) * qty  ->  (10 + 2) * 3 = 36
    const e: Expr = {
      op: '*',
      args: [
        { op: '+', args: [{ op: 'ref', alias: 'price' }, { op: 'ref', alias: 'tax' }] },
        { op: 'ref', alias: 'qty' },
      ],
    };
    expect(evalArith(e, { price: 10, tax: 2, qty: 3 })).toBe(36);
  });

  it('returns null on division by zero', () => {
    const e: Expr = { op: '/', args: [{ op: 'const', value: 10 }, { op: 'const', value: 0 }] };
    expect(evalArith(e, {})).toBeNull();
  });

  it('returns null when any intermediate computation is non-finite', () => {
    const e: Expr = {
      op: '+',
      args: [
        { op: '/', args: [{ op: 'const', value: 1 }, { op: 'const', value: 0 }] },
        { op: 'const', value: 1 },
      ],
    };
    expect(evalArith(e, {})).toBeNull();
  });

  it('returns 0 for an Expr node whose op is not in the arithmetic subset', () => {
    const e: Expr = { op: 'eq', args: [{ op: 'const', value: 1 }, { op: 'const', value: 1 }] };
    expect(evalArith(e, {})).toBe(0);
  });
});
