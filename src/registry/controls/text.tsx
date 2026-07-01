import { FontColorsOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import type { ControlPlugin } from '../types';
import { HtmlWysiwyg, sanitizeHtml } from './HtmlWysiwyg';
import { pipeAnswers } from './piping';

export interface TextProps {
  html: string;
}

function Render({ node, answers }: { node: { props: TextProps }; answers?: Record<string, unknown> }) {
  // Pipe first, sanitize second — that way piped answer values are scrubbed
  // alongside the author's HTML in a single pass and can never inject raw
  // markup.
  const html = sanitizeHtml(pipeAnswers(node.props.html ?? '', answers));
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

const textPlugin: ControlPlugin<TextProps> = {
  type: 'text',
  category: 'content',
  group: 'content',
  label: 'HTML text',
  icon: <FontColorsOutlined />,
  description: 'Headings, paragraphs, or rich HTML content. Not answerable.',
  isAnswerable: false,

  defaultProps: () => ({ html: '<h3>Section heading</h3><p>Paragraph text here.</p>' }),
  defaultNode: () => ({
    type: 'text',
    friendlyName: 'Text block',
    required: false,
    layout: { span: 12 },
    props: { html: '<h3>Section heading</h3><p>Paragraph text here.</p>' },
  }),

  CanvasPreview: ({ node }) => (
    <div
      className="qnn-html-preview"
      style={{ pointerEvents: 'none' }}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(node.props.html ?? '') }}
    />
  ),

  PropertyEditor: ({ node, onChange }) => (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>HTML</Typography.Title>
      <HtmlWysiwyg
        value={node.props.html ?? ''}
        onChange={(html) => onChange({ props: { html } })}
      />
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
        Content is sanitised: scripts, event handlers, inline styles, and unsafe URLs are stripped.
        Use <code>{'{{alias}}'}</code> to pipe in another control's answer.
      </Typography.Paragraph>
    </div>
  ),

  Renderer: Render,
};

export default textPlugin;
