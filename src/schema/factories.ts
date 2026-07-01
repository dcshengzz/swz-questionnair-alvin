import { newId } from '../util/ids';
import type {
  Page,
  Questionnaire,
  Row,
  ThemeSettings,
} from './types';

export const DEFAULT_THEME: ThemeSettings = {
  accentColor: '#1677FF',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  pageBackground: '#FFFFFF',
  contentMaxWidth: 960,
};

export function makeEmptyRow(): Row {
  return { id: newId(), cols: [] };
}

export function makeEmptyPage(name = 'Untitled page'): Page {
  return { id: newId(), name, rows: [makeEmptyRow()] };
}

export function makeEmptyQuestionnaire(title = 'Untitled questionnaire'): Questionnaire {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: newId(),
    title,
    theme: { ...DEFAULT_THEME },
    pages: [makeEmptyPage('Page 1')],
    rules: [],
    meta: { createdAt: now, updatedAt: now, appVersion: '0.1.0' },
  };
}
