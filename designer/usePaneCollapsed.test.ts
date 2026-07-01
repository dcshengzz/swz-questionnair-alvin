import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePaneCollapsed } from '../../src/designer/hooks/usePaneCollapsed';

describe('usePaneCollapsed', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to false when no value stored', () => {
    const { result } = renderHook(() => usePaneCollapsed('qnn.test.key'));
    expect(result.current[0]).toBe(false);
  });

  it('uses provided initial when no value stored', () => {
    const { result } = renderHook(() => usePaneCollapsed('qnn.test.key', true));
    expect(result.current[0]).toBe(true);
  });

  it('reads "1" from localStorage as true', () => {
    window.localStorage.setItem('qnn.test.key', '1');
    const { result } = renderHook(() => usePaneCollapsed('qnn.test.key'));
    expect(result.current[0]).toBe(true);
  });

  it('reads "0" from localStorage as false even when initial=true', () => {
    window.localStorage.setItem('qnn.test.key', '0');
    const { result } = renderHook(() => usePaneCollapsed('qnn.test.key', true));
    expect(result.current[0]).toBe(false);
  });

  it('writes back on change', () => {
    const { result } = renderHook(() => usePaneCollapsed('qnn.test.key'));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem('qnn.test.key')).toBe('1');
    act(() => result.current[1](false));
    expect(window.localStorage.getItem('qnn.test.key')).toBe('0');
  });
});
