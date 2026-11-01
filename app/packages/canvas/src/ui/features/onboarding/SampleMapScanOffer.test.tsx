import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlueprintStore } from '../../../application/store/store';
import { SampleMapScanOffer } from './SampleMapScanOffer';

const mockSetLocation = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/workspace/samples/golden-journey', mockSetLocation],
}));

vi.mock('@xyflow/react', () => ({
  Panel: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

const goldenJourneySchema = {
  name: 'Golden Journey',
  version: '4',
  level: 'container' as const,
  entityRef: 'samples/golden-journey',
  nodes: [],
  dependencies: [],
};

describe('SampleMapScanOffer', () => {
  beforeEach(() => {
    mockSetLocation.mockReset();
    useBlueprintStore.setState({
      isSampleWorkspace: true,
      isWorkspaceOpen: true,
      isResilienceMode: false,
      workspaceName: 'samples',
      schema: goldenJourneySchema,
      openBrowserLiteScan: vi.fn(async () => false),
    });
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('shows a keyboard-reachable scan control on the sample map and does not scan until used', () => {
    const openBrowserLiteScan = vi.fn(async () => false);
    useBlueprintStore.setState({ openBrowserLiteScan });
    render(<SampleMapScanOffer />);

    const scan = screen.getByRole('button', { name: 'Scan your repo' });
    expect(scan.tagName).toBe('BUTTON');
    expect(scan).not.toHaveAttribute('tabIndex', '-1');
    expect(screen.getByRole('button', { name: 'Upload a ZIP to scan' })).not.toHaveAttribute(
      'tabIndex',
      '-1'
    );
    expect(openBrowserLiteScan).not.toHaveBeenCalled();
    expect(useBlueprintStore.getState().isSampleWorkspace).toBe(true);
  });

  it('starts a folder scan from the control and leaves the sample when the picker is cancelled', async () => {
    const openBrowserLiteScan = vi.fn(async () => false);
    useBlueprintStore.setState({ openBrowserLiteScan });
    render(<SampleMapScanOffer />);

    fireEvent.click(screen.getByRole('button', { name: 'Scan your repo' }));
    expect(openBrowserLiteScan).toHaveBeenCalledWith();
    expect(useBlueprintStore.getState().isSampleWorkspace).toBe(true);
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it('starts a ZIP scan from the upload control and opens the scanned map', async () => {
    const openBrowserLiteScan = vi.fn(async () => {
      useBlueprintStore.setState({
        isWorkspaceOpen: true,
        isSampleWorkspace: false,
        schema: {
          ...goldenJourneySchema,
          entityRef: 'acme/checkout',
          name: 'Acme',
        },
        workspaceName: 'acme',
      });
      return true;
    });
    useBlueprintStore.setState({ openBrowserLiteScan });
    render(<SampleMapScanOffer />);

    const input = screen.getByTestId('sample-map-scan-zip-input');
    const zip = new File(['zip'], 'repo.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [zip] } });

    expect(openBrowserLiteScan).toHaveBeenCalledWith({ zipFile: zip });
    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/workspace/acme/checkout', { replace: true });
    });
  });

  it('is hidden off the golden-journey sample', () => {
    useBlueprintStore.setState({
      schema: { ...goldenJourneySchema, entityRef: 'samples', level: 'context', name: 'Samples' },
    });
    const { container } = render(<SampleMapScanOffer />);
    expect(container).toBeEmptyDOMElement();
  });
});
