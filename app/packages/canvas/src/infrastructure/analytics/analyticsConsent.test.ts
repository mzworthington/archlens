import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_CONSENT_KEY,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from './analyticsConsent';

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

describe('analyticsConsent', () => {
  it('treats missing or unknown values as unset', () => {
    expect(readAnalyticsConsent(null)).toBe('unset');
    expect(readAnalyticsConsent(memoryStorage())).toBe('unset');
    expect(readAnalyticsConsent(memoryStorage({ [ANALYTICS_CONSENT_KEY]: 'maybe' }))).toBe('unset');
  });

  it('round-trips granted and denied choices', () => {
    const storage = memoryStorage();
    writeAnalyticsConsent(storage, 'granted');
    expect(storage.getItem(ANALYTICS_CONSENT_KEY)).toBe('granted');
    expect(readAnalyticsConsent(storage)).toBe('granted');
    writeAnalyticsConsent(storage, 'denied');
    expect(readAnalyticsConsent(storage)).toBe('denied');
  });
});
