import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Theme preference: 'light' | 'dark' | 'system'. Stored in localStorage and applied as
// <html data-theme="light|dark">. index.html applies it before first paint to avoid a flash.
const STORAGE_KEY = 'llmops_theme';
const DEFAULT_PREFERENCE = 'dark';
const ThemeContext = createContext(null);

const readPreference = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : DEFAULT_PREFERENCE;
  } catch {
    return DEFAULT_PREFERENCE;
  }
};

const systemTheme = () =>
  window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

export const ThemeProvider = ({ children }) => {
  const [preference, setPreferenceState] = useState(readPreference);
  const [system, setSystem] = useState(systemTheme);

  // Follow OS changes while preference is 'system'
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setSystem(mq.matches ? 'light' : 'dark');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const theme = preference === 'system' ? system : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setPreference = useCallback((next) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable - preference just won't persist */
    }
  }, []);

  const value = useMemo(() => ({ preference, theme, setPreference }), [preference, theme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
};
