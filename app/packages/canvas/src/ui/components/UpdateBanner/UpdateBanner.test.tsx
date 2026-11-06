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
let onNeedReload: (() => void) | undefined;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options?: {
    onNeedReload?: () => void;
    onRegisteredSW?: (
      url: string,
      registration?: Pick<ServiceWorkerRegistration, 'update'>
    ) => void;
  }) => {
    onNeedReload = options?.onNeedReload;
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
    onNeedReload = undefined;
    updateServiceWorker.mockClear();
    setNeedRefresh.mockClear();
    swUpdate.mockClear();
    hasRemoteBuildUpdate.mockReset().mockResolvedValue(false);
    reloadWithoutServiceWorker.mockReset().mockResolvedValue(undefined);
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

  it('shows Refreshing and ignores a second click while the reload is in progress', async () => {
    needRefresh = true;
    let release: () => void = () => {};
    reloadWithoutServiceWorker.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          release = resolve;
        })
    );
    render(<UpdateBanner />);
    fireEvent.click(screen.getByRole('button', { name: /^Refresh$/i }));
    const refreshing = await screen.findByRole('button', { name: /Refreshing/i });
    expect(refreshing).toBeDisabled();
    fireEvent.click(refreshing);
    expect(reloadWithoutServiceWorker).toHaveBeenCalledTimes(1);
    release();
  });

  it('hard-reloads even when the waiting worker never takes control', () => {
    needRefresh = true;
    render(<UpdateBanner />);
    fireEvent.click(screen.getByRole('button', { name: /^Refresh$/i }));
    expect(reloadWithoutServiceWorker).toHaveBeenCalled();
    expect(updateServiceWorker).not.toHaveBeenCalledWith(true);
  });

  it('drops the cache-bust query after load so the next deploy can wait for Refresh', () => {
    const replaceState = vi.fn();
    vi.stubGlobal('history', { replaceState });
    vi.stubGlobal('location', {
      pathname: '/guide/collaborate',
      search: '?al_refresh=1700000000000',
      hash: '',
    });
    render(<UpdateBanner />);
    expect(replaceState).toHaveBeenCalledWith(null, '', '/guide/collaborate');
    vi.unstubAllGlobals();
  });

  it('does not navigate when the controlling worker changes, so Refresh cannot reload in a loop', () => {
    needRefresh = true;
    render(<UpdateBanner />);
    expect(onNeedReload).toEqual(expect.any(Function));
    onNeedReload?.();
    onNeedReload?.();
    expect(reloadWithoutServiceWorker).not.toHaveBeenCalled();
  });

  it('cache-busts via history.replaceState so location.replace cannot open-redirect', () => {
    needRefresh = true;
    render(<UpdateBanner />);
    fireEvent.click(screen.getByRole('button', { name: /^Refresh$/i }));
    const [{ reload }] = reloadWithoutServiceWorker.mock.calls[0] as [{ reload: () => void }];
    const replace = vi.fn();
    const replaceState = vi.fn();
    const reloadLocation = vi.fn();
    vi.stubGlobal('history', { replaceState });
    vi.stubGlobal('location', {
      origin: 'https://archlens.dev',
      pathname: '/workspace',
      search: '?room=abc',
      hash: '#x',
      href: 'https://evil.example/phish',
      replace,
      reload: reloadLocation,
    });
    reload();
    expect(replaceState).toHaveBeenCalledWith(
      null,
      '',
      expect.stringMatching(/^\/workspace\?room=abc&al_refresh=\d+#x$/)
    );
    expect(reloadLocation).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
