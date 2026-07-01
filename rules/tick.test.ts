import { describe, it, expect } from 'vitest';
import { runTick } from '../../src/rules/tick';
import type { Rule } from '../../src/schema/types';

const rules: Rule[] = [
  {
    id: 'r1',
    when: { op: 'lt', args: [{ op: 'ref', alias: 'age' }, { op: 'const', value: 18 }] },
    then: [{ kind: 'hide', target: { alias: 'smoking' } }],
    else: [{ kind: 'show', target: { alias: 'smoking' } }],
  },
];

describe('runTick', () => {
  it('hides when `when` is true', () => {
    const eff = runTick(rules, { age: 16 }, new Set());
    expect(eff.visibility['smoking']).toBe(false);
  });

  it('shows when `when` is false via else', () => {
    const eff = runTick(rules, { age: 25 }, new Set());
    expect(eff.visibility['smoking']).toBe(true);
  });

  it('is single-pass — reads previous hidden set, not updated one', () => {
    const rulesB: Rule[] = [
      {
        id: 'A',
        when: { op: 'const', value: true },
        then: [{ kind: 'hide', target: { alias: 'x' } }],
      },
      {
        id: 'B',
        when: { op: 'notEmpty', arg: { op: 'ref', alias: 'x' } },
        then: [{ kind: 'show', target: { alias: 'y' } }],
      },
    ];
    const eff = runTick(rulesB, { x: 'hello' }, new Set());
    expect(eff.visibility['x']).toBe(false);
    expect(eff.visibility['y']).toBe(true);
  });

  it('empty rules returns empty effects', () => {
    const eff = runTick([], {}, new Set());
    expect(eff.visibility).toEqual({});
  });
});
