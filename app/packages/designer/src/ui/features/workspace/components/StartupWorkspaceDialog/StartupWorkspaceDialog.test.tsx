import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StartupWorkspaceDialog } from './StartupWorkspaceDialog';
import { WORKSPACE_STARTUP } from '../../../../content/productOutcomes';

describe('StartupWorkspaceDialog', () => {
  it('renders sandbox and open-directory choices when open', () => {
    render(<StartupWorkspaceDialog isOpen onLoadSandbox={vi.fn()} onOpenDirectory={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: WORKSPACE_STARTUP.title })).toBeInTheDocument();
    expect(screen.getByTestId('startup-load-sandbox')).toHaveTextContent(/Load sandbox/i);
    expect(screen.getByTestId('startup-open-directory')).toHaveTextContent(
      /Open workspace from directory/i
    );
    expect(screen.getByTestId('startup-cli-panel')).toHaveTextContent(
      /Generate from your codebase/i
    );
    expect(screen.queryByTestId('startup-import-mermaid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('startup-import-iac')).not.toBeInTheDocument();
  });

  it('does not expose the dialog when closed', () => {
    render(
      <StartupWorkspaceDialog isOpen={false} onLoadSandbox={vi.fn()} onOpenDirectory={vi.fn()} />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('invokes the matching handler for each choice', () => {
    const onLoadSandbox = vi.fn();
    const onOpenDirectory = vi.fn();

    render(
      <StartupWorkspaceDialog
        isOpen
        onLoadSandbox={onLoadSandbox}
        onOpenDirectory={onOpenDirectory}
      />
    );

    fireEvent.click(screen.getByTestId('startup-load-sandbox'));
    fireEvent.click(screen.getByTestId('startup-open-directory'));

    expect(onLoadSandbox).toHaveBeenCalledTimes(1);
    expect(onOpenDirectory).toHaveBeenCalledTimes(1);
  });
});
