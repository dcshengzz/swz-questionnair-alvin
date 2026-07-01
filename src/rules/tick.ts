import type { Alias, Rule } from '../schema/types';
import { evalExpr } from './interpreter';
import { applyActions, type EffectAccumulator } from './engine';

export function runTick(
  rules: Rule[],
  answers: Record<Alias, unknown>,
  prevHidden: Set<Alias>,
): EffectAccumulator {
  const acc: EffectAccumulator = {
    visibility: {},
    requireOverrides: {},
    nextOverride: null,
    validationErrors: {},
  };
  const ctx = { answers, hidden: prevHidden };
  for (const rule of rules) {
    const truthy = Boolean(evalExpr(rule.when, ctx));
    if (truthy) applyActions(rule.then, acc);
    else if (rule.else) applyActions(rule.else, acc);
  }
  return acc;
}
