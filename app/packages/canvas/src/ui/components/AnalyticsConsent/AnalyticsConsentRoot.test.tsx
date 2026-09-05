import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AnalyticsConsentRoot } from './AnalyticsConsentRoot';
import { AnalyticsPreference } from './AnalyticsPreference';
import { ANALYTICS_CONSENT_KEY } from '../../../infrastructure/analytics/analyticsConsent';
import type { AnalyticsSession } from '../../../infrastructure/analytics/initBrowserPostHog';

const enabledConfig = {
  enabled: true as const,
  apiKey: 'phc_test',
  apiHost: 'https://a.mzworthington.co.uk',
};

function memoryStorage(initial?: Record<string, string>) {
  const data = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

function mockSession(): AnalyticsSession {
  return {
    start: vi.fn(() => true),
    stop: vi.fn(),
  };
}

describe('AnalyticsConsentRoot', () => {
  it('asks for a choice and does not start tracking until opt-in', () => {
    const storage = memoryStorage();
    const session = mockSession();
    render(
      <AnalyticsConsentRoot config={enabledConfig} storage={storage} session={session}>
        <p>App</p>
      </AnalyticsConsentRoot>
    );
    expect(session.start).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /help us improve archlens/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Help improve ArchLens' }));
    expect(session.start).toHaveBeenCalledWith(enabledConfig);
    expect(storage.getItem(ANALYTICS_CONSENT_KEY)).toBe('granted');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('leaves tracking off when the visitor declines', () => {
    const storage = memoryStorage();
    const session = mockSession();
    render(
      <AnalyticsConsentRoot config={enabledConfig} storage={storage} session={session}>
        <p>App</p>
      </AnalyticsConsentRoot>
    );
    fireEvent.click(screen.getByRole('button', { name: "Don't track me" }));
    expect(session.start).not.toHaveBeenCalled();
    expect(storage.getItem(ANALYTICS_CONSENT_KEY)).toBe('denied');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('starts tracking on load when consent was already granted', async () => {
    const session = mockSession();
    render(
      <AnalyticsConsentRoot
        config={enabledConfig}
        storage={memoryStorage({ [ANALYTICS_CONSENT_KEY]: 'granted' })}
        session={session}
      >
        <p>App</p>
      </AnalyticsConsentRoot>
    );
    await waitFor(() => expect(session.start).toHaveBeenCalledWith(enabledConfig));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('still asks when the product token is missing, but does not start tracking', () => {
    const storage = memoryStorage();
    const session = mockSession();
    render(
      <AnalyticsConsentRoot config={{ enabled: false }} storage={storage} session={session}>
        <p>App</p>
      </AnalyticsConsentRoot>
    );
    expect(screen.getByRole('dialog', { name: /help us improve archlens/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Help improve ArchLens' }));
    expect(session.start).not.toHaveBeenCalled();
    expect(storage.getItem(ANALYTICS_CONSENT_KEY)).toBe('granted');
  });
});

describe('AnalyticsPreference', () => {
  it('lets a granted visitor stop tracking', () => {
    const session = mockSession();
    render(
      <AnalyticsConsentRoot
        config={enabledConfig}
        storage={memoryStorage({ [ANALYTICS_CONSENT_KEY]: 'granted' })}
        session={session}
      >
        <AnalyticsPreference />
      </AnalyticsConsentRoot>
    );
    expect(screen.getByTestId('analytics-preference')).toHaveTextContent(/opted in/i);
    fireEvent.click(screen.getByRole('button', { name: 'Stop tracking' }));
    expect(session.stop).toHaveBeenCalled();
  });
});
