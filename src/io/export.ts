import type { Questionnaire } from '../schema/types';

export interface ExportOptions {
  includeLogic: boolean;
}

export function exportQuestionnaire(q: Questionnaire, opts: ExportOptions): Questionnaire {
  const clone: Questionnaire = JSON.parse(JSON.stringify(q));
  if (!opts.includeLogic) {
    clone.rules = [];
    for (const page of clone.pages) {
      for (const row of page.rows) {
        for (const col of row.cols) {
          delete (col as { validation?: unknown }).validation;
        }
      }
    }
  }
  return clone;
}
