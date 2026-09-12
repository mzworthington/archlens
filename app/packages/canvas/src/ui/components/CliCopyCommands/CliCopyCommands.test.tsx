import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLI_INSTALL_COMMAND, CLI_SCAN_COMMAND } from '../../../constants/cli';
import { CliCopyCommands } from './CliCopyCommands';

describe('CliCopyCommands', () => {
  const writeText = vi.fn(async () => undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('exposes named copy actions for install and scan without claiming browser forensics', async () => {
    render(<CliCopyCommands testIdPrefix="cli-copy" />);

    expect(screen.getByTestId('cli-copy-install')).toHaveTextContent(CLI_INSTALL_COMMAND);
    expect(screen.getByTestId('cli-copy-scan')).toHaveTextContent(CLI_SCAN_COMMAND);

    fireEvent.click(screen.getByRole('button', { name: 'Copy install command' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy scan command' }));

    expect(writeText).toHaveBeenCalledWith(CLI_INSTALL_COMMAND);
    expect(writeText).toHaveBeenCalledWith(CLI_SCAN_COMMAND);
    expect(screen.getByTestId('cli-copy')).not.toHaveTextContent(/in the browser/i);
    expect(screen.getByTestId('cli-copy')).not.toHaveTextContent(/CI publish in the browser/i);
  });
});
