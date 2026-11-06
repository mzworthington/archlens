import { useEffect, useState } from 'react';
import {
  applyDesignTheme,
  readDesignTheme,
  writeDesignTheme,
  type DesignThemeId,
} from '../../infrastructure/theme/designTheme';

const THEME_EVENT = 'archlens-design-theme';

function browserStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function useDesignTheme(): {
  theme: DesignThemeId;
  toggleTheme: () => void;
} {
  const [theme, setTheme] = useState<DesignThemeId>(() => readDesignTheme(browserStorage()));

  useEffect(() => {
    const onTheme = (event: Event) => {
      const next = (event as CustomEvent<DesignThemeId>).detail;
      if (next === 'light' || next === 'blueprint') setTheme(next);
    };
    window.addEventListener(THEME_EVENT, onTheme);
    return () => window.removeEventListener(THEME_EVENT, onTheme);
  }, []);

  useEffect(() => {
    applyDesignTheme(document.documentElement, theme);
  }, [theme]);

  const toggleTheme = () => {
    const next: DesignThemeId = theme === 'light' ? 'blueprint' : 'light';
    writeDesignTheme(browserStorage(), next);
    setTheme(next);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }));
  };

  return { theme, toggleTheme };
}
