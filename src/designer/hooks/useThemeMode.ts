import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'qnn.theme.mode.v1';

type Subscriber = (mode: ThemeMode) => void;
const subscribers = new Set<Subscriber>();

let currentMode: ThemeMode = 'light';
let initialized = false;

function readInitial(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyToDom(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset['theme'] = mode;
}

function ensureInitialized(): void {
  if (initialized) return;
  initialized = true;
  currentMode = readInitial();
  applyToDom(currentMode);
}

function setModeGlobal(next: ThemeMode): void {
  ensureInitialized();
  if (next === currentMode) return;
  currentMode = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode, disabled); fall back to in-memory.
      console.warn('[qnn] localStorage unavailable; theme will not persist.');
    }
  }
  applyToDom(next);
  subscribers.forEach((fn) => fn(next));
}

export function useThemeMode(): [ThemeMode, (m: ThemeMode) => void] {
  ensureInitialized();
  const [mode, setLocal] = useState<ThemeMode>(currentMode);

  useEffect(() => {
    const sub: Subscriber = (m) => setLocal(m);
    subscribers.add(sub);
    // Resync in case currentMode changed between render and effect.
    if (currentMode !== mode) setLocal(currentMode);
    return () => {
      subscribers.delete(sub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [mode, setModeGlobal];
}
