import { describe, it, expect } from 'vitest';
import { defaultIsValueEmpty, effectiveIsEmpty } from '../../src/registry/defaults';
import type { ControlPlugin } from '../../src/registry/types';

describe('defaultIsValueEmpty', () => {
  it('treats undefined/null/""/[] as empty', () => {
    expect(defaultIsValueEmpty(undefined)).toBe(true);
    expect(defaultIsValueEmpty(null)).toBe(true);
    expect(defaultIsValueEmpty('')).toBe(true);
    expect(defaultIsValueEmpty([])).toBe(true);
  });
  it('treats 0 and false as non-empty', () => {
    expect(defaultIsValueEmpty(0)).toBe(false);
    expect(defaultIsValueEmpty(false)).toBe(false);
  });
});

describe('effectiveIsEmpty', () => {
  it('uses plugin override when supplied', () => {
    const plugin = { isValueEmpty: (v: unknown) => v === 'n/a' } as unknown as ControlPlugin;
    expect(effectiveIsEmpty(plugin, 'n/a')).toBe(true);
    expect(effectiveIsEmpty(plugin, '')).toBe(false);
  });
  it('falls back to default', () => {
    const plugin = {} as ControlPlugin;
    expect(effectiveIsEmpty(plugin, '')).toBe(true);
  });
});
