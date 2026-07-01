import { QuestionnaireZ } from '../schema/zod';
import type { Questionnaire } from '../schema/types';
import { CURRENT_SCHEMA_VERSION } from '../schema/types';
import { migrateForward } from './migrations';

export type ImportResult =
  | { ok: true; value: Questionnaire }
  | { ok: false; error: string };

export function importQuestionnaire(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Expected a JSON object at the top level' };
  }
  const obj = raw as Record<string, unknown>;
  const version = obj.schemaVersion;
  if (typeof version !== 'number' || Number.isNaN(version)) {
    return { ok: false, error: 'Unrecognised schema version.' };
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    return { ok: false, error: 'This file was made with a newer version of QNN Designer.' };
  }
  if (version < 1) {
    return { ok: false, error: 'Unrecognised schema version.' };
  }
  let migrated: unknown;
  try {
    migrated = migrateForward(obj);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const parsed = QuestionnaireZ.safeParse(migrated);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join('.') || '<root>';
    return { ok: false, error: `${path}: ${issue?.message ?? 'validation failed'}` };
  }
  return { ok: true, value: parsed.data as Questionnaire };
}
