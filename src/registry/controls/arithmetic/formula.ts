import type { Expr } from '../../../schema/types';
import { ALIAS_RE } from '../../../util/ids';

/**
 * Parser & formatter for the arithmetic formula bar.
 *
 * Grammar (recursive descent, left-associative):
 *   expr   = term (('+' | '-') term)*
 *   term   = factor (('*' | '×' | '/' | '÷') factor)*
 *   factor = number | alias | '(' expr ')' | ('-' | '+') factor
 *
 * Aliases follow ALIAS_RE; numbers accept optional decimal point.
 * Both ASCII (* /) and unicode (× ÷) operators are accepted on input.
 */

export type ArithOp = '+' | '-' | '*' | '/';

export interface ParseResult {
  expr: Expr | null;
  error: string | null;
}

type Token =
  | { kind: 'num'; value: number; pos: number }
  | { kind: 'ident'; value: string; pos: number }
  | { kind: 'op'; value: ArithOp; pos: number }
  | { kind: 'lparen'; pos: number }
  | { kind: 'rparen'; pos: number };

function tokenize(input: string): { tokens: Token[]; error: string | null } {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '(') { tokens.push({ kind: 'lparen', pos: i }); i++; continue; }
    if (ch === ')') { tokens.push({ kind: 'rparen', pos: i }); i++; continue; }
    if (ch === '+' || ch === '-') { tokens.push({ kind: 'op', value: ch, pos: i }); i++; continue; }
    if (ch === '*' || ch === '×') { tokens.push({ kind: 'op', value: '*', pos: i }); i++; continue; }
    if (ch === '/' || ch === '÷') { tokens.push({ kind: 'op', value: '/', pos: i }); i++; continue; }
    if (/[0-9.]/.test(ch)) {
      const start = i;
      while (i < input.length && /[0-9.]/.test(input[i]!)) i++;
      const lit = input.slice(start, i);
      const n = Number(lit);
      if (!Number.isFinite(n)) return { tokens: [], error: `Invalid number "${lit}"` };
      tokens.push({ kind: 'num', value: n, pos: start });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      // First segment.
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i]!)) i++;
      // Optional dotted continuations: `matrixAlias.rowKey.colKey`.
      while (i < input.length && input[i] === '.') {
        const dotPos = i;
        const segStart = i + 1;
        let j = segStart;
        while (j < input.length && /[a-zA-Z0-9_]/.test(input[j]!)) j++;
        if (j === segStart) {
          return { tokens: [], error: `Expected name after "." at position ${dotPos + 1}` };
        }
        i = j;
      }
      tokens.push({ kind: 'ident', value: input.slice(start, i), pos: start });
      continue;
    }
    return { tokens: [], error: `Unexpected character "${ch}" at position ${i + 1}` };
  }
  return { tokens, error: null };
}

class Parser {
  private i = 0;
  constructor(
    private readonly tokens: Token[],
    private readonly aliases: Set<string>,
    private readonly forbidden: Set<string>,
  ) {}

  parse(): Expr {
    const e = this.parseExpr();
    if (this.i < this.tokens.length) {
      const t = this.tokens[this.i]!;
      throw new Error(`Unexpected token at position ${t.pos + 1}`);
    }
    return e;
  }

  private peek(): Token | null { return this.tokens[this.i] ?? null; }
  private next(): Token { return this.tokens[this.i++]!; }

  private parseExpr(): Expr {
    let left = this.parseTerm();
    while (true) {
      const t = this.peek();
      if (!t || t.kind !== 'op' || (t.value !== '+' && t.value !== '-')) break;
      this.next();
      const right = this.parseTerm();
      left = { op: t.value, args: [left, right] };
    }
    return left;
  }

  private parseTerm(): Expr {
    let left = this.parseFactor();
    while (true) {
      const t = this.peek();
      if (!t || t.kind !== 'op' || (t.value !== '*' && t.value !== '/')) break;
      this.next();
      const right = this.parseFactor();
      left = { op: t.value, args: [left, right] };
    }
    return left;
  }

  private parseFactor(): Expr {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of formula');
    if (t.kind === 'op' && (t.value === '+' || t.value === '-')) {
      this.next();
      const inner = this.parseFactor();
      // Unary minus → 0 - inner; unary plus is a no-op.
      if (t.value === '-') return { op: '-', args: [{ op: 'const', value: 0 }, inner] };
      return inner;
    }
    if (t.kind === 'num') { this.next(); return { op: 'const', value: t.value }; }
    if (t.kind === 'ident') {
      this.next();
      const segments = t.value.split('.');
      for (const seg of segments) {
        if (!ALIAS_RE.test(seg)) {
          throw new Error(`"${t.value}" is not a valid field alias`);
        }
      }
      // For autocomplete validation only the head alias must exist; cell
      // paths like `matrix.r1.c1` validate the matrix's existence and let
      // the runtime resolve the inner path.
      if (this.aliases.size > 0 && !this.aliases.has(segments[0]!)) {
        throw new Error(`Unknown field "${segments[0]}"`);
      }
      // Cycle guard: both the full dotted path (e.g. `matrix.r1.c1`) and
      // the bare head alias (e.g. `total`) must be checked against the
      // forbidden set.
      if (this.forbidden.has(t.value) || this.forbidden.has(segments[0]!)) {
        throw new Error(`Referencing "${t.value}" would create a circular reference`);
      }
      return { op: 'ref', alias: t.value };
    }
    if (t.kind === 'lparen') {
      this.next();
      const inner = this.parseExpr();
      const close = this.peek();
      if (!close || close.kind !== 'rparen') throw new Error('Missing closing ")"');
      this.next();
      return inner;
    }
    throw new Error(`Unexpected token at position ${t.pos + 1}`);
  }
}

export function parseFormula(
  input: string,
  availableAliases: string[],
  forbiddenAliases: string[] = [],
): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { expr: null, error: null };
  const { tokens, error } = tokenize(trimmed);
  if (error) return { expr: null, error };
  try {
    const expr = new Parser(tokens, new Set(availableAliases), new Set(forbiddenAliases)).parse();
    return { expr, error: null };
  } catch (e) {
    return { expr: null, error: e instanceof Error ? e.message : 'Parse error' };
  }
}

const PRECEDENCE: Record<ArithOp, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

/**
 * Render an Expr back to compact infix text using ASCII operators.
 * Parentheses are emitted only where precedence/associativity require them.
 */
export function formatFormula(expr: Expr | null): string {
  if (!expr) return '';
  return render(expr, 0, 'left');
}

function render(expr: Expr, parentPrec: number, side: 'left' | 'right'): string {
  if (expr.op === 'const') {
    const v = expr.value;
    return typeof v === 'number' ? String(v) : v == null ? '0' : String(v);
  }
  if (expr.op === 'ref') return expr.alias || '?';
  if (expr.op === '+' || expr.op === '-' || expr.op === '*' || expr.op === '/') {
    const op = expr.op;
    const prec = PRECEDENCE[op];
    const [lhs, rhs] = expr.args;
    // Left side keeps its precedence on equal-prec; right side needs parens
    // for non-associative ops (- and /) at equal precedence.
    const needsParen = prec < parentPrec || (prec === parentPrec && side === 'right');
    const body = `${render(lhs, prec, 'left')} ${op} ${render(rhs, prec, 'right')}`;
    return needsParen ? `(${body})` : body;
  }
  return '?';
}
