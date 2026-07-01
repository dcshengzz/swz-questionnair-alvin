import { describe, it, expect } from 'vitest';
import { createDefaultRegistry, BUILT_IN_PLUGINS, defaultRegistry } from '../../src/registry/controls';

describe('built-in plugins', () => {
  it('registers 13 plugins without error', () => {
    const r = createDefaultRegistry();
    expect(r.all().map((p) => p.type).sort())
      .toEqual(['arithmetic', 'barcode', 'datetime', 'fileupload', 'gps', 'multi', 'photo', 'rating', 'single', 'slider', 'text', 'textbox', 'video']);
    expect(BUILT_IN_PLUGINS).toHaveLength(13);
  });

  it('each plugin has a non-empty defaultNode with a span in 1..12', () => {
    for (const p of BUILT_IN_PLUGINS) {
      const n = p.defaultNode();
      expect(n.layout.span).toBeGreaterThanOrEqual(1);
      expect(n.layout.span).toBeLessThanOrEqual(12);
      expect(n.friendlyName.length).toBeGreaterThan(0);
    }
  });

  it('registers the arithmetic plugin', () => {
    const plugin = defaultRegistry.get('arithmetic');
    expect(plugin).toBeDefined();
    expect(plugin!.type).toBe('arithmetic');
    expect(plugin!.category).toBe('advanced');
    expect(plugin!.isAnswerable).toBe(false);
  });
});
