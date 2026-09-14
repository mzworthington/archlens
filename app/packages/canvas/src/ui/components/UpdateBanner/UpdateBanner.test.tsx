import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateBanner } from './UpdateBanner';

const {
  swUpdate,
  updateServiceWorker,
  setNeedRefresh,
  hasRemoteBuildUpdate,
  reloadWithoutServiceWorker,
} = vi.hoisted(() => ({
  swUpdate: vi.fn().mockResolvedValue(undefined),
  updateServiceWorker: vi.fn(),
  setNeedRefresh: vi.fn(),
  hasRemoteBuildUpdate: vi.fn().mockResolvedValue(false),
  reloadWithoutServiceWorker: vi.fn().mockResolvedValue(undefined),
}));

let needRefresh = false;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options?: {
    onRegisteredSW?: (
      url: string,
      registration?: Pick<ServiceWorkerRegistration, 'update'>
    ) => void;
  }) => {
    options?.onRegisteredSW?.('/sw.js', { update: swUpdate });
    return {
      needRefresh: [needRefresh, setNeedRefresh],
      updateServiceWorker,
    };
  },
}));

vi.mock('../../../application/pwa/buildInfo', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../application/pwa/buildInfo')>();
  return { ...actual, hasRemoteBuildUpdate };
});

vi.mock('../../../application/pwa/requestServiceWorkerUpdate', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../../../application/pwa/requestServiceWorkerUpdate')>();
  return { ...actual, reloadWithoutServiceWorker };
});

describe('UpdateBanner', () => {
  beforeEach(() => {
    needRefresh = false;
    updateServiceWorker.mockClear();
    setNeedRefresh.mockClear();
    swUpdate.mockClear();
    hasRemoteBuildUpdate.mockReset().mockResolvedValue(false);
    reloadWithoutServiceWorker.mockClear();
  });

  it('is hidden when no update is pending', () => {
    render(<UpdateBanner />);
    expect(screen.queryByTestId('update-banner')).toBeNull();
  });

  it('asks the registered service worker to check for updates on mount', () => {
    render(<UpdateBanner />);
    expect(swUpdate).toHaveBeenCalled();
  });

  it('shows refresh prompt when the service worker reports an update', () => {
    needRefresh = true;
    render(<UpdateBanner />);
    expect(screen.getByTestId('update-banner')).toHaveTextContent(/new version/i);
    fireEvent.click(screen.getByRole('button', { name: /^Refresh$/i }));
    expect(updateServiceWorker).toHaveBeenCalledWith(false);
    expect(reloadWithoutServiceWorker).toHaveBeenCalled();
  });

  it('dismisses the banner when Later is clicked', () => {
    needRefresh = true;
    const { rerender } = render(<UpdateBanner />);
    fireEvent.click(screen.getByRole('button', { name: /^Later$/i }));
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
    needRefresh = false;
    rerender(<UpdateBanner />);
    expect(screen.queryByTestId('update-banner')).toBeNull();
  });

  it('drops a stale service worker when Refresh is only from a remote build mismatch', async () => {
    hasRemoteBuildUpdate.mockResolvedValue(true);
    render(<UpdateBanner />);
    fireEvent.click(await screen.findByRole('button', { name: /^Refresh$/i }));
    expect(reloadWithoutServiceWorker).toHaveBeenCalled();
    expect(updateServiceWorker).toHaveBeenCalledWith(false);
  });

  it('hard-reloads even when the waiting worker never takes control', () => {
    needRefresh = true;
    render(<UpdateBanner />);
    fireEvent.click(screen.getByRole('button', { name: /^Refresh$/i }));
    expect(reloadWithoutServiceWorker).toHaveBeenCalled();
    expect(updateServiceWorker).not.toHaveBeenCalledWith(true);
  });
});
