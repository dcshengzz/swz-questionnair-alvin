import { describe, it, expect } from 'vitest';
import { exportQuestionnaire } from '../../src/io/export';
import { importQuestionnaire } from '../../src/io/import';
import { makeEmptyQuestionnaire } from '../../src/schema/factories';

describe('export + import round-trip', () => {
  it('preserves every field modulo updatedAt', () => {
    const q = makeEmptyQuestionnaire('RT');
    q.pages[0]!.rows[0]!.cols.push({
      id: 'c1', type: 'textbox', alias: 'name', friendlyName: 'Name',
      required: true, layout: { span: 12 }, props: { mode: 'text' },
      validation: { minLen: 1 },
    });
    q.rules.push({
      id: 'r1',
      when: { op: 'eq', args: [{ op: 'ref', alias: 'name' }, { op: 'const', value: 'x' }] },
      then: [{ kind: 'hide', target: { alias: 'name' } }],
    });

    const exported = exportQuestionnaire(q, { includeLogic: true });
    const text = JSON.stringify(exported);
    const imported = importQuestionnaire(text);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const { meta: _meta1, ...a } = imported.value;
    const { meta: _meta2, ...b } = q;
    expect(a).toEqual(b);
  });
});
