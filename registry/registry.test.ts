import { describe, it, expect } from 'vitest';
import { ControlRegistry } from '../../src/registry/ControlRegistry';
import type { ControlPlugin } from '../../src/registry/types';

const stubPlugin = (type: string, overrides: Partial<ControlPlugin> = {}): ControlPlugin => ({
  type,
  category: 'input',
  label: type,
  icon: null,
  description: '',
  defaultProps: () => ({}),
  defaultNode: () => ({
    type,
    friendlyName: type,
    required: false,
    layout: { span: 12 },
    props: {},
  }),
  CanvasPreview: () => null,
  PropertyEditor: () => null,
  Renderer: () => null,
  isAnswerable: true,
  ...overrides,
});

describe('ControlRegistry', () => {
  it('registers and gets plugins', () => {
    const r = new ControlRegistry();
    r.register(stubPlugin('a'));
    expect(r.get('a')?.type).toBe('a');
    expect(r.all()).toHaveLength(1);
  });

  it('throws on duplicate type without override', () => {
    const r = new ControlRegistry();
    r.register(stubPlugin('a'));
    expect(() => r.register(stubPlugin('a'))).toThrow(/already registered/);
  });

  it('override replaces existing plugin', () => {
    const r = new ControlRegistry();
    r.register(stubPlugin('a', { label: 'first' }));
    r.override(stubPlugin('a', { label: 'second' }));
    expect(r.get('a')?.label).toBe('second');
  });

  it('throws on empty type', () => {
    const r = new ControlRegistry();
    expect(() => r.register(stubPlugin(''))).toThrow(/empty type/);
  });

  it('throws when Renderer missing', () => {
    const r = new ControlRegistry();
    const bad = stubPlugin('a');
    delete (bad as Partial<ControlPlugin>).Renderer;
    expect(() => r.register(bad as ControlPlugin)).toThrow(/Renderer/);
  });

  it('throws when PropertyEditor missing', () => {
    const r = new ControlRegistry();
    const bad = stubPlugin('a');
    delete (bad as Partial<ControlPlugin>).PropertyEditor;
    expect(() => r.register(bad as ControlPlugin)).toThrow(/PropertyEditor/);
  });

  it('throws when isAnswerable=true and CanvasPreview missing', () => {
    const r = new ControlRegistry();
    const bad = stubPlugin('a');
    delete (bad as Partial<ControlPlugin>).CanvasPreview;
    expect(() => r.register(bad as ControlPlugin)).toThrow(/CanvasPreview/);
  });

  it('clone creates a detached copy with merged plugins', () => {
    const r = new ControlRegistry();
    r.register(stubPlugin('a'));
    const r2 = r.clone();
    r2.register(stubPlugin('b'));
    expect(r.all()).toHaveLength(1);
    expect(r2.all()).toHaveLength(2);
  });
});
