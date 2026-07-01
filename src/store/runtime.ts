import { create } from 'zustand';
import type { Alias, PageId, Questionnaire } from '../schema/types';
import type { EffectAccumulator } from '../rules/engine';

export interface RuntimeState {
  questionnaire: Questionnaire;
  answers: Record<Alias, unknown>;
  visibility: Record<Alias | PageId, boolean>;
  requireOverrides: Record<Alias, boolean>;
  nextOverride: PageId | null;
  validationErrors: Record<Alias | '__page', string>;
  currentPageId: PageId;
  history: PageId[];

  setAnswer: (alias: Alias, value: unknown) => void;
  applyEffects: (eff: EffectAccumulator) => void;
  pushHistory: (pageId: PageId) => void;
  popHistory: () => PageId | undefined;
  goToPage: (pageId: PageId) => void;
  clearAnswers: () => void;
  consumeNextOverride: () => PageId | null;
}

export function createRuntimeStore(q: Questionnaire) {
  return create<RuntimeState>((set, get) => ({
    questionnaire: q,
    answers: {},
    visibility: {},
    requireOverrides: {},
    nextOverride: null,
    validationErrors: {},
    currentPageId: q.pages[0]?.id ?? '',
    history: [],

    setAnswer: (alias, value) => set((s) => ({ answers: { ...s.answers, [alias]: value } })),

    applyEffects: (eff) => set(() => ({
      visibility: { ...eff.visibility },
      requireOverrides: { ...eff.requireOverrides },
      nextOverride: eff.nextOverride,
      validationErrors: { ...eff.validationErrors },
    })),

    pushHistory: (pageId) => set((s) => ({ history: [...s.history, pageId] })),

    popHistory: () => {
      const h = get().history;
      const last = h[h.length - 1];
      set({ history: h.slice(0, -1) });
      return last;
    },

    goToPage: (pageId) => set(() => ({ currentPageId: pageId })),
    clearAnswers: () => set(() => ({ answers: {}, visibility: {}, requireOverrides: {}, nextOverride: null, validationErrors: {}, history: [], currentPageId: q.pages[0]?.id ?? '' })),
    consumeNextOverride: () => {
      const n = get().nextOverride;
      set({ nextOverride: null });
      return n;
    },
  }));
}

export type RuntimeStore = ReturnType<typeof createRuntimeStore>;
