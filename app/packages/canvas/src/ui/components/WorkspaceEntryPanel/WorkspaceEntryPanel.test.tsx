import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { WorkspaceEntryPanel } from './WorkspaceEntryPanel';
import { WORKSPACE_STARTUP } from '../../content/productOutcomes';

describe('WorkspaceEntryPanel', () => {
  let originalPicker: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalPicker = Object.getOwnPropertyDescriptor(window, 'showDirectoryPicker');
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    if (originalPicker) {
      Object.defineProperty(window, 'showDirectoryPicker', originalPicker);
    } else {
      Reflect.deleteProperty(window, 'showDirectoryPicker');
    }
  });

  it('renders the sample strip above Investigate / Collaborate / Ideate as a horizontal row', () => {
    render(
      <WorkspaceEntryPanel
        onOpenSample={vi.fn()}
        onOpenDirectory={vi.fn()}
        onBrowserLiteScan={vi.fn()}
        onImportMermaid={vi.fn()}
        onImportIac={vi.fn()}
        onStartBlankCanvas={vi.fn()}
        onShareBlankCanvas={vi.fn()}
        onShareDirectory={vi.fn()}
        onShareFile={vi.fn()}
        showCliPanel
      />
    );

    expect(screen.getByRole('heading', { name: WORKSPACE_STARTUP.title })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-intent-investigate')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-intent-collaborate')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-intent-ideate')).toBeInTheDocument();

    expect(screen.getByTestId('workspace-browser-lite-scan')).toHaveTextContent(
      /Browser lite scan/i
    );
    expect(screen.getByTestId('workspace-open-directory')).toHaveTextContent(
      /Open existing blueprints folder/i
    );
    expect(screen.getByTestId('workspace-import-mermaid')).toHaveTextContent(
      /Import from Mermaid/i
    );
    expect(screen.getByTestId('workspace-intent-ideate')).toContainElement(
      screen.getByTestId('workspace-import-mermaid')
    );
    expect(screen.getByTestId('workspace-import-iac')).toHaveTextContent(/Import infrastructure/i);
    expect(screen.getByTestId('workspace-share-blank')).toHaveTextContent(/Share blank room/i);
    expect(screen.getByTestId('workspace-share-directory')).toHaveTextContent(
      /Open folder then share/i
    );
    expect(screen.getByTestId('workspace-share-file')).toHaveTextContent(/Open file then share/i);
    expect(screen.getByTestId('workspace-start-blank')).toHaveTextContent(/Start a blank canvas/i);

    const sample = screen.getByTestId('workspace-open-sample');
    const cli = screen.getByTestId('workspace-cli-panel');
    expect(sample).toHaveTextContent(/Try the demo/i);
    expect(cli).toHaveTextContent(/Full analysis - ArchLens CLI/i);
    expect(sample.compareDocumentPosition(cli)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(cli.compareDocumentPosition(screen.getByTestId('workspace-intent-investigate'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(screen.getByTestId('workspace-intent-investigate')).not.toContainElement(cli);
    expect(screen.getByTestId('workspace-intent-row')).toHaveClass(
      'sm:grid-cols-3',
      'items-stretch'
    );
    expect(screen.getByTestId('workspace-intent-investigate')).toHaveClass('h-full');
    expect(screen.getByTestId('workspace-intent-collaborate')).toHaveClass('h-full');
    expect(screen.getByTestId('workspace-intent-ideate')).toHaveClass('h-full');
    for (const name of ['Investigate', 'Collaborate', 'Ideate']) {
      expect(screen.getByRole('heading', { name })).toHaveClass('text-xl', 'font-bold');
    }
  });

  it('hides Collaborate when no share handlers are provided', () => {
    render(
      <WorkspaceEntryPanel
        onOpenSample={vi.fn()}
        onOpenDirectory={vi.fn()}
        onStartBlankCanvas={vi.fn()}
      />
    );

    expect(screen.queryByTestId('workspace-intent-collaborate')).not.toBeInTheDocument();
    expect(screen.getByTestId('workspace-intent-ideate')).toBeInTheDocument();
  });

  it('shows a collapsed CLI panel that expands on toggle', () => {
    render(<WorkspaceEntryPanel onOpenSample={vi.fn()} onOpenDirectory={vi.fn()} showCliPanel />);

    expect(screen.getByTestId('workspace-cli-panel')).toHaveTextContent(
      /Full analysis - ArchLens CLI/i
    );
    expect(screen.queryByTestId('workspace-cli-panel-body')).not.toBeInTheDocument();
    expect(screen.getByTestId('workspace-cli-panel-toggle')).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    fireEvent.click(screen.getByTestId('workspace-cli-panel-toggle'));
    expect(screen.getByTestId('workspace-cli-panel-body')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-cli-panel-toggle')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('surfaces unsupported-browser feedback for lite scan when folder picker is missing', () => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: undefined,
    });

    const onBrowserLiteScan = vi.fn();
    render(
      <WorkspaceEntryPanel
        onOpenSample={vi.fn()}
        onOpenDirectory={vi.fn()}
        onBrowserLiteScan={onBrowserLiteScan}
        showCliPanel
      />
    );

    expect(screen.getByTestId('workspace-browser-lite-unsupported')).toHaveTextContent(
      /Firefox and Safari/i
    );
    expect(screen.getByTestId('workspace-browser-lite-unavailable-badge')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workspace-browser-lite-scan'));
    expect(onBrowserLiteScan).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('workspace-browser-lite-feedback')).toHaveTextContent(
      /not available in this browser/i
    );
    expect(screen.getByTestId('workspace-cli-panel-body')).toBeInTheDocument();
  });

  it('invokes the matching handler for each choice', () => {
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
      <WorkspaceEntryPanel
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

  it('shows loading feedback and disables actions while sandbox opens', () => {
    const onOpenSample = vi.fn();
    const onOpenDirectory = vi.fn();
    const onBrowserLiteScan = vi.fn();
    const onImportMermaid = vi.fn();
    const onImportIac = vi.fn();
    const onStartBlankCanvas = vi.fn();
    const onShareBlankCanvas = vi.fn();

    render(
      <WorkspaceEntryPanel
        onOpenSample={onOpenSample}
        onOpenDirectory={onOpenDirectory}
        onBrowserLiteScan={onBrowserLiteScan}
        onImportMermaid={onImportMermaid}
        onImportIac={onImportIac}
        onStartBlankCanvas={onStartBlankCanvas}
        onShareBlankCanvas={onShareBlankCanvas}
        loadingMessage="Loading sandbox..."
      />
    );

    expect(screen.getByTestId('workspace-entry-loading')).toHaveTextContent(/Loading sandbox/i);
    expect(screen.getByTestId('workspace-open-sample')).toBeDisabled();
    expect(screen.getByTestId('workspace-browser-lite-scan')).toBeDisabled();
    expect(screen.getByTestId('workspace-open-directory')).toBeDisabled();
    expect(screen.getByTestId('workspace-import-mermaid')).toBeDisabled();
    expect(screen.getByTestId('workspace-import-iac')).toBeDisabled();
    expect(screen.getByTestId('workspace-start-blank')).toBeDisabled();
    expect(screen.getByTestId('workspace-share-blank')).toBeDisabled();

    fireEvent.click(screen.getByTestId('workspace-open-sample'));
    fireEvent.click(screen.getByTestId('workspace-share-blank'));
    expect(onOpenSample).not.toHaveBeenCalled();
    expect(onShareBlankCanvas).not.toHaveBeenCalled();
  });
});
