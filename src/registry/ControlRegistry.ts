import type { ControlPlugin } from './types';

export class ControlRegistry {
  private plugins = new Map<string, ControlPlugin>();

  register(plugin: ControlPlugin): void {
    this.validate(plugin);
    if (this.plugins.has(plugin.type)) {
      throw new Error(`Control plugin "${plugin.type}" is already registered. Use override() to replace.`);
    }
    this.plugins.set(plugin.type, plugin);
  }

  override(plugin: ControlPlugin): void {
    this.validate(plugin);
    this.plugins.set(plugin.type, plugin);
  }

  get(type: string): ControlPlugin | undefined {
    return this.plugins.get(type);
  }

  all(): ControlPlugin[] {
    return [...this.plugins.values()];
  }

  clone(): ControlRegistry {
    const copy = new ControlRegistry();
    for (const p of this.plugins.values()) copy.plugins.set(p.type, p);
    return copy;
  }

  private validate(plugin: ControlPlugin): void {
    if (!plugin.type || plugin.type.trim() === '') {
      throw new Error('ControlPlugin has empty type');
    }
    if (!plugin.Renderer) {
      throw new Error(`ControlPlugin "${plugin.type}" missing Renderer`);
    }
    if (!plugin.PropertyEditor) {
      throw new Error(`ControlPlugin "${plugin.type}" missing PropertyEditor`);
    }
    if (plugin.isAnswerable && !plugin.CanvasPreview) {
      throw new Error(`ControlPlugin "${plugin.type}" missing CanvasPreview`);
    }
  }
}
