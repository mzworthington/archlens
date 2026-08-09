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

  it('renders demo, browser lite scan, and open-directory actions', () => {
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
      /Browser lite scan/i
    );
    expect(screen.getByTestId('workspace-browser-lite-badge')).toHaveTextContent(/Lite/i);
    expect(screen.queryByTestId('workspace-browser-lite-unsupported')).not.toBeInTheDocument();
    expect(screen.getByTestId('workspace-open-directory')).toHaveTextContent(
      /Open existing blueprints folder/i
    );
    expect(screen.queryByTestId('workspace-start-blank')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workspace-cli-panel')).not.toBeInTheDocument();
  });

  it('renders blank-canvas action when provided', () => {
    render(
      <WorkspaceEntryPanel
        onOpenSample={vi.fn()}
        onOpenDirectory={vi.fn()}
        onStartBlankCanvas={vi.fn()}
      />
    );

    expect(screen.getByTestId('workspace-start-blank')).toHaveTextContent(/Start a blank canvas/i);
  });

  it('shows an expanded CLI panel when requested', () => {
    render(<WorkspaceEntryPanel onOpenSample={vi.fn()} onOpenDirectory={vi.fn()} showCliPanel />);

    expect(screen.getByTestId('workspace-cli-panel')).toHaveTextContent(
      /Full analysis - ArchLens CLI/i
    );
    expect(screen.getByTestId('workspace-cli-panel-body')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workspace-cli-panel-toggle'));
    expect(screen.queryByTestId('workspace-cli-panel-body')).not.toBeInTheDocument();
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
    const onStartBlankCanvas = vi.fn();

    render(
      <WorkspaceEntryPanel
        onOpenSample={onOpenSample}
        onOpenDirectory={onOpenDirectory}
        onBrowserLiteScan={onBrowserLiteScan}
        onStartBlankCanvas={onStartBlankCanvas}
      />
    );

    fireEvent.click(screen.getByTestId('workspace-open-sample'));
    fireEvent.click(screen.getByTestId('workspace-browser-lite-scan'));
    fireEvent.click(screen.getByTestId('workspace-open-directory'));
    fireEvent.click(screen.getByTestId('workspace-start-blank'));

    expect(onOpenSample).toHaveBeenCalledTimes(1);
    expect(onBrowserLiteScan).toHaveBeenCalledTimes(1);
    expect(onOpenDirectory).toHaveBeenCalledTimes(1);
    expect(onStartBlankCanvas).toHaveBeenCalledTimes(1);
  });

  it('shows loading feedback and disables actions while sandbox opens', () => {
    const onOpenSample = vi.fn();
    const onOpenDirectory = vi.fn();
    const onBrowserLiteScan = vi.fn();
    const onStartBlankCanvas = vi.fn();

    render(
      <WorkspaceEntryPanel
        onOpenSample={onOpenSample}
        onOpenDirectory={onOpenDirectory}
        onBrowserLiteScan={onBrowserLiteScan}
        onStartBlankCanvas={onStartBlankCanvas}
        loadingMessage="Loading sandbox..."
      />
    );

    expect(screen.getByTestId('workspace-entry-loading')).toHaveTextContent(/Loading sandbox/i);
    expect(screen.getByTestId('workspace-open-sample')).toBeDisabled();
    expect(screen.getByTestId('workspace-browser-lite-scan')).toBeDisabled();
    expect(screen.getByTestId('workspace-open-directory')).toBeDisabled();
    expect(screen.getByTestId('workspace-start-blank')).toBeDisabled();

    fireEvent.click(screen.getByTestId('workspace-open-sample'));
    fireEvent.click(screen.getByTestId('workspace-browser-lite-scan'));
    fireEvent.click(screen.getByTestId('workspace-open-directory'));
    fireEvent.click(screen.getByTestId('workspace-start-blank'));
    expect(onOpenSample).not.toHaveBeenCalled();
    expect(onBrowserLiteScan).not.toHaveBeenCalled();
    expect(onOpenDirectory).not.toHaveBeenCalled();
    expect(onStartBlankCanvas).not.toHaveBeenCalled();
  });
});
