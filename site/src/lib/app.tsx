import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Catalog } from '../types';
import { readStorage, writeStorage } from './storage';
import { buildEngine, type Engine } from '../search/engine';

type Theme = 'light' | 'dark';

interface AppValue {
  catalog: Catalog;
  engine: Engine;
  theme: Theme;
  toggleTheme: () => void;
  tray: string[];
  toggleTray: (id: string) => void;
  removeFromTray: (id: string) => void;
  toast: string;
  say: (msg: string) => void;
}

const Ctx = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

const systemTheme = (): Theme => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export function AppProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  const engine = useMemo(() => buildEngine(catalog.artifacts), [catalog.artifacts]);

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = readStorage('theme');
    return saved === 'dark' || saved === 'light' ? saved : systemTheme();
  });
  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      writeStorage('theme', next);
      return next;
    });
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const [tray, setTray] = useState<string[]>(() => {
    try {
      const raw = JSON.parse(readStorage('compare-tray', 'session') ?? '[]');
      return Array.isArray(raw) ? raw.filter((id) => typeof id === 'string' && catalog.plugins.some((p) => p.id === id)).slice(0, 3) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => writeStorage('compare-tray', JSON.stringify(tray), 'session'), [tray]);
  const toggleTray = useCallback((id: string) => setTray((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length >= 3 ? t : [...t, id])), []);
  const removeFromTray = useCallback((id: string) => setTray((t) => t.filter((x) => x !== id)), []);

  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const say = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 1400);
  }, []);

  const value = useMemo(
    () => ({ catalog, engine, theme, toggleTheme, tray, toggleTray, removeFromTray, toast, say }),
    [catalog, engine, theme, toggleTheme, tray, toggleTray, removeFromTray, toast, say],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
