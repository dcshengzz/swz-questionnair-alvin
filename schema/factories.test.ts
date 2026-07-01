import { describe, it, expect } from 'vitest';
import {
  makeEmptyQuestionnaire,
  makeEmptyPage,
  makeEmptyRow,
  DEFAULT_THEME,
} from '../../src/schema/factories';
import { QuestionnaireZ } from '../../src/schema/zod';

describe('factories', () => {
  it('makeEmptyQuestionnaire passes Zod', () => {
    const q = makeEmptyQuestionnaire();
    expect(QuestionnaireZ.safeParse(q).success).toBe(true);
    expect(q.pages).toHaveLength(1);
    expect(q.schemaVersion).toBe(1);
  });

  it('DEFAULT_THEME uses blue accent', () => {
    expect(DEFAULT_THEME.accentColor).toBe('#1677FF');
    expect(DEFAULT_THEME.contentMaxWidth).toBe(960);
  });

  it('makeEmptyPage and makeEmptyRow have unique ids each call', () => {
    const p1 = makeEmptyPage('A');
    const p2 = makeEmptyPage('A');
    expect(p1.id).not.toEqual(p2.id);
    const r1 = makeEmptyRow();
    const r2 = makeEmptyRow();
    expect(r1.id).not.toEqual(r2.id);
  });
});
