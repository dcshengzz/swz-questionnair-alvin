export type Alias = string;
export type PageId = string;

export interface ThemeSettings {
  accentColor: string;
  fontFamily: string;
  pageBackground: string;
  contentMaxWidth: number;
}

export interface PageStyle {
  background?: string;
  paddingY?: number;
  paddingX?: number;
}

export interface ControlStyle {
  labelColor?: string;
  labelSize?: number;
  widthOverride?: number;
}

export interface PerControlValidation {
  minLen?: number;
  maxLen?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  message?: string;
}

export interface ControlNode<TProps = unknown> {
  id: string;
  type: string;                // matches plugin.type
  alias: Alias;
  friendlyName: string;
  description?: string;        // sanitized rich-text HTML shown under the label
  required: boolean;
  helpText?: string;
  placeholder?: string;
  layout: { span: number };    // 1..12
  style?: ControlStyle;
  props: TProps;
  validation?: PerControlValidation;
}

export interface Row {
  id: string;
  cols: ControlNode[];
}

export interface Page {
  id: PageId;
  name: string;
  rows: Row[];
  style?: PageStyle;
}

export type Expr =
  | { op: 'const'; value: string | number | boolean | null }
  | { op: 'ref'; alias: Alias }
  | { op: 'and' | 'or'; args: Expr[] }
  | { op: 'not'; arg: Expr }
  | { op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'; args: [Expr, Expr] }
  | { op: 'in' | 'notIn'; value: Expr; set: Expr }
  | { op: 'matches'; value: Expr; pattern: string }
  | { op: 'empty' | 'notEmpty'; arg: Expr }
  | { op: '+' | '-' | '*' | '/'; args: [Expr, Expr] };

export type Action =
  | { kind: 'show' | 'hide'; target: { alias: Alias } | { pageId: PageId } }
  | { kind: 'require' | 'unrequire'; target: { alias: Alias } }
  | { kind: 'gotoPage'; pageId: PageId }
  | { kind: 'skipPage'; pageId: PageId }
  | { kind: 'fail'; target?: { alias: Alias }; message: string };

export interface Rule {
  id: string;
  name?: string;
  when: Expr;
  then: Action[];
  else?: Action[];
}

export interface Questionnaire {
  schemaVersion: 1;
  id: string;
  title: string;
  theme: ThemeSettings;
  pages: Page[];
  rules: Rule[];
  meta: { createdAt: string; updatedAt: string; appVersion: string };
}

export const CURRENT_SCHEMA_VERSION = 1 as const;
