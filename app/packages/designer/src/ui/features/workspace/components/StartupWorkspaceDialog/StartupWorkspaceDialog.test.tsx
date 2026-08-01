import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StartupWorkspaceDialog } from './StartupWorkspaceDialog';

describe('StartupWorkspaceDialog', () => {
  it('renders sample and open-directory choices when open', () => {
    render(<StartupWorkspaceDialog isOpen onOpenSample={vi.fn()} onOpenDirectory={vi.fn()} />);

    expect(screen.getByTestId('startup-workspace-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-open-sample')).toHaveTextContent(/Open demo blueprints/i);
    expect(screen.getByTestId('workspace-open-directory')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(
      <StartupWorkspaceDialog isOpen={false} onOpenSample={vi.fn()} onOpenDirectory={vi.fn()} />
    );

    expect(screen.queryByTestId('startup-workspace-dialog')).not.toBeInTheDocument();
  });

  it('invokes handlers from the embedded entry panel', () => {
    const onOpenSample = vi.fn();
    const onOpenDirectory = vi.fn();

    render(
      <StartupWorkspaceDialog
        isOpen
        onOpenSample={onOpenSample}
        onOpenDirectory={onOpenDirectory}
      />
    );

    fireEvent.click(screen.getByTestId('workspace-open-sample'));
    fireEvent.click(screen.getByTestId('workspace-open-directory'));

    expect(onOpenSample).toHaveBeenCalledTimes(1);
    expect(onOpenDirectory).toHaveBeenCalledTimes(1);
  });
});
