import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrowserLiteScanProgress } from './BrowserLiteScanProgress';
import type { LiteScanProgress } from '../../../application/analysis/liteScanProgress';

const reading: LiteScanProgress = {
  phase: 'reading',
  filesScanned: 147,
  fileCap: 300,
  bytesRead: 2_000_000,
  byteCap: 8_000_000,
};

describe('BrowserLiteScanProgress', () => {
  it('shows files versus cap, binding byte budget and a named cancel control', () => {
    const onCancel = vi.fn();
    render(<BrowserLiteScanProgress progress={reading} onCancel={onCancel} />);

    expect(screen.getByRole('status', { name: /Reading source files/i })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '147 / 300 files' })).toHaveAttribute(
      'aria-valuenow',
      '147'
    );
    expect(screen.getByTestId('browser-lite-scan-progress-bytes')).toHaveTextContent(
      '2.0 MB of 8.0 MB'
    );
    expect(screen.getByText(/Structure only/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel scan' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('hides the byte line while still discovering files', () => {
    render(
      <BrowserLiteScanProgress
        progress={{ ...reading, phase: 'walking', filesScanned: 12, bytesRead: 0 }}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByTestId('browser-lite-scan-progress-bytes')).not.toBeInTheDocument();
    expect(screen.getByTestId('browser-lite-scan-progress-files')).toHaveTextContent(
      '12 files found (cap 300)'
    );
  });
});
