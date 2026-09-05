import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PostHogProvider } from '@posthog/react';
import posthog from 'posthog-js';
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from '../../../infrastructure/analytics/analyticsConsent';
import {
  createAnalyticsSession,
  type AnalyticsSession,
} from '../../../infrastructure/analytics/initBrowserPostHog';
import type { PostHogBrowserConfig } from '../../../infrastructure/analytics/posthogConfig';
import { AnalyticsConsentNotice } from './AnalyticsConsentNotice';
import {
  AnalyticsConsentContext,
  type AnalyticsConsentContextValue,
} from './analyticsConsentContext';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

type Props = {
  config: PostHogBrowserConfig;
  children: ReactNode;
  storage?: StorageLike | null;
  session?: AnalyticsSession;
};

export function AnalyticsConsentRoot({
  config,
  children,
  storage = defaultStorage(),
  session,
}: Props) {
  const sessionRef = useRef(session ?? createAnalyticsSession());
  const [consent, setConsent] = useState<AnalyticsConsent>(() => readAnalyticsConsent(storage));

  const applyGranted = useCallback(() => {
    if (!config.enabled) {
      return;
    }
    sessionRef.current.start(config);
  }, [config]);

  useEffect(() => {
    if (consent === 'granted' && config.enabled) {
      applyGranted();
    }
  }, [applyGranted, config.enabled, consent]);

  const grant = useCallback(() => {
    writeAnalyticsConsent(storage, 'granted');
    applyGranted();
    setConsent('granted');
  }, [applyGranted, storage]);

  const deny = useCallback(() => {
    writeAnalyticsConsent(storage, 'denied');
    sessionRef.current.stop();
    setConsent('denied');
  }, [storage]);

  const value = useMemo<AnalyticsConsentContextValue>(
    () => ({
      consent,
      analyticsAvailable: config.enabled,
      grant,
      deny,
    }),
    [consent, config.enabled, deny, grant]
  );

  const tracking = consent === 'granted' && config.enabled;
  const tree = tracking ? <PostHogProvider client={posthog}>{children}</PostHogProvider> : children;

  return (
    <AnalyticsConsentContext.Provider value={value}>
      {tree}
      {consent === 'unset' ? <AnalyticsConsentNotice onGrant={grant} onDeny={deny} /> : null}
    </AnalyticsConsentContext.Provider>
  );
}
