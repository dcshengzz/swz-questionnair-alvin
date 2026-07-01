/**
 * Answer piping: replace `{{alias}}` placeholders in a template string with
 * the respondent's live answers. Supports dotted paths so values nested in
 * matrix-style records resolve too, e.g. `{{matrixAlias.rowKey.colKey}}`.
 *
 * Missing or nullish values become the empty string. Object values are
 * stringified shallowly via JSON to keep piping predictable — scalar
 * answers (strings, numbers) flow through unchanged.
 */
const TOKEN_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\}\}/g;

function resolvePath(path: string, answers: Record<string, unknown>): unknown {
  if (!path.includes('.')) return answers[path];
  const segments = path.split('.');
  let cur: unknown = answers;
  for (const seg of segments) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function stringifyAnswer(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(stringifyAnswer).filter(Boolean).join(', ');
  try { return JSON.stringify(v); } catch { return ''; }
}

/**
 * Apply piping to `template`. If `answers` is undefined or `template`
 * contains no tokens, returns the input unchanged.
 */
export function pipeAnswers(template: string, answers?: Record<string, unknown>): string {
  if (!template || !answers) return template ?? '';
  if (!template.includes('{{')) return template;
  return template.replace(TOKEN_RE, (_m, path: string) => stringifyAnswer(resolvePath(path, answers)));
}

/**
 * True when a template contains at least one `{{alias}}` token — useful for
 * skipping no-op work in hot paths.
 */
export function hasPipeTokens(template: string | undefined | null): boolean {
  return !!template && template.includes('{{') && TOKEN_RE.test(template);
}
