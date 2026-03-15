/**
 * @file src/hooks/useTheme.ts
 * @description Hook to manage the application's light/dark theme.
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * The available theme modes.
 */
export type Theme = 'dark' | 'light';

const THEME_KEY = 'farkle-theme';

/**
 * Hook to manage the application theme.
 * Reads from and writes to localStorage, and updates the document element's data-theme attribute.
 *
 * @returns An object containing the current theme, a toggle function, and a setter function.
 */
export function useTheme(): {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
} {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  return { theme, isDark: theme !== 'light', toggleTheme, setTheme };
}
