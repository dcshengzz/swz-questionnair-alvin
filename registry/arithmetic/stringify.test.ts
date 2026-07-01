import { describe, it, expect } from 'vitest';
import { stringifyArith } from '../../../src/registry/controls/arithmetic/stringify';
import type { Expr } from '../../../src/schema/types';

describe('stringifyArith', () => {
  it('returns an em-dash for null', () => {
    expect(stringifyArith(null)).toBe('—');
  });

  it('renders a constant', () => {
    expect(stringifyArith({ op: 'const', value: 7 })).toBe('7');
  });

  it('renders a ref as its alias', () => {
    expect(stringifyArith({ op: 'ref', alias: 'price' })).toBe('price');
  });

  it('renders binary ops with spaces and parentheses', () => {
    const e: Expr = { op: '+', args: [{ op: 'ref', alias: 'a' }, { op: 'const', value: 1 }] };
    expect(stringifyArith(e)).toBe('(a + 1)');
  });

  it('uses × for multiply and ÷ for divide', () => {
    const mul: Expr = { op: '*', args: [{ op: 'ref', alias: 'a' }, { op: 'ref', alias: 'b' }] };
    const div: Expr = { op: '/', args: [{ op: 'ref', alias: 'a' }, { op: 'ref', alias: 'b' }] };
    expect(stringifyArith(mul)).toBe('(a × b)');
    expect(stringifyArith(div)).toBe('(a ÷ b)');
  });

  it('renders a nested tree with nested parentheses', () => {
    const e: Expr = {
      op: '*',
      args: [
        { op: '+', args: [{ op: 'ref', alias: 'price' }, { op: 'ref', alias: 'tax' }] },
        { op: 'ref', alias: 'qty' },
      ],
    };
    expect(stringifyArith(e)).toBe('((price + tax) × qty)');
  });
});
