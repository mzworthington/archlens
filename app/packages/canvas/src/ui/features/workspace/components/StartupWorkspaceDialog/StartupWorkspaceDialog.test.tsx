import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StartupWorkspaceDialog } from './StartupWorkspaceDialog';

describe('StartupWorkspaceDialog', () => {
  it('renders demo, browser scan, and open-directory choices when open', () => {
    render(
      <StartupWorkspaceDialog
        isOpen
        onOpenSample={vi.fn()}
        onOpenDirectory={vi.fn()}
        onBrowserLiteScan={vi.fn()}
      />
    );

    expect(screen.getByTestId('startup-workspace-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-open-sample')).toHaveTextContent(/Try the demo/i);
    expect(screen.getByTestId('workspace-browser-lite-scan')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-open-directory')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(
      <StartupWorkspaceDialog isOpen={false} onOpenSample={vi.fn()} onOpenDirectory={vi.fn()} />
    );

    expect(screen.queryByTestId('startup-workspace-dialog')).not.toBeInTheDocument();
  });

  it('invokes handlers from the embedded entry panel', () => {
    const onOpenSample = vi.fn();
    const onOpenDirectory = vi.fn();
    const onBrowserLiteScan = vi.fn();

    render(
      <StartupWorkspaceDialog
        isOpen
        onOpenSample={onOpenSample}
        onOpenDirectory={onOpenDirectory}
        onBrowserLiteScan={onBrowserLiteScan}
      />
    );

    fireEvent.click(screen.getByTestId('workspace-open-sample'));
    fireEvent.click(screen.getByTestId('workspace-browser-lite-scan'));
    fireEvent.click(screen.getByTestId('workspace-open-directory'));

    expect(onOpenSample).toHaveBeenCalledTimes(1);
    expect(onBrowserLiteScan).toHaveBeenCalledTimes(1);
    expect(onOpenDirectory).toHaveBeenCalledTimes(1);
  });

  it('surfaces sandbox loading feedback while open is in progress', () => {
    render(
      <StartupWorkspaceDialog
        isOpen
        onOpenSample={vi.fn()}
        onOpenDirectory={vi.fn()}
        onBrowserLiteScan={vi.fn()}
        loadingMessage="Loading sandbox..."
      />
    );

    expect(screen.getByTestId('workspace-entry-loading')).toHaveTextContent(/Loading sandbox/i);
    expect(screen.getByTestId('workspace-open-sample')).toBeDisabled();
  });
});
