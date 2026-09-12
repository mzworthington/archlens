import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserLiteScanBanner } from './BrowserLiteScanBanner';

describe('BrowserLiteScanBanner', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<BrowserLiteScanBanner open={false} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows git-included messaging, copyable CLI commands and dismisses', () => {
    const onDismiss = vi.fn();
    render(<BrowserLiteScanBanner open onDismiss={onDismiss} gitStatus="included" />);

    expect(screen.getByTestId('browser-lite-scan-banner')).toHaveTextContent(/Git included/i);
    expect(screen.getByTestId('browser-lite-scan-banner')).toHaveTextContent(
      /TraceLens git hotspots are on this map/i
    );
    expect(screen.getByRole('button', { name: 'Copy install command' })).toBeInTheDocument();
    expect(screen.getByTestId('browser-lite-scan-banner-cli')).toHaveAttribute(
      'href',
      '/guide/getting-started'
    );

    fireEvent.click(screen.getByRole('button', { name: /Dismiss browser scan banner/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('says git could not be read without claiming the tab cannot do git', () => {
    render(<BrowserLiteScanBanner open onDismiss={vi.fn()} gitStatus="failed" />);
    expect(screen.getByTestId('browser-lite-scan-banner')).toHaveTextContent(/Git unread/i);
    expect(screen.getByTestId('browser-lite-scan-banner')).toHaveTextContent(
      /Git history could not be read/i
    );
    expect(screen.queryByText(/structure-only/i)).not.toBeInTheDocument();
  });

  it('offers a named save when the map is still in memory', () => {
    const onSaveMap = vi.fn();
    render(<BrowserLiteScanBanner open onDismiss={vi.fn()} onSaveMap={onSaveMap} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save map to folder' }));
    expect(onSaveMap).toHaveBeenCalledTimes(1);
  });
});
