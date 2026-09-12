import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlueprintStore } from '../../../application/store/store';
import { AppNotificationToast } from './AppNotificationToast';

describe('AppNotificationToast', () => {
  beforeEach(() => {
    useBlueprintStore.setState({ notification: null, setNotification: vi.fn() });
  });

  it('renders named keyboard-reachable toast actions', () => {
    const onCopyInstall = vi.fn();
    const onCopyScan = vi.fn();
    useBlueprintStore.setState({
      notification: {
        type: 'info',
        title: 'Browser lite scan ready',
        message: 'Loaded 2 source file(s) - structure only (no TraceLens/git hotspots).',
        actions: [
          { label: 'Copy install command', onClick: onCopyInstall },
          { label: 'Copy scan command', onClick: onCopyScan },
        ],
      },
    });

    render(<AppNotificationToast />);

    const install = screen.getByRole('button', { name: 'Copy install command' });
    const scan = screen.getByRole('button', { name: 'Copy scan command' });
    expect(install).toHaveAttribute('type', 'button');
    expect(scan).toHaveAttribute('type', 'button');
    install.focus();
    expect(install).toHaveFocus();

    fireEvent.click(install);
    fireEvent.click(scan);
    expect(onCopyInstall).toHaveBeenCalledTimes(1);
    expect(onCopyScan).toHaveBeenCalledTimes(1);
  });
});
