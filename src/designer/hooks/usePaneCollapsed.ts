import { useCallback, useState } from 'react';

function readInitial(storageKey: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === '1') return true;
    if (raw === '0') return false;
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Tracks a boolean pane-collapse flag in React state and persists it to
 * localStorage under `storageKey`. Values are stored as "1" / "0".
 */
export function usePaneCollapsed(
  storageKey: string,
  initial = false,
): [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => readInitial(storageKey, initial));

  const set = useCallback(
    (next: boolean) => {
      setCollapsed(next);
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        console.warn('[qnn] localStorage unavailable; pane state will not persist.');
      }
    },
    [storageKey],
  );

  return [collapsed, set];
}
