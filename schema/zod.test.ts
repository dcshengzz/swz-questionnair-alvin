import { describe, it, expect } from 'vitest';
import { QuestionnaireZ } from '../../src/schema/zod';

const validDoc = {
  schemaVersion: 1,
  id: '11111111-1111-4111-8111-111111111111',
  title: 'T',
  theme: {
    accentColor: '#1677FF',
    fontFamily: 'system-ui',
    pageBackground: '#FFFFFF',
    contentMaxWidth: 960,
  },
  pages: [
    {
      id: 'p1',
      name: 'Page 1',
      rows: [
        {
          id: 'r1',
          cols: [
            {
              id: 'c1',
              type: 'textbox',
              alias: 'name',
              friendlyName: 'Name',
              required: true,
              layout: { span: 12 },
              props: { mode: 'text' },
            },
          ],
        },
      ],
    },
  ],
  rules: [],
  meta: { createdAt: '2026-04-18T00:00:00Z', updatedAt: '2026-04-18T00:00:00Z', appVersion: '0.1.0' },
};

describe('QuestionnaireZ', () => {
  it('accepts a minimal valid document', () => {
    const r = QuestionnaireZ.safeParse(validDoc);
    expect(r.success).toBe(true);
  });

  it('rejects bad alias', () => {
    const bad = structuredClone(validDoc);
    bad.pages[0]!.rows[0]!.cols[0]!.alias = '9notAllowed';
    const r = QuestionnaireZ.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('rejects span > 12', () => {
    const bad = structuredClone(validDoc);
    bad.pages[0]!.rows[0]!.cols[0]!.layout.span = 13;
    const r = QuestionnaireZ.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('rejects row with column span sum > 12', () => {
    const bad = structuredClone(validDoc);
    bad.pages[0]!.rows[0]!.cols = [
      { ...bad.pages[0]!.rows[0]!.cols[0]!, id: 'a', alias: 'a', layout: { span: 7 } },
      { ...bad.pages[0]!.rows[0]!.cols[0]!, id: 'b', alias: 'b', layout: { span: 7 } },
    ];
    const r = QuestionnaireZ.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('rejects duplicate aliases across pages', () => {
    const bad = structuredClone(validDoc);
    bad.pages.push(structuredClone(bad.pages[0]!));
    bad.pages[1]!.id = 'p2';
    bad.pages[1]!.rows[0]!.id = 'r2';
    bad.pages[1]!.rows[0]!.cols[0]!.id = 'c2';
    const r = QuestionnaireZ.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('rejects unknown top-level keys (strict)', () => {
    const bad = { ...validDoc, extra: 1 };
    const r = QuestionnaireZ.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('rejects schemaVersion != 1', () => {
    const bad = { ...validDoc, schemaVersion: 2 };
    const r = QuestionnaireZ.safeParse(bad);
    expect(r.success).toBe(false);
  });
});
