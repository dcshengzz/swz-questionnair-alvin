import { describe, it, expect } from 'vitest';
import { exportQuestionnaire } from '../../src/io/export';
import { makeEmptyQuestionnaire } from '../../src/schema/factories';
import type { Rule } from '../../src/schema/types';

describe('exportQuestionnaire', () => {
  it('with includeLogic=true returns verbatim clone', () => {
    const q = makeEmptyQuestionnaire();
    q.rules.push({ id: 'r1', when: { op: 'const', value: true }, then: [] });
    const out = exportQuestionnaire(q, { includeLogic: true });
    expect(out.rules).toHaveLength(1);
    expect(out).not.toBe(q);
  });

  it('with includeLogic=false strips rules and validation, keeps required', () => {
    const q = makeEmptyQuestionnaire();
    q.rules.push({ id: 'r1', when: { op: 'const', value: true }, then: [] });
    q.pages[0]!.rows[0]!.cols.push({
      id: 'c1', type: 'textbox', alias: 'a', friendlyName: 'A',
      required: true, layout: { span: 12 }, props: { mode: 'text' },
      validation: { minLen: 3, message: 'too short' },
    });
    const out = exportQuestionnaire(q, { includeLogic: false });
    expect(out.rules).toEqual([]);
    expect(out.pages[0]!.rows[0]!.cols[0]!.validation).toBeUndefined();
    expect(out.pages[0]!.rows[0]!.cols[0]!.required).toBe(true);
  });
});
