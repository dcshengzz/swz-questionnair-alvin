import { useEffect, useRef } from 'react';
import { EditOutlined } from '@ant-design/icons';
import { Form, Input, InputNumber, Radio, Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { commonPropertyFields, QuestionText } from './_common';
import { pipeAnswers } from './piping';

export interface TextboxProps {
  mode: 'text' | 'textarea';
  rows?: number;
  /**
   * Optional initial-value template. May contain `{{alias}}` tokens which
   * are resolved against the runtime answer map and used to seed the field
   * when the respondent hasn't typed anything yet.
   */
  defaultTemplate?: string;
}

const textboxPlugin: ControlPlugin<TextboxProps> = {
  type: 'textbox',
  category: 'input',
  group: 'basic',
  label: 'Text input',
  icon: <EditOutlined />,
  description: 'Single-line text or multi-line textarea.',
  isAnswerable: true,

  defaultProps: () => ({ mode: 'text', rows: 3 }),
  defaultNode: () => ({
    type: 'textbox',
    friendlyName: 'Text',
    required: false,
    layout: { span: 12 },
    props: { mode: 'text', rows: 3 },
  }),

  CanvasPreview: ({ node }) => (
    <div style={{ pointerEvents: 'none' }}>
      <QuestionText node={node} />
      {node.props.mode === 'textarea' ? (
        <Input.TextArea rows={node.props.rows ?? 3} disabled placeholder={node.placeholder} />
      ) : (
        <Input disabled placeholder={node.placeholder} />
      )}
    </div>
  ),

  PropertyEditor: ({ node, onChange, otherAliases }) => (
    <Form layout="vertical">
      {commonPropertyFields(node, onChange, otherAliases)}
      <Form.Item label="Mode">
        <Radio.Group
          value={node.props.mode}
          onChange={(e) => onChange({ props: { ...node.props, mode: e.target.value } })}
        >
          <Radio value="text">Single line</Radio>
          <Radio value="textarea">Multi-line</Radio>
        </Radio.Group>
      </Form.Item>
      {node.props.mode === 'textarea' && (
        <Form.Item label="Rows">
          <InputNumber
            min={1}
            max={20}
            value={node.props.rows ?? 3}
            onChange={(v) => onChange({ props: { ...node.props, rows: Number(v) || 3 } })}
          />
        </Form.Item>
      )}
      <Form.Item label="Min length">
        <InputNumber
          min={0}
          value={node.validation?.minLen ?? null}
          onChange={(v) => {
            const { minLen: _drop, ...rest } = node.validation ?? {};
            onChange({ validation: v == null ? rest : { ...rest, minLen: Number(v) } });
          }}
        />
      </Form.Item>
      <Form.Item label="Max length">
        <InputNumber
          min={0}
          value={node.validation?.maxLen ?? null}
          onChange={(v) => {
            const { maxLen: _drop, ...rest } = node.validation ?? {};
            onChange({ validation: v == null ? rest : { ...rest, maxLen: Number(v) } });
          }}
        />
      </Form.Item>
      <Form.Item label="Regex pattern">
        <Input
          value={node.validation?.pattern ?? ''}
          onChange={(e) => {
            const { pattern: _drop, ...rest } = node.validation ?? {};
            const pat = e.target.value;
            onChange({ validation: pat ? { ...rest, pattern: pat } : rest });
          }}
        />
      </Form.Item>
      <Form.Item
        label="Default value template"
        help={<span>Optional. <code>{'{{alias}}'}</code> tokens are piped from other answers when the field is still empty.</span>}
      >
        <Input
          value={node.props.defaultTemplate ?? ''}
          placeholder="e.g. Hello {{firstName}}"
          onChange={(e) => {
            const t = e.target.value;
            const { defaultTemplate: _drop, ...rest } = node.props;
            onChange({ props: t ? { ...rest, defaultTemplate: t } : rest });
          }}
        />
      </Form.Item>
    </Form>
  ),

  Renderer: ({ node, value, onChange, error, answers }) => {
    const v = (value as string | undefined) ?? '';
    const statusProp = error ? ({ status: 'error' as const }) : {};
    // Pipe the placeholder so authors can preview prior answers as a hint.
    const piped = node.placeholder ? pipeAnswers(node.placeholder, answers) : '';
    const placeholderProp = piped ? ({ placeholder: piped }) : {};

    // Seed the field from `defaultTemplate` once, when the value is still
    // blank. Re-seed if the resolved template changes (e.g. an upstream
    // answer arrived) and the user hasn't typed yet — but never overwrite
    // a non-empty value the respondent has entered.
    const seededOnceRef = useRef(false);
    const lastSeedRef = useRef<string>('');
    useEffect(() => {
      const tmpl = node.props.defaultTemplate;
      if (!tmpl) return;
      const seeded = pipeAnswers(tmpl, answers);
      // Only auto-fill while the field is empty; keep tracking template
      // changes so it stays in sync with upstream until the respondent
      // overrides it.
      if (v === '' && seeded !== lastSeedRef.current) {
        lastSeedRef.current = seeded;
        seededOnceRef.current = true;
        if (seeded) onChange(seeded);
      } else if (v !== '') {
        // User has typed — stop auto-syncing.
        lastSeedRef.current = v;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [answers, node.props.defaultTemplate]);

    const common = {
      value: v,
      ...placeholderProp,
      ...statusProp,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    };
    return node.props.mode === 'textarea'
      ? <Input.TextArea rows={node.props.rows ?? 3} {...common} />
      : <Input {...common} />;
  },

  validate: (node, value) => {
    const s = typeof value === 'string' ? value : '';
    const v = node.validation ?? {};
    if (v.minLen != null && s.length < v.minLen) return v.message ?? `${node.friendlyName} must be at least ${v.minLen} characters.`;
    if (v.maxLen != null && s.length > v.maxLen) return v.message ?? `${node.friendlyName} must be at most ${v.maxLen} characters.`;
    if (v.pattern) {
      try {
        if (!new RegExp(v.pattern).test(s)) return v.message ?? `${node.friendlyName} is not in the expected format.`;
      } catch { /* invalid regex → skip */ }
    }
    return null;
  },
};

export default textboxPlugin;
