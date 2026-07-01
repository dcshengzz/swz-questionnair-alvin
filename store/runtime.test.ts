import { describe, it, expect } from 'vitest';
import { createRuntimeStore } from '../../src/store/runtime';
import { makeEmptyQuestionnaire } from '../../src/schema/factories';
import type { Rule } from '../../src/schema/types';

describe('runtimeStore', () => {
  const q = makeEmptyQuestionnaire('T');

  it('initial state uses first page', () => {
    const s = createRuntimeStore(q);
    expect(s.getState().currentPageId).toBe(q.pages[0]!.id);
    expect(s.getState().history).toEqual([]);
  });

  it('setAnswer updates answers and bumps tick', () => {
    const s = createRuntimeStore(q);
    s.getState().setAnswer('name', 'Jane');
    expect(s.getState().answers['name']).toBe('Jane');
  });

  it('applyEffects merges visibility and errors', () => {
    const s = createRuntimeStore(q);
    s.getState().applyEffects({
      visibility: { x: false },
      requireOverrides: {},
      nextOverride: 'p2',
      validationErrors: { x: 'err' },
    });
    expect(s.getState().visibility['x']).toBe(false);
    expect(s.getState().nextOverride).toBe('p2');
    expect(s.getState().validationErrors['x']).toBe('err');
  });

  it('pushHistory and popHistory work', () => {
    const s = createRuntimeStore(q);
    s.getState().pushHistory('p1');
    s.getState().pushHistory('p2');
    expect(s.getState().history).toEqual(['p1', 'p2']);
    const popped = s.getState().popHistory();
    expect(popped).toBe('p2');
    expect(s.getState().history).toEqual(['p1']);
  });
});
