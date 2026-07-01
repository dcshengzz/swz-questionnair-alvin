import { describe, it, expect } from 'vitest';
import { findArithmeticCycles } from '../../../src/registry/controls/arithmetic/cycles';
import type { Expr, Questionnaire } from '../../../src/schema/types';

function makeQuestionnaire(
  controls: Array<{ alias: string; type: string; expression?: Expr | null }>,
): Questionnaire {
  return {
    schemaVersion: 1,
    id: 'q1',
    title: 't',
    theme: { accentColor: '#1677ff', fontFamily: 'sans', pageBackground: '#fff', contentMaxWidth: 800 },
    rules: [],
    meta: { createdAt: 'x', updatedAt: 'x', appVersion: '0' },
    pages: [{
      id: 'p1',
      name: 'page',
      rows: [{
        id: 'r1',
        cols: controls.map((c, i) => ({
          id: `c${i}`,
          type: c.type,
          alias: c.alias,
          friendlyName: c.alias,
          required: false,
          layout: { span: 12 },
          props: c.type === 'arithmetic' ? { expression: c.expression ?? null } : {},
        })),
      }],
    }],
  };
}

const ref = (alias: string): Expr => ({ op: 'ref', alias });
const add = (l: Expr, r: Expr): Expr => ({ op: '+', args: [l, r] });

describe('findArithmeticCycles', () => {
  it('returns empty when there are no arithmetic fields', () => {
    const q = makeQuestionnaire([{ alias: 'x', type: 'textbox' }]);
    expect(findArithmeticCycles(q)).toEqual(new Set());
  });

  it('returns empty when arithmetic fields reference only non-arithmetic aliases', () => {
    const q = makeQuestionnaire([
      { alias: 'price', type: 'textbox' },
      { alias: 'total', type: 'arithmetic', expression: ref('price') },
    ]);
    expect(findArithmeticCycles(q)).toEqual(new Set());
  });

  it('detects a self-loop', () => {
    const q = makeQuestionnaire([
      { alias: 'a', type: 'arithmetic', expression: ref('a') },
    ]);
    expect(findArithmeticCycles(q)).toEqual(new Set(['a']));
  });

  it('detects a two-node cycle', () => {
    const q = makeQuestionnaire([
      { alias: 'a', type: 'arithmetic', expression: ref('b') },
      { alias: 'b', type: 'arithmetic', expression: ref('a') },
    ]);
    expect(findArithmeticCycles(q)).toEqual(new Set(['a', 'b']));
  });

  it('detects a three-node cycle', () => {
    const q = makeQuestionnaire([
      { alias: 'a', type: 'arithmetic', expression: ref('b') },
      { alias: 'b', type: 'arithmetic', expression: ref('c') },
      { alias: 'c', type: 'arithmetic', expression: ref('a') },
    ]);
    expect(findArithmeticCycles(q)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('does not flag a non-cyclic arithmetic field even when another field is cyclic', () => {
    const q = makeQuestionnaire([
      { alias: 'a', type: 'arithmetic', expression: ref('b') },
      { alias: 'b', type: 'arithmetic', expression: ref('a') },
      { alias: 'clean', type: 'arithmetic', expression: ref('x') },
      { alias: 'x', type: 'textbox' },
    ]);
    const cycles = findArithmeticCycles(q);
    expect(cycles.has('a')).toBe(true);
    expect(cycles.has('b')).toBe(true);
    expect(cycles.has('clean')).toBe(false);
  });

  it('walks nested arithmetic sub-expressions when collecting refs', () => {
    const q = makeQuestionnaire([
      { alias: 'a', type: 'arithmetic', expression: add(ref('b'), ref('c')) },
      { alias: 'b', type: 'arithmetic', expression: ref('a') },
      { alias: 'c', type: 'textbox' },
    ]);
    const cycles = findArithmeticCycles(q);
    expect(cycles.has('a')).toBe(true);
    expect(cycles.has('b')).toBe(true);
  });

  it('walks refs embedded in non-arithmetic Expr variants (imported-JSON safety net)', () => {
    // Hand-edited JSON could wrap a `ref` in a non-arithmetic op. The detector
    // must still find it even though the builder can't emit this shape.
    const weird: Expr = { op: 'not', arg: { op: 'ref', alias: 'a' } };
    const q = makeQuestionnaire([
      { alias: 'a', type: 'arithmetic', expression: weird },
    ]);
    expect(findArithmeticCycles(q)).toEqual(new Set(['a']));
  });
});
