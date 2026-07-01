import { z } from 'zod';
import { ALIAS_RE } from '../util/ids';

const ThemeSettingsZ = z.object({
  accentColor: z.string(),
  fontFamily: z.string(),
  pageBackground: z.string(),
  contentMaxWidth: z.number().positive(),
}).strict();

const PageStyleZ = z.object({
  background: z.string().optional(),
  paddingY: z.number().optional(),
  paddingX: z.number().optional(),
}).strict();

const ControlStyleZ = z.object({
  labelColor: z.string().optional(),
  labelSize: z.number().optional(),
  widthOverride: z.number().optional(),
}).strict();

const PerControlValidationZ = z.object({
  minLen: z.number().optional(),
  maxLen: z.number().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  pattern: z.string().optional(),
  message: z.string().optional(),
}).strict();

const ExprZ: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion('op', [
    z.object({ op: z.literal('const'), value: z.union([z.string(), z.number(), z.boolean(), z.null()]) }).strict(),
    z.object({ op: z.literal('ref'), alias: z.string() }).strict(),
    z.object({ op: z.literal('and'), args: z.array(ExprZ) }).strict(),
    z.object({ op: z.literal('or'), args: z.array(ExprZ) }).strict(),
    z.object({ op: z.literal('not'), arg: ExprZ }).strict(),
    z.object({ op: z.literal('eq'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('neq'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('gt'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('gte'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('lt'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('lte'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('in'), value: ExprZ, set: ExprZ }).strict(),
    z.object({ op: z.literal('notIn'), value: ExprZ, set: ExprZ }).strict(),
    z.object({ op: z.literal('matches'), value: ExprZ, pattern: z.string() }).strict(),
    z.object({ op: z.literal('empty'), arg: ExprZ }).strict(),
    z.object({ op: z.literal('notEmpty'), arg: ExprZ }).strict(),
    z.object({ op: z.literal('+'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('-'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('*'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
    z.object({ op: z.literal('/'), args: z.tuple([ExprZ, ExprZ]) }).strict(),
  ]),
);

const TargetAliasZ = z.object({ alias: z.string() }).strict();
const TargetPageZ = z.object({ pageId: z.string() }).strict();

const ActionZ = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('show'), target: z.union([TargetAliasZ, TargetPageZ]) }).strict(),
  z.object({ kind: z.literal('hide'), target: z.union([TargetAliasZ, TargetPageZ]) }).strict(),
  z.object({ kind: z.literal('require'), target: TargetAliasZ }).strict(),
  z.object({ kind: z.literal('unrequire'), target: TargetAliasZ }).strict(),
  z.object({ kind: z.literal('gotoPage'), pageId: z.string() }).strict(),
  z.object({ kind: z.literal('skipPage'), pageId: z.string() }).strict(),
  z.object({ kind: z.literal('fail'), target: TargetAliasZ.optional(), message: z.string() }).strict(),
]);

const RuleZ = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  when: ExprZ,
  then: z.array(ActionZ),
  else: z.array(ActionZ).optional(),
}).strict();

const ControlNodeZ = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  alias: z.string().regex(ALIAS_RE, 'alias must match [a-zA-Z_][a-zA-Z0-9_]*'),
  friendlyName: z.string(),
  description: z.string().optional(),
  required: z.boolean(),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
  layout: z.object({ span: z.number().int().min(1).max(12) }).strict(),
  style: ControlStyleZ.optional(),
  props: z.unknown(),
  validation: PerControlValidationZ.optional(),
}).strict();

const RowZ = z.object({
  id: z.string().min(1),
  cols: z.array(ControlNodeZ),
}).strict().refine(
  (r) => r.cols.reduce((s, c) => s + c.layout.span, 0) <= 12,
  { message: 'Row column span sum must be <= 12' },
);

const PageZ = z.object({
  id: z.string().min(1),
  name: z.string(),
  rows: z.array(RowZ),
  style: PageStyleZ.optional(),
}).strict();

export const QuestionnaireZ = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string(),
  theme: ThemeSettingsZ,
  pages: z.array(PageZ),
  rules: z.array(RuleZ),
  meta: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    appVersion: z.string(),
  }).strict(),
}).strict().superRefine((doc, ctx) => {
  const seen = new Set<string>();
  for (const p of doc.pages) {
    for (const r of p.rows) {
      for (const c of r.cols) {
        if (seen.has(c.alias)) {
          ctx.addIssue({ code: 'custom', path: ['pages'], message: `Duplicate alias: ${c.alias}` });
        }
        seen.add(c.alias);
      }
    }
  }
});

export type QuestionnaireParsed = z.infer<typeof QuestionnaireZ>;
