import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateBanner } from './UpdateBanner';

const { swUpdate, updateServiceWorker, setNeedRefresh } = vi.hoisted(() => ({
  swUpdate: vi.fn().mockResolvedValue(undefined),
  updateServiceWorker: vi.fn(),
  setNeedRefresh: vi.fn(),
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

describe('UpdateBanner', () => {
  beforeEach(() => {
    needRefresh = false;
    updateServiceWorker.mockClear();
    setNeedRefresh.mockClear();
    swUpdate.mockClear();
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
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
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
});
