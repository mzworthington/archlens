import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceEntryPanel } from './WorkspaceEntryPanel';
import { WORKSPACE_STARTUP } from '../../content/productOutcomes';

describe('WorkspaceEntryPanel', () => {
  it('renders demo, browser scan, and open-directory actions', () => {
    render(
      <WorkspaceEntryPanel
        onOpenSample={vi.fn()}
        onOpenDirectory={vi.fn()}
        onBrowserLiteScan={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: WORKSPACE_STARTUP.title })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-open-sample')).toHaveTextContent(/Try the demo/i);
    expect(screen.getByTestId('workspace-browser-lite-scan')).toHaveTextContent(
      /Scan my repo in the browser/i
    );
    expect(screen.getByTestId('workspace-open-directory')).toHaveTextContent(
      /Open existing blueprints folder/i
    );
    expect(screen.queryByTestId('workspace-cli-panel')).not.toBeInTheDocument();
  });

  it('shows a collapsed CLI panel when requested', () => {
    render(<WorkspaceEntryPanel onOpenSample={vi.fn()} onOpenDirectory={vi.fn()} showCliPanel />);

    expect(screen.getByTestId('workspace-cli-panel')).toHaveTextContent(
      /Need git hotspots or CI publish/i
    );
    expect(screen.queryByTestId('workspace-cli-panel-body')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workspace-cli-panel-toggle'));
    expect(screen.getByTestId('workspace-cli-panel-body')).toBeInTheDocument();
  });

  it('invokes the matching handler for each choice', () => {
    const onOpenSample = vi.fn();
    const onOpenDirectory = vi.fn();
    const onBrowserLiteScan = vi.fn();

    render(
      <WorkspaceEntryPanel
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

  it('shows loading feedback and disables actions while sandbox opens', () => {
    const onOpenSample = vi.fn();
    const onOpenDirectory = vi.fn();
    const onBrowserLiteScan = vi.fn();

    render(
      <WorkspaceEntryPanel
        onOpenSample={onOpenSample}
        onOpenDirectory={onOpenDirectory}
        onBrowserLiteScan={onBrowserLiteScan}
        loadingMessage="Loading sandbox..."
      />
    );

    expect(screen.getByTestId('workspace-entry-loading')).toHaveTextContent(/Loading sandbox/i);
    expect(screen.getByTestId('workspace-open-sample')).toBeDisabled();
    expect(screen.getByTestId('workspace-browser-lite-scan')).toBeDisabled();
    expect(screen.getByTestId('workspace-open-directory')).toBeDisabled();

    fireEvent.click(screen.getByTestId('workspace-open-sample'));
    fireEvent.click(screen.getByTestId('workspace-browser-lite-scan'));
    fireEvent.click(screen.getByTestId('workspace-open-directory'));
    expect(onOpenSample).not.toHaveBeenCalled();
    expect(onBrowserLiteScan).not.toHaveBeenCalled();
    expect(onOpenDirectory).not.toHaveBeenCalled();
  });
});
