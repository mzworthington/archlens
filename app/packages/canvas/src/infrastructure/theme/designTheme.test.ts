import { describe, expect, it } from 'vitest';
import {
  DESIGN_THEME_KEY,
  applyDesignTheme,
  readDesignTheme,
  writeDesignTheme,
} from './designTheme';

function memoryStorage(initial?: Record<string, string>): Storage {
  const data = new Map(Object.entries(initial ?? {}));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: key => data.get(key) ?? null,
    key: index => [...data.keys()][index] ?? null,
    removeItem: key => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('designTheme', () => {
  it('selects Light when the saved choice is missing or unknown', () => {
    expect(readDesignTheme(null)).toBe('light');
    expect(readDesignTheme(memoryStorage())).toBe('light');
    expect(readDesignTheme(memoryStorage({ [DESIGN_THEME_KEY]: 'sepia' }))).toBe('light');
  });

  it('round-trips Light and Blueprint choices', () => {
    const storage = memoryStorage();
    writeDesignTheme(storage, 'light');
    expect(storage.getItem(DESIGN_THEME_KEY)).toBe('light');
    expect(readDesignTheme(storage)).toBe('light');
    writeDesignTheme(storage, 'blueprint');
    expect(readDesignTheme(storage)).toBe('blueprint');
  });

  it('applies Light as a document theme attribute', () => {
    const root = document.createElement('div');
    applyDesignTheme(root, 'light');
    expect(root.dataset.theme).toBe('light');
    applyDesignTheme(root, 'blueprint');
    expect(root.dataset.theme).toBe('blueprint');
  });
});
