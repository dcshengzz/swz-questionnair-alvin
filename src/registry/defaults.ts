import type { ControlPlugin } from './types';

export function defaultIsValueEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

export function effectiveIsEmpty(plugin: ControlPlugin, v: unknown): boolean {
  return plugin.isValueEmpty ? plugin.isValueEmpty(v) : defaultIsValueEmpty(v);
}
