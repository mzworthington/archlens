import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CLI_INSTALL_COMMAND, CLI_SCAN_COMMAND } from '../../../../../constants/cli';
import { BrowserLiteScanBanner } from './BrowserLiteScanBanner';

describe('BrowserLiteScanBanner', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<BrowserLiteScanBanner open={false} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows lite vs CLI messaging and dismisses', () => {
    const onDismiss = vi.fn();
    render(<BrowserLiteScanBanner open onDismiss={onDismiss} />);

    expect(screen.getByTestId('browser-lite-scan-banner')).toHaveTextContent(/Browser lite scan/i);
    expect(screen.getByTestId('browser-lite-scan-banner')).toHaveTextContent(/Structure only/i);
    expect(screen.getByTestId('browser-lite-scan-banner-cli')).toHaveAttribute(
      'href',
      '/guide/getting-started'
    );

    fireEvent.click(screen.getByRole('button', { name: /Dismiss lite scan banner/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('offers a named save when the map is still in memory', () => {
    const onSaveMap = vi.fn();
    render(<BrowserLiteScanBanner open onDismiss={vi.fn()} onSaveMap={onSaveMap} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save map to folder' }));
    expect(onSaveMap).toHaveBeenCalledTimes(1);
  });

  it('lets the user copy install and scan commands on the canvas', () => {
    render(<BrowserLiteScanBanner open onDismiss={vi.fn()} />);

    const banner = screen.getByTestId('browser-lite-scan-banner');
    expect(banner).toHaveTextContent(/no TraceLens git hotspots or CI publish/i);
    expect(banner).toHaveTextContent(CLI_INSTALL_COMMAND);
    expect(banner).toHaveTextContent(CLI_SCAN_COMMAND);
    expect(screen.getByRole('button', { name: 'Copy install command' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Copy scan command' })).toBeEnabled();
    expect(banner.textContent?.toLowerCase()).not.toMatch(/git hotspots in the browser/);
    expect(banner.textContent?.toLowerCase()).not.toMatch(/ci publish in the browser/);
  });
});
