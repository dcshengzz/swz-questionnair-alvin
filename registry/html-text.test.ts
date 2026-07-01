import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../../src/registry/controls/HtmlWysiwyg';

describe('HTML text sanitization', () => {
  it('strips <script> tags and their content', () => {
    const out = sanitizeHtml('<p>hi</p><script>alert(1)</script>');
    expect(out).toBe('<p>hi</p>');
  });

  it('removes inline event handlers', () => {
    const out = sanitizeHtml('<p onclick="alert(1)">x</p>');
    expect(out).toBe('<p>x</p>');
  });

  it('blocks javascript: URLs on anchors', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(out.toLowerCase()).not.toContain('javascript:');
  });

  it('preserves color and background-color inline styles', () => {
    expect(sanitizeHtml('<span style="color: #ff0000">x</span>'))
      .toBe('<span style="color: #ff0000">x</span>');
    expect(sanitizeHtml('<span style="background-color: rgb(255, 235, 0)">x</span>'))
      .toBe('<span style="background-color: rgb(255, 235, 0)">x</span>');
    expect(sanitizeHtml('<mark style="background-color: #fff59d">x</mark>'))
      .toBe('<mark style="background-color: #fff59d">x</mark>');
  });

  it('strips non-color style properties and dangerous values', () => {
    expect(sanitizeHtml('<p style="color: red; position: fixed; top: 0">x</p>'))
      .toBe('<p style="color: red">x</p>');
    expect(sanitizeHtml('<p style="background-color: url(javascript:alert(1))">x</p>'))
      .toBe('<p>x</p>');
    expect(sanitizeHtml('<p style="color: expression(alert(1))">x</p>'))
      .toBe('<p>x</p>');
  });

  it('drops iframe, object, embed, form, svg, math', () => {
    const out = sanitizeHtml(
      '<iframe src="x"></iframe><object></object><embed><form></form><svg></svg><math></math><p>ok</p>',
    );
    expect(out).toBe('<p>ok</p>');
  });

  it('keeps allowed formatting tags', () => {
    const input = '<h2>Title</h2><p><strong>bold</strong> <em>italic</em> <u>u</u></p><ul><li>a</li></ul>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('allows http(s) and mailto links', () => {
    const out = sanitizeHtml('<a href="https://x">a</a><a href="mailto:a@b">b</a>');
    expect(out).toContain('href="https://x"');
    expect(out).toContain('href="mailto:a@b"');
  });

  it('forces rel=noopener noreferrer on target=_blank links', () => {
    const out = sanitizeHtml('<a href="https://x" target="_blank">a</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('strips data: URIs', () => {
    const out = sanitizeHtml('<a href="data:text/html,<script>1</script>">x</a>');
    expect(out).not.toContain('data:');
  });
});
