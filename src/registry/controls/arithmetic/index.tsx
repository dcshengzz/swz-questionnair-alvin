import { useEffect, useMemo } from 'react';
import { computeForbiddenRefs } from './dependencies';
import { CalculatorOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { Divider, Form, Input, InputNumber, Switch, Tag, Typography } from 'antd';
import type { Expr } from '../../../schema/types';
import type { ControlPlugin } from '../../types';
import { commonPropertyFields, QuestionText } from '../_common';
import { evalArith } from './evaluate';
import { findArithmeticCycles } from './cycles';
import { stringifyArith } from './stringify';
import { ArithmeticBuilder } from './ArithmeticBuilder';

export interface ArithmeticProps {
  /** Root of the expression tree. `null` until the designer configures it. */
  expression: Expr | null;
  /** Decimal places (0–6). Undefined renders the raw number. */
  decimals?: number;
  /** Literal prefix (e.g. "$"). */
  prefix?: string;
  /** Literal suffix (e.g. "kg"). */
  suffix?: string;
  /**
   * When false, the computed value is hidden from respondents in preview
   * mode. The expression still evaluates so other fields can reference it.
   */
  visible?: boolean;
}

function formatValue(n: number | null, props: ArithmeticProps): string {
  if (n == null) return '—';
  let body: string;
  if (props.decimals != null) {
    // useGrouping: false keeps the output deterministic across locales so
    // e2e assertions and JSON round-trips aren't at the mercy of the
    // host locale's thousands separator.
    body = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: props.decimals,
      maximumFractionDigits: props.decimals,
      useGrouping: false,
    }).format(n);
  } else {
    body = String(n);
  }
  return `${props.prefix ?? ''}${body}${props.suffix ?? ''}`;
}

const arithmeticPlugin: ControlPlugin<ArithmeticProps> = {
  type: 'arithmetic',
  category: 'advanced',
  group: 'compute',
  label: 'Arithmetic',
  icon: <CalculatorOutlined />,
  description: 'Compute a value from other fields and display it.',
  isAnswerable: false,

  defaultProps: () => ({ expression: null }),
  defaultNode: () => ({
    type: 'arithmetic',
    friendlyName: 'Total',
    required: false,
    layout: { span: 12 },
    props: { expression: null },
  }),

  CanvasPreview: ({ node }) => {
    const hidden = node.props.visible === false;
    const hiddenBadge = hidden ? (
      <Tag
        icon={<EyeInvisibleOutlined />}
        color="default"
        style={{ marginLeft: 8, fontSize: 11 }}
      >Hidden in preview</Tag>
    ) : null;
    if (!node.props.expression) {
      return (
        <div style={{ pointerEvents: 'none', opacity: hidden ? 0.5 : 1 }}>
          <span><QuestionText node={node} showRequired={false} />{hiddenBadge}</span>
          <div className="qnn-arith-value qnn-arith-placeholder">— not configured —</div>
        </div>
      );
    }
    return (
      <div style={{ pointerEvents: 'none', opacity: hidden ? 0.5 : 1 }}>
        <span><QuestionText node={node} showRequired={false} />{hiddenBadge}</span>
        <div className="qnn-arith-value">{formatValue(0, node.props)}</div>
      </div>
    );
  },

  PropertyEditor: ({ node, onChange, otherAliases, questionnaire }) => {
    const forbidden = useMemo(
      () => Array.from(computeForbiddenRefs(questionnaire, node.alias)),
      [questionnaire, node.alias],
    );
    const setExpression = (expression: Expr | null) =>
      onChange({ props: { ...node.props, expression } });
    const setDecimals = (decimals: number | null) => {
      const { decimals: _drop, ...rest } = node.props;
      onChange({ props: decimals == null ? rest : { ...rest, decimals } });
    };
    const setPrefix = (prefix: string) => {
      const { prefix: _drop, ...rest } = node.props;
      onChange({ props: prefix ? { ...rest, prefix } : rest });
    };
    const setSuffix = (suffix: string) => {
      const { suffix: _drop, ...rest } = node.props;
      onChange({ props: suffix ? { ...rest, suffix } : rest });
    };

    return (
      <Form layout="vertical">
        {commonPropertyFields(node, onChange, otherAliases)}
        <Divider orientation="left" plain>Formula</Divider>
        <ArithmeticBuilder
          expression={node.props.expression}
          onChange={setExpression}
          availableAliases={otherAliases}
          forbiddenAliases={forbidden}
        />
        <Typography.Paragraph
          type="secondary"
          style={{ marginTop: 12, marginBottom: 0, fontFamily: 'monospace' }}
          data-testid="arith-preview-string"
        >
          = {stringifyArith(node.props.expression)}
        </Typography.Paragraph>
        <Divider orientation="left" plain>Format</Divider>
        <Form.Item label="Decimals (0–6)">
          <InputNumber
            min={0}
            max={6}
            value={node.props.decimals ?? null}
            placeholder="raw"
            onChange={(v) => {
              // Harden against transient non-finite input that AntD's
              // clamping doesn't catch: `Intl.NumberFormat` throws on NaN
              // fraction digits, so only persist a finite number or null.
              const n = v == null ? null : Number(v);
              setDecimals(Number.isFinite(n) ? n : null);
            }}
          />
        </Form.Item>
        <Form.Item label="Prefix">
          <Input
            value={node.props.prefix ?? ''}
            placeholder="$"
            onChange={(e) => setPrefix(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="Suffix">
          <Input
            value={node.props.suffix ?? ''}
            placeholder="kg"
            onChange={(e) => setSuffix(e.target.value)}
          />
        </Form.Item>
        <Form.Item
          label="Visible in preview"
          help="Turn off to hide the computed value from respondents while still letting other fields reference it."
        >
          <Switch
            checked={node.props.visible !== false}
            onChange={(v) => onChange({ props: { ...node.props, visible: v } })}
          />
        </Form.Item>
      </Form>
    );
  },

  Renderer: ({ node, value, onChange, answers, questionnaire }) => {
    const cycleAliases = useMemo(
      () => (questionnaire ? findArithmeticCycles(questionnaire) : new Set<string>()),
      [questionnaire],
    );
    const inCycle = cycleAliases.has(node.alias);
    const result = inCycle ? null : evalArith(node.props.expression, answers ?? {});

    useEffect(() => {
      // Deliberately pinned to [result]: adding `value` / `onChange` would
      // either retrigger on every store-update round-trip or churn when
      // the parent re-renders with a fresh onChange identity, defeating
      // the `result !== value` gate.
      if (result !== value) onChange(result);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result]);

    useEffect(() => {
      if (inCycle) {
        // eslint-disable-next-line no-console
        console.warn(`[qnn/arithmetic] field "${node.alias}" is in a dependency cycle; rendering —`);
      }
    }, [inCycle, node.alias]);

    // Hidden arithmetic fields still mount and run the effect above so
    // their value flows into `answers` for downstream refs — they just
    // render nothing visible to the respondent.
    if (node.props.visible === false) return null;

    return <div className="qnn-arith-value">{formatValue(result, node.props)}</div>;
  },

  isHidden: (node) => node.props.visible === false,
};

export default arithmeticPlugin;
