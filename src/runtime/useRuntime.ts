import { useEffect, useMemo, useRef } from 'react';
import { ControlRegistry } from '../registry/ControlRegistry';
import { defaultRegistry } from '../registry/controls';
import type { ControlPlugin } from '../registry/types';
import type { Alias, ControlNode, PageId, Questionnaire } from '../schema/types';
import { runTick } from '../rules/tick';
import { createRuntimeStore, type RuntimeStore } from '../store/runtime';
import { effectiveIsEmpty } from '../registry/defaults';
import { loadRuntimeDraft, saveRuntimeDraft, clearRuntimeDraft } from '../io/persistence';

export interface UseRuntimeParams {
  questionnaire: Questionnaire;
  plugins?: ControlPlugin[];
  persistDraft?: boolean;
}

export function useRuntime({ questionnaire, plugins = [], persistDraft = true }: UseRuntimeParams) {
  const registry = useMemo(() => {
    const r = defaultRegistry.clone();
    for (const p of plugins) r.override(p);
    return r;
  }, [plugins]);

  const storeRef = useRef<RuntimeStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createRuntimeStore(questionnaire);
    if (persistDraft) {
      const answers = loadRuntimeDraft(questionnaire.id);
      if (answers) for (const [k, v] of Object.entries(answers)) storeRef.current.getState().setAnswer(k, v);
    }
  }
  const store = storeRef.current!;

  // Reactive tick on every answers change.
  useEffect(() => {
    const unsub = store.subscribe((s, prev) => {
      if (s.answers === prev.answers) return;
      const prevHidden = new Set<Alias>();
      for (const [k, v] of Object.entries(prev.visibility)) if (v === false) prevHidden.add(k);
      const eff = runTick(questionnaire.rules, s.answers, prevHidden);
      store.getState().applyEffects(eff);
      if (persistDraft) saveRuntimeDraft(questionnaire.id, s.answers);
    });
    return unsub;
  }, [questionnaire.id, questionnaire.rules, persistDraft, store]);

  // Initial tick
  useEffect(() => {
    const eff = runTick(questionnaire.rules, store.getState().answers, new Set());
    store.getState().applyEffects(eff);
  }, [questionnaire.rules, store]);

  return { store, registry };
}

export function isVisible(state: { visibility: Record<string, boolean> }, key: string): boolean {
  return state.visibility[key] !== false;
}

export function validatePageExit(
  page: { id: PageId; rows: { cols: ControlNode[] }[] },
  state: { answers: Record<Alias, unknown>; visibility: Record<string, boolean>; requireOverrides: Record<string, boolean>; validationErrors: Record<string, string> },
  registry: ControlRegistry,
): string | null {
  for (const row of page.rows) {
    for (const c of row.cols) {
      if (!isVisible(state, c.alias)) continue;
      const plugin = registry.get(c.type);
      if (!plugin?.isAnswerable) continue;
      const effectiveRequired = state.requireOverrides[c.alias] ?? c.required;
      const val = state.answers[c.alias];
      if (effectiveRequired && effectiveIsEmpty(plugin, val)) return `${c.friendlyName} is required.`;
      if (plugin.validate) {
        const m = plugin.validate(c, val, { required: effectiveRequired, friendlyName: c.friendlyName, answers: state.answers });
        if (m) return m;
      }
      if (state.validationErrors[c.alias]) return state.validationErrors[c.alias]!;
    }
  }
  if (state.validationErrors['__page']) return state.validationErrors['__page']!;
  return null;
}

export { clearRuntimeDraft };
