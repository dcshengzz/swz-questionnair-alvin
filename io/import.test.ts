import { describe, it, expect } from 'vitest';
import { importQuestionnaire } from '../../src/io/import';
import { exportQuestionnaire } from '../../src/io/export';
import { makeEmptyQuestionnaire } from '../../src/schema/factories';

describe('importQuestionnaire', () => {
  it('imports a valid doc', () => {
    const q = makeEmptyQuestionnaire();
    const text = JSON.stringify(exportQuestionnaire(q, { includeLogic: true }));
    const r = importQuestionnaire(text);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.id).toBe(q.id);
  });

  it('rejects malformed JSON', () => {
    const r = importQuestionnaire('{not json');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toContain('json');
  });

  it('rejects future schemaVersion', () => {
    const q = makeEmptyQuestionnaire();
    const bad = { ...q, schemaVersion: 99 };
    const r = importQuestionnaire(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toMatch(/newer version/);
  });

  it('rejects schemaVersion < 1 (unrecognised)', () => {
    const q = makeEmptyQuestionnaire();
    const bad = { ...q, schemaVersion: 0 };
    const r = importQuestionnaire(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toMatch(/unrecognised|unrecognized/);
  });

  it('reports Zod path on validation failure', () => {
    const q = makeEmptyQuestionnaire();
    q.pages[0]!.rows[0]!.cols.push({
      id: 'c', type: 'textbox', alias: '9bad', friendlyName: 'x',
      required: false, layout: { span: 12 }, props: {},
    });
    const r = importQuestionnaire(JSON.stringify(q));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/alias/);
  });
});
