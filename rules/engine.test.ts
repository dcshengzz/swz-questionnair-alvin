import { describe, it, expect } from 'vitest';
import { applyActions, type EffectAccumulator } from '../../src/rules/engine';
import type { Action } from '../../src/schema/types';

const empty = (): EffectAccumulator => ({
  visibility: {},
  requireOverrides: {},
  nextOverride: null,
  validationErrors: {},
});

describe('applyActions', () => {
  it('show/hide set visibility, later wins', () => {
    const acc = empty();
    const actions: Action[] = [
      { kind: 'hide', target: { alias: 'x' } },
      { kind: 'show', target: { alias: 'x' } },
    ];
    applyActions(actions, acc);
    expect(acc.visibility['x']).toBe(true);
  });

  it('require/unrequire', () => {
    const acc = empty();
    applyActions([{ kind: 'require', target: { alias: 'a' } }], acc);
    expect(acc.requireOverrides['a']).toBe(true);
    applyActions([{ kind: 'unrequire', target: { alias: 'a' } }], acc);
    expect(acc.requireOverrides['a']).toBe(false);
  });

  it('gotoPage sets nextOverride', () => {
    const acc = empty();
    applyActions([{ kind: 'gotoPage', pageId: 'p3' }], acc);
    expect(acc.nextOverride).toBe('p3');
  });

  it('skipPage sets visibility[pageId] = false', () => {
    const acc = empty();
    applyActions([{ kind: 'skipPage', pageId: 'p2' }], acc);
    expect(acc.visibility['p2']).toBe(false);
  });

  it('fail writes to validationErrors by alias', () => {
    const acc = empty();
    applyActions([{ kind: 'fail', target: { alias: 'email' }, message: 'bad email' }], acc);
    expect(acc.validationErrors['email']).toBe('bad email');
  });

  it('fail without target stores under __page sentinel', () => {
    const acc = empty();
    applyActions([{ kind: 'fail', message: 'form broken' }], acc);
    expect(acc.validationErrors['__page']).toBe('form broken');
  });
});
