export const ANALYTICS_CONSENT_KEY = 'archlens.analytics.consent';

export type AnalyticsConsent = 'unset' | 'granted' | 'denied';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function readAnalyticsConsent(storage: ReadableStorage | null): AnalyticsConsent {
  const raw = storage?.getItem(ANALYTICS_CONSENT_KEY);
  if (raw === 'granted' || raw === 'denied') {
    return raw;
  }
  return 'unset';
}

export function writeAnalyticsConsent(
  storage: WritableStorage | null,
  consent: Exclude<AnalyticsConsent, 'unset'>
): void {
  storage?.setItem(ANALYTICS_CONSENT_KEY, consent);
}
