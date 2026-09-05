import { createContext, useContext } from 'react';
import type { AnalyticsConsent } from '../../../infrastructure/analytics/analyticsConsent';

export type AnalyticsConsentContextValue = {
  consent: AnalyticsConsent;
  analyticsAvailable: boolean;
  grant: () => void;
  deny: () => void;
};

export const AnalyticsConsentContext = createContext<AnalyticsConsentContextValue | null>(null);

export function useAnalyticsConsent(): AnalyticsConsentContextValue | null {
  return useContext(AnalyticsConsentContext);
}
