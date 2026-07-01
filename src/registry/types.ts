import type { ComponentType, ReactNode } from 'react';
import type { ControlNode, Questionnaire } from '../schema/types';

export interface ValidationCtx {
  required: boolean;
  friendlyName: string;
  answers: Record<string, unknown>;
}

export interface ControlPluginRendererProps<TProps> {
  node: ControlNode<TProps>;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  disabled?: boolean;
  /**
   * Full answer map keyed by alias. Plugins that derive their displayed
   * value from peer fields (e.g. `arithmetic`) read this. Populated by
   * the runtime; omitted in design-time previews.
   */
  answers?: Record<string, unknown>;
  /**
   * The full questionnaire, used by plugins that need schema context
   * beyond their own node (e.g. arithmetic cycle detection). Populated
   * by the runtime.
   */
  questionnaire?: Questionnaire;
}

export interface ControlPluginEditorProps<TProps> {
  node: ControlNode<TProps>;
  onChange: (patch: Partial<ControlNode<TProps>>) => void;
  otherAliases: string[];
  /** The full current questionnaire; plugins use this e.g. for cycle detection. */
  questionnaire: Questionnaire;
}

export interface ControlPluginPreviewProps<TProps> {
  node: ControlNode<TProps>;
}

export type PaletteGroup = 'content' | 'basic' | 'scales' | 'device' | 'compute';

export interface ControlPlugin<TProps = unknown> {
  type: string;
  category: 'content' | 'input' | 'advanced';
  /** Fine-grained palette grouping (optional; falls back to `category`). */
  group?: PaletteGroup;
  label: string;
  icon: ReactNode;
  description: string;

  defaultProps: () => TProps;
  defaultNode: () => Omit<ControlNode<TProps>, 'id' | 'alias'> & { alias?: string };

  PaletteItem?: ComponentType;
  CanvasPreview: ComponentType<ControlPluginPreviewProps<TProps>>;
  PropertyEditor: ComponentType<ControlPluginEditorProps<TProps>>;
  Renderer: ComponentType<ControlPluginRendererProps<TProps>>;

  validate?: (
    node: ControlNode<TProps>,
    value: unknown,
    ctx: ValidationCtx,
  ) => string | null;
  toAnswerValue?: (value: unknown) => unknown;
  isValueEmpty?: (value: unknown) => boolean;
  /**
   * When true, the runtime hides this control's entire UI (label +
   * description + body) but still mounts the Renderer so any side effects
   * — e.g. arithmetic write-back — keep firing.
   */
  isHidden?: (node: ControlNode<TProps>) => boolean;
  isAnswerable: boolean;
}
