import type { Action, Alias, PageId } from '../schema/types';

export interface EffectAccumulator {
  visibility: Record<Alias | PageId, boolean>;
  requireOverrides: Record<Alias, boolean>;
  nextOverride: PageId | null;
  validationErrors: Record<Alias | '__page', string>;
}

export const PAGE_ERROR_KEY = '__page' as const;

export function applyActions(actions: Action[], acc: EffectAccumulator): void {
  for (const a of actions) {
    switch (a.kind) {
      case 'show':
      case 'hide': {
        const key = 'alias' in a.target ? a.target.alias : a.target.pageId;
        acc.visibility[key] = a.kind === 'show';
        break;
      }
      case 'require':
        acc.requireOverrides[a.target.alias] = true;
        break;
      case 'unrequire':
        acc.requireOverrides[a.target.alias] = false;
        break;
      case 'gotoPage':
        acc.nextOverride = a.pageId;
        break;
      case 'skipPage':
        acc.visibility[a.pageId] = false;
        break;
      case 'fail': {
        const key = a.target?.alias ?? PAGE_ERROR_KEY;
        acc.validationErrors[key] = a.message;
        break;
      }
    }
  }
}
