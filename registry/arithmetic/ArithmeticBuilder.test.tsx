import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArithmeticBuilder } from '../../../src/registry/controls/arithmetic/ArithmeticBuilder';
import type { Expr } from '../../../src/schema/types';

function setup(initial: Expr | null = null) {
  let value: Expr | null = initial;
  const onChange = (next: Expr | null) => { value = next; };
  const utils = render(
    <ArithmeticBuilder expression={value} onChange={onChange} availableAliases={['price', 'qty']} />,
  );
  return { ...utils, get: () => value };
}

describe('ArithmeticBuilder', () => {
  it('shows a "Start" affordance when expression is null', () => {
    setup(null);
    expect(screen.getByTestId('arith-start')).toBeInTheDocument();
  });

  it('clicking Start seeds a const-0 root', () => {
    const { get, rerender } = setup(null);
    fireEvent.click(screen.getByTestId('arith-start'));
    expect(get()).toEqual({ op: 'const', value: 0 });

    rerender(
      <ArithmeticBuilder expression={get()} onChange={() => {}} availableAliases={['price', 'qty']} />,
    );
    expect(screen.getByTestId('arith-node-kind')).toHaveValue('const');
  });

  it('converting a const node to ref replaces the value shape', () => {
    const { get, rerender } = setup({ op: 'const', value: 5 });
    fireEvent.change(screen.getByTestId('arith-node-kind'), { target: { value: 'ref' } });
    expect(get()).toEqual({ op: 'ref', alias: '' });

    rerender(
      <ArithmeticBuilder expression={get()} onChange={() => {}} availableAliases={['price', 'qty']} />,
    );
    expect(screen.getByTestId('arith-node-alias')).toBeInTheDocument();
  });

  it('wrap-in-group replaces the node with a binary op whose LHS is the original', () => {
    const { get } = setup({ op: 'ref', alias: 'price' });
    fireEvent.change(screen.getByTestId('arith-wrap-op'), { target: { value: '+' } });
    expect(get()).toEqual({
      op: '+',
      args: [{ op: 'ref', alias: 'price' }, { op: 'const', value: 0 }],
    });
  });

  it('unwrap on a binary op replaces the node with its LHS child', () => {
    const { get } = setup({
      op: '*',
      args: [{ op: 'ref', alias: 'price' }, { op: 'ref', alias: 'qty' }],
    });
    fireEvent.click(screen.getByTestId('arith-unwrap'));
    expect(get()).toEqual({ op: 'ref', alias: 'price' });
  });

  it('changing the operator on a binary op preserves both children', () => {
    const { get } = setup({
      op: '+',
      args: [{ op: 'ref', alias: 'price' }, { op: 'const', value: 2 }],
    });
    fireEvent.change(screen.getByTestId('arith-group-op'), { target: { value: '*' } });
    expect(get()).toEqual({
      op: '*',
      args: [{ op: 'ref', alias: 'price' }, { op: 'const', value: 2 }],
    });
  });

  it('deleting a non-root node replaces it with a const-0 placeholder', () => {
    const { get } = setup({
      op: '+',
      args: [{ op: 'ref', alias: 'price' }, { op: 'ref', alias: 'qty' }],
    });
    fireEvent.click(screen.getByTestId('arith-delete-1'));
    expect(get()).toEqual({
      op: '+',
      args: [{ op: 'ref', alias: 'price' }, { op: 'const', value: 0 }],
    });
  });
});
