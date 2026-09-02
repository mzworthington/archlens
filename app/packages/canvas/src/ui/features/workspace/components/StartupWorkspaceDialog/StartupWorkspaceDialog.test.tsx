import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StartupWorkspaceDialog } from './StartupWorkspaceDialog';

describe('StartupWorkspaceDialog', () => {
  it('renders intent buckets with sample strip when open', () => {
    render(
      <StartupWorkspaceDialog
        isOpen
        onOpenSample={vi.fn()}
        onOpenDirectory={vi.fn()}
        onBrowserLiteScan={vi.fn()}
        onImportMermaid={vi.fn()}
        onImportIac={vi.fn()}
        onStartBlankCanvas={vi.fn()}
        onShareBlankCanvas={vi.fn()}
        onShareDirectory={vi.fn()}
        onShareFile={vi.fn()}
      />
    );

    expect(screen.getByTestId('startup-workspace-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-intent-investigate')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-intent-collaborate')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-intent-ideate')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-open-sample')).toHaveTextContent(/Try the demo/i);
    expect(screen.getByTestId('workspace-browser-lite-scan')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-import-iac')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-share-blank')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-start-blank')).toHaveTextContent(/blank canvas/i);
    expect(screen.getByTestId('workspace-intent-ideate')).toContainElement(
      screen.getByTestId('workspace-import-mermaid')
    );
    expect(
      screen
        .getByTestId('workspace-open-sample')
        .compareDocumentPosition(screen.getByTestId('workspace-intent-investigate'))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByTestId('workspace-intent-row')).toHaveClass('sm:grid-cols-3');
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
    const onImportMermaid = vi.fn();
    const onImportIac = vi.fn();
    const onStartBlankCanvas = vi.fn();
    const onShareBlankCanvas = vi.fn();
    const onShareDirectory = vi.fn();
    const onShareFile = vi.fn();

    render(
      <StartupWorkspaceDialog
        isOpen
        onOpenSample={onOpenSample}
        onOpenDirectory={onOpenDirectory}
        onBrowserLiteScan={onBrowserLiteScan}
        onImportMermaid={onImportMermaid}
        onImportIac={onImportIac}
        onStartBlankCanvas={onStartBlankCanvas}
        onShareBlankCanvas={onShareBlankCanvas}
        onShareDirectory={onShareDirectory}
        onShareFile={onShareFile}
      />
    );

    fireEvent.click(screen.getByTestId('workspace-open-sample'));
    fireEvent.click(screen.getByTestId('workspace-browser-lite-scan'));
    fireEvent.click(screen.getByTestId('workspace-open-directory'));
    fireEvent.click(screen.getByTestId('workspace-import-mermaid'));
    fireEvent.click(screen.getByTestId('workspace-import-iac'));
    fireEvent.click(screen.getByTestId('workspace-start-blank'));
    fireEvent.click(screen.getByTestId('workspace-share-blank'));
    fireEvent.click(screen.getByTestId('workspace-share-directory'));
    fireEvent.click(screen.getByTestId('workspace-share-file'));

    expect(onOpenSample).toHaveBeenCalledTimes(1);
    expect(onBrowserLiteScan).toHaveBeenCalledTimes(1);
    expect(onOpenDirectory).toHaveBeenCalledTimes(1);
    expect(onImportMermaid).toHaveBeenCalledTimes(1);
    expect(onImportIac).toHaveBeenCalledTimes(1);
    expect(onStartBlankCanvas).toHaveBeenCalledTimes(1);
    expect(onShareBlankCanvas).toHaveBeenCalledTimes(1);
    expect(onShareDirectory).toHaveBeenCalledTimes(1);
    expect(onShareFile).toHaveBeenCalledTimes(1);
  });

  it('surfaces sandbox loading feedback while open is in progress', () => {
    render(
      <StartupWorkspaceDialog
        isOpen
        onOpenSample={vi.fn()}
        onOpenDirectory={vi.fn()}
        onBrowserLiteScan={vi.fn()}
        onImportMermaid={vi.fn()}
        onImportIac={vi.fn()}
        onStartBlankCanvas={vi.fn()}
        onShareBlankCanvas={vi.fn()}
        loadingMessage="Loading sandbox..."
      />
    );

    expect(screen.getByTestId('workspace-entry-loading')).toHaveTextContent(/Loading sandbox/i);
    expect(screen.getByTestId('workspace-open-sample')).toBeDisabled();
    expect(screen.getByTestId('workspace-import-mermaid')).toBeDisabled();
    expect(screen.getByTestId('workspace-import-iac')).toBeDisabled();
    expect(screen.getByTestId('workspace-start-blank')).toBeDisabled();
    expect(screen.getByTestId('workspace-share-blank')).toBeDisabled();
  });
});
