import {
  BgColorsOutlined,
  BoldOutlined,
  FontColorsOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Button, ColorPicker, Popover, Select, Space, Tooltip } from 'antd';
import type { Color } from 'antd/es/color-picker';
import DOMPurify from 'dompurify';
import { useEffect, useRef, useState } from 'react';

export const HTML_TEXT_ALLOWED_TAGS = [
  'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'font', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'hr', 'i', 'li', 'mark', 'ol', 'p', 'pre', 's', 'span', 'strong', 'u', 'ul',
];
export const HTML_TEXT_ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'style', 'color'];

// CSS color values we accept in inline style — hex, rgb/rgba, hsl/hsla, or plain named color.
const COLOR_VALUE_RE = /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s,./%]+\)|hsla?\([\d\s,./%]+\)|[a-z]+)$/i;
const ALLOWED_STYLE_PROPS = new Set(['color', 'background-color']);

function sanitizeInlineStyle(raw: string): string {
  // Parse "prop: value; prop: value" without regex pitfalls on quoted strings.
  return raw
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const idx = decl.indexOf(':');
      if (idx < 0) return '';
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const value = decl.slice(idx + 1).trim();
      if (!ALLOWED_STYLE_PROPS.has(prop)) return '';
      if (/url\s*\(|expression\s*\(|\\|javascript:/i.test(value)) return '';
      if (!COLOR_VALUE_RE.test(value)) return '';
      return `${prop}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'style') {
    const safe = sanitizeInlineStyle(data.attrValue);
    if (safe) data.attrValue = safe;
    else data.keepAttr = false;
  }
  if (data.attrName === 'color') {
    if (!COLOR_VALUE_RE.test(data.attrValue.trim())) data.keepAttr = false;
  }
});

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    const el = node as HTMLAnchorElement;
    if (el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }
});

/**
 * Strict allowlist sanitization: no scripts, no event handlers, no unsafe URIs.
 * Inline `style` is parsed and narrowed to `color` and `background-color` only.
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input ?? '', {
    ALLOWED_TAGS: HTML_TEXT_ALLOWED_TAGS,
    ALLOWED_ATTR: HTML_TEXT_ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'svg', 'math'],
    FORBID_ATTR: ['srcset', 'formaction', 'xlink:href', 'onerror', 'onload'],
    ALLOW_DATA_ATTR: false,
  });
}

type BlockTag = 'p' | 'h1' | 'h2' | 'h3' | 'blockquote' | 'pre';

const BLOCK_OPTIONS: { label: string; value: BlockTag }[] = [
  { label: 'Paragraph', value: 'p' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
  { label: 'Quote', value: 'blockquote' },
  { label: 'Code block', value: 'pre' },
];

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

export function HtmlWysiwyg({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [fgColor, setFgColor] = useState<string>('#1a202c');
  const [bgColor, setBgColor] = useState<string>('#fff59d');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sanitized = sanitizeHtml(value);
    if (el.innerHTML !== sanitized) el.innerHTML = sanitized;
  }, [value]);

  // Track the last selection *inside* the editor so color pickers (which steal
  // focus when their popover opens) can restore it before running execCommand.
  useEffect(() => {
    const onSelChange = () => {
      const sel = document.getSelection();
      const el = ref.current;
      if (!sel || !el || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (el.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    };
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  }, []);

  const restoreSelection = () => {
    const saved = savedRangeRef.current;
    if (!saved) { ref.current?.focus(); return; }
    ref.current?.focus();
    const sel = document.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(saved);
  };

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    onChange(sanitizeHtml(el.innerHTML));
  };

  const applyColor = (cmd: 'foreColor' | 'hiliteColor', hex: string) => {
    restoreSelection();
    try { document.execCommand('styleWithCSS', false, 'true'); } catch { /* noop */ }
    document.execCommand(cmd, false, hex);
    emit();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    const payload = html ? sanitizeHtml(html) : escapeText(text);
    document.execCommand('insertHTML', false, payload);
  };

  const handleBlock = (tag: BlockTag) => {
    ref.current?.focus();
    exec('formatBlock', tag === 'pre' ? 'pre' : tag);
    emit();
  };

  const handleLink = () => {
    const url = window.prompt('Link URL (https://…)');
    if (!url) return;
    if (!/^(https?:|mailto:|tel:)/i.test(url)) {
      window.alert('Only http(s), mailto, and tel links are allowed.');
      return;
    }
    ref.current?.focus();
    exec('createLink', url);
    emit();
  };

  const btn = (title: string, icon: React.ReactNode, cmd: string) => (
    <Tooltip title={title}>
      <Button
        type="text"
        size="small"
        icon={icon}
        aria-label={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { ref.current?.focus(); exec(cmd); emit(); }}
      />
    </Tooltip>
  );

  return (
    <div className="qnn-wysiwyg">
      <div className="qnn-wysiwyg-toolbar" role="toolbar" aria-label="Rich text toolbar">
        <Select
          size="small"
          defaultValue="p"
          options={BLOCK_OPTIONS}
          onChange={handleBlock}
          style={{ width: 120 }}
          onMouseDown={(e) => e.preventDefault()}
        />
        <Space size={2} wrap>
          {btn('Bold', <BoldOutlined />, 'bold')}
          {btn('Italic', <ItalicOutlined />, 'italic')}
          {btn('Underline', <UnderlineOutlined />, 'underline')}
          {btn('Strikethrough', <StrikethroughOutlined />, 'strikeThrough')}
          {btn('Bulleted list', <UnorderedListOutlined />, 'insertUnorderedList')}
          {btn('Numbered list', <OrderedListOutlined />, 'insertOrderedList')}
          <Popover
            trigger="click"
            placement="bottom"
            content={
              <ColorPicker
                value={fgColor}
                onChange={(c: Color) => {
                  const hex = c.toHexString();
                  setFgColor(hex);
                  applyColor('foreColor', hex);
                }}
                presets={[{ label: 'Text', colors: ['#1a202c', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#6d4c41', '#757575', '#ffffff'] }]}
              />
            }
          >
            <Tooltip title="Text color">
              <Button
                type="text"
                size="small"
                aria-label="Text color"
                onMouseDown={(e) => e.preventDefault()}
                icon={<FontColorsOutlined style={{ color: fgColor }} />}
              />
            </Tooltip>
          </Popover>
          <Popover
            trigger="click"
            placement="bottom"
            content={
              <ColorPicker
                value={bgColor}
                onChange={(c: Color) => {
                  const hex = c.toHexString();
                  setBgColor(hex);
                  applyColor('hiliteColor', hex);
                }}
                presets={[{ label: 'Highlight', colors: ['#fff59d', '#ffe082', '#ffab91', '#f48fb1', '#ce93d8', '#90caf9', '#a5d6a7', '#e0e0e0', '#000000', '#ffffff'] }]}
              />
            }
          >
            <Tooltip title="Highlight">
              <Button
                type="text"
                size="small"
                aria-label="Highlight"
                onMouseDown={(e) => e.preventDefault()}
                icon={<BgColorsOutlined style={{ color: bgColor }} />}
              />
            </Tooltip>
          </Popover>
          <Tooltip title="Link">
            <Button
              type="text"
              size="small"
              icon={<LinkOutlined />}
              aria-label="Link"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleLink}
            />
          </Tooltip>
          <Tooltip title="Clear formatting">
            <Button
              type="text"
              size="small"
              aria-label="Clear formatting"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { ref.current?.focus(); exec('removeFormat'); emit(); }}
            >
              Tx
            </Button>
          </Tooltip>
        </Space>
      </div>
      <div
        ref={ref}
        className="qnn-wysiwyg-surface"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="HTML content editor"
        onInput={emit}
        onBlur={emit}
        onPaste={handlePaste}
      />
    </div>
  );
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
