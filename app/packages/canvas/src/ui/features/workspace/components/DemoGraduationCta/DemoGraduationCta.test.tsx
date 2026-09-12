import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CLI_INSTALL_COMMAND, CLI_SCAN_COMMAND } from '../../../../../constants/cli';
import { DEMO_GRADUATION } from '../../../../content/demoGraduation';
import { DemoGraduationCta } from './DemoGraduationCta';

describe('DemoGraduationCta', () => {
  it('shows named secondary actions after demo advice and keeps git/CI on the CLI', () => {
    const onScanRepo = vi.fn();
    render(<DemoGraduationCta onScanRepo={onScanRepo} />);

    const scan = screen.getByRole('button', { name: DEMO_GRADUATION.scanBrowser });
    const unlock = screen.getByRole('button', { name: DEMO_GRADUATION.unlockCli });
    expect(scan).toBeEnabled();
    expect(unlock).toBeEnabled();
    expect(scan).toHaveAttribute('type', 'button');
    expect(unlock).toHaveAttribute('type', 'button');

    scan.focus();
    expect(scan).toHaveFocus();
    unlock.focus();
    expect(unlock).toHaveFocus();

    fireEvent.click(scan);
    expect(onScanRepo).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId('demo-graduation')).toHaveTextContent(/structure-only/i);
    expect(screen.getByTestId('demo-graduation').textContent?.toLowerCase()).not.toMatch(
      /git hotspots in the browser/
    );
    expect(screen.getByTestId('demo-graduation').textContent?.toLowerCase()).not.toMatch(
      /ci publish in the browser/
    );
  });

  it('reveals copyable CLI install and scan commands without leaving the canvas', () => {
    render(<DemoGraduationCta onScanRepo={vi.fn()} />);

    expect(screen.queryByTestId('demo-graduation-cli-install')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: DEMO_GRADUATION.unlockCli }));

    expect(screen.getByTestId('demo-graduation-unlock-cli')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByTestId('demo-graduation-cli-install')).toHaveTextContent(
      CLI_INSTALL_COMMAND
    );
    expect(screen.getByTestId('demo-graduation-cli-scan')).toHaveTextContent(CLI_SCAN_COMMAND);
    expect(screen.getByRole('button', { name: 'Copy install command' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Copy scan command' })).toBeEnabled();
  });
});
