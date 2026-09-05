import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

  it('names a save action when the scan map is still in memory', () => {
    const onSaveMap = vi.fn();
    render(<BrowserLiteScanBanner open showSave onSaveMap={onSaveMap} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save map to folder' }));
    expect(onSaveMap).toHaveBeenCalledTimes(1);
  });
});
