import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StartupWorkspaceDialog } from './StartupWorkspaceDialog';
import { useDirectoryPickerStub } from '../../../../../test/stubDirectoryPicker';

describe('StartupWorkspaceDialog', () => {
  useDirectoryPickerStub();

  it('renders intent buckets with sample strip when open', () => {
    render(
      <StartupWorkspaceDialog
        isOpen
        onOpenSample={vi.fn()}
        onOpenDirectory={vi.fn()}
        onBrowserLiteScan={vi.fn()}
        onImportMermaid={vi.fn()}
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
    expect(screen.queryByTestId('workspace-import-iac')).not.toBeInTheDocument();
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
    expect(screen.getByTestId('workspace-share-open')).toContainElement(
      screen.getByTestId('workspace-share-directory')
    );
  });

  it('renders nothing when closed', () => {
    render(
      <StartupWorkspaceDialog isOpen={false} onOpenSample={vi.fn()} onOpenDirectory={vi.fn()} />
    );

    expect(screen.queryByTestId('startup-workspace-dialog')).not.toBeInTheDocument();
  });

  it('forwards ZIP upload from the embedded entry panel', () => {
    const onBrowserLiteScanZip = vi.fn();
    render(
      <StartupWorkspaceDialog
        isOpen
        onOpenSample={vi.fn()}
        onOpenDirectory={vi.fn()}
        onBrowserLiteScan={vi.fn()}
        onBrowserLiteScanZip={onBrowserLiteScanZip}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Upload ZIP' }));
    expect(onBrowserLiteScanZip).toHaveBeenCalledTimes(1);
  });

  it('surfaces sandbox loading feedback while open is in progress', () => {
    render(
      <StartupWorkspaceDialog
        isOpen
        onOpenSample={vi.fn()}
        onOpenDirectory={vi.fn()}
        onBrowserLiteScan={vi.fn()}
        onImportMermaid={vi.fn()}
        onStartBlankCanvas={vi.fn()}
        onShareBlankCanvas={vi.fn()}
        loadingMessage="Loading sandbox..."
      />
    );

    expect(screen.getByTestId('workspace-entry-loading')).toHaveTextContent(/Loading sandbox/i);
    expect(screen.getByTestId('workspace-open-sample')).toBeDisabled();
    expect(screen.getByTestId('workspace-import-mermaid')).toBeDisabled();
    expect(screen.getByTestId('workspace-start-blank')).toBeDisabled();
    expect(screen.getByTestId('workspace-share-blank')).toBeDisabled();
  });
});
