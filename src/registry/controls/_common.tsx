import { Form, Input, InputNumber, Switch } from 'antd';
import type { ControlNode } from '../../schema/types';
import { isValidAlias } from '../../util/ids';
import { HtmlWysiwyg, sanitizeHtml } from './HtmlWysiwyg';
import { pipeAnswers } from './piping';

/**
 * Shared label component used by every CanvasPreview and the runtime
 * ControlField. Renders the (sanitized) HTML "question text" — the friendly
 * name is intentionally not shown to authors or respondents. Required-marker
 * asterisk is appended after the rendered HTML.
 */
export function QuestionText({
  node,
  showRequired = true,
  answers,
}: {
  node: Pick<ControlNode<unknown>, 'description' | 'required'>;
  showRequired?: boolean;
  /** When provided, `{{alias}}` tokens in the description are piped in. */
  answers?: Record<string, unknown>;
}) {
  const raw = (node.description ?? '').trim();
  if (!raw) {
    return showRequired && node.required ? <span aria-hidden="true">*</span> : null;
  }
  const html = sanitizeHtml(pipeAnswers(raw, answers));
  return (
    <span className="qnn-question-text">
      <span dangerouslySetInnerHTML={{ __html: html }} />
      {showRequired && node.required ? <span aria-hidden="true"> *</span> : null}
    </span>
  );
}

export function commonPropertyFields<T>(
  node: ControlNode<T>,
  onChange: (patch: Partial<ControlNode<T>>) => void,
  otherAliases: string[],
) {
  const aliasError =
    !node.alias
      ? 'Required'
      : !isValidAlias(node.alias)
        ? 'Must start with letter/underscore, then letters/digits/_'
        : otherAliases.includes(node.alias)
          ? 'Alias must be unique across the questionnaire'
          : undefined;
  return (
    <>
      <Form.Item label="Alias" {...(aliasError ? { validateStatus: 'error' as const, help: aliasError } : {})}>
        <Input
          aria-label="Alias"
          value={node.alias}
          onChange={(e) => onChange({ alias: e.target.value } as Partial<ControlNode<T>>)}
        />
      </Form.Item>
      <Form.Item label="Friendly name">
        <Input
          aria-label="Friendly name"
          value={node.friendlyName}
          onChange={(e) => onChange({ friendlyName: e.target.value } as Partial<ControlNode<T>>)}
        />
      </Form.Item>
      <Form.Item label="Question text">
        <HtmlWysiwyg
          value={node.description ?? ''}
          onChange={(html) =>
            onChange({ description: html || undefined } as Partial<ControlNode<T>>)
          }
        />
      </Form.Item>
      <Form.Item label="Required">
        <Switch
          checked={node.required}
          onChange={(v) => onChange({ required: v } as Partial<ControlNode<T>>)}
        />
      </Form.Item>
      <Form.Item label="Help text">
        <Input
          value={node.helpText ?? ''}
          onChange={(e) => onChange({ helpText: e.target.value || undefined } as Partial<ControlNode<T>>)}
        />
      </Form.Item>
      <Form.Item label="Placeholder">
        <Input
          value={node.placeholder ?? ''}
          onChange={(e) => onChange({ placeholder: e.target.value || undefined } as Partial<ControlNode<T>>)}
        />
      </Form.Item>
      <Form.Item label="Column span (1–12)">
        <InputNumber
          min={1}
          max={12}
          value={node.layout.span}
          onChange={(v) => onChange({ layout: { span: Math.min(12, Math.max(1, Number(v) || 1)) } } as Partial<ControlNode<T>>)}
        />
      </Form.Item>
    </>
  );
}
