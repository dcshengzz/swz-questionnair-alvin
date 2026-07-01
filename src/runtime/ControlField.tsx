import { Form } from 'antd';
import type { ControlRegistry } from '../registry/ControlRegistry';
import type { ControlNode, Questionnaire } from '../schema/types';
import { PluginErrorBoundary } from '../util/errorBoundary';
import { QuestionText } from '../registry/controls/_common';

export function ControlField({
  node, value, onChange, error, registry, answers, questionnaire,
}: {
  node: ControlNode; value: unknown; onChange: (v: unknown) => void; error?: string; registry: ControlRegistry;
  answers?: Record<string, unknown>; questionnaire?: Questionnaire;
}) {
  const plugin = registry.get(node.type);
  if (!plugin) return <div>Unknown control: {node.type}</div>;
  // Plugins can declare themselves invisible at runtime (e.g. arithmetic
  // with `visible: false`). The Renderer still mounts inside a hidden
  // wrapper so any side effects — such as writing the computed value back
  // into the answer map — keep firing. The respondent just sees nothing.
  const hidden = plugin.isHidden ? plugin.isHidden(node as never) : false;
  if (hidden) {
    return (
      <div style={{ display: 'none' }} aria-hidden="true">
        <PluginErrorBoundary fallback={null}>
          <plugin.Renderer
            node={node as never}
            value={value}
            onChange={onChange}
            {...(answers ? { answers } : {})}
            {...(questionnaire ? { questionnaire } : {})}
          />
        </PluginErrorBoundary>
      </div>
    );
  }
  if (!plugin.isAnswerable) {
    const hasQuestion = Boolean((node.description ?? '').trim());
    return (
      // Non-answerable plugins skip the Form.Item wrapping, but they still
      // receive the real `value` and `onChange` — some (e.g. `arithmetic`)
      // derive a value from peer fields and write it back so rules and
      // downstream computed fields can see it. Display-only plugins like
      // `text` just ignore both props. Question text (when set) still
      // renders above the control so computed fields like arithmetic get
      // a label.
      <PluginErrorBoundary fallback={<span style={{ color: 'crimson' }}>⚠ Render error</span>}>
        {hasQuestion ? (
          <div className="qnn-nonanswerable-label" style={{ marginBottom: 4 }}>
            <QuestionText node={node} showRequired={false} {...(answers ? { answers } : {})} />
          </div>
        ) : null}
        <plugin.Renderer
          node={node as never}
          value={value}
          onChange={onChange}
          {...(answers ? { answers } : {})}
          {...(questionnaire ? { questionnaire } : {})}
        />
      </PluginErrorBoundary>
    );
  }
  const hasLabel = Boolean((node.description ?? '').trim()) || node.required;
  return (
    <Form.Item
      {...(hasLabel ? { label: <QuestionText node={node} {...(answers ? { answers } : {})} /> } : {})}
      help={error ?? node.helpText}
      {...(error ? { validateStatus: 'error' as const } : {})}
    >
      <PluginErrorBoundary fallback={<span style={{ color: 'crimson' }}>⚠ Render error</span>}>
        <plugin.Renderer
          node={node as never}
          value={value}
          onChange={onChange}
          {...(error ? { error } : {})}
          {...(answers ? { answers } : {})}
          {...(questionnaire ? { questionnaire } : {})}
        />
      </PluginErrorBoundary>
    </Form.Item>
  );
}
