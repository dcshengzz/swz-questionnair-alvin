import type { Alias, Questionnaire } from '../schema/types';
import { importQuestionnaire } from './import';

export const DESIGNER_DRAFT_KEY = 'qnn.designer.draft.v1';
export const runtimeDraftKey = (questionnaireId: string) => `qnn.runtime.draft.${questionnaireId}.v1`;

export interface PersistenceResult {
  ok: boolean;
  quotaExceeded?: boolean;
}

function trySetItem(key: string, value: string): PersistenceResult {
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (e) {
    const isQuota =
      e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    return { ok: false, quotaExceeded: isQuota };
  }
}

export function saveDesignerDraft(q: Questionnaire): PersistenceResult {
  return trySetItem(DESIGNER_DRAFT_KEY, JSON.stringify(q));
}

export function loadDesignerDraft(): Questionnaire | null {
  const raw = localStorage.getItem(DESIGNER_DRAFT_KEY);
  if (raw == null) return null;
  const r = importQuestionnaire(raw);
  return r.ok ? r.value : null;
}

export function clearDesignerDraft(): void {
  localStorage.removeItem(DESIGNER_DRAFT_KEY);
}

export function saveRuntimeDraft(questionnaireId: string, answers: Record<Alias, unknown>): PersistenceResult {
  return trySetItem(runtimeDraftKey(questionnaireId), JSON.stringify(answers));
}

export function loadRuntimeDraft(questionnaireId: string): Record<Alias, unknown> | null {
  const raw = localStorage.getItem(runtimeDraftKey(questionnaireId));
  if (raw == null) return null;
  try { return JSON.parse(raw) as Record<Alias, unknown>; } catch { return null; }
}

export function clearRuntimeDraft(questionnaireId: string): void {
  localStorage.removeItem(runtimeDraftKey(questionnaireId));
}
