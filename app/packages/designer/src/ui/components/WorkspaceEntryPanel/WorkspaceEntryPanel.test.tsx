import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceEntryPanel } from './WorkspaceEntryPanel';
import { WORKSPACE_STARTUP } from '../../content/productOutcomes';

describe('WorkspaceEntryPanel', () => {
  it('renders sample and open-directory actions', () => {
    render(<WorkspaceEntryPanel onOpenSample={vi.fn()} onOpenDirectory={vi.fn()} />);

    expect(screen.getByRole('heading', { name: WORKSPACE_STARTUP.title })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-open-sample')).toHaveTextContent(/Open demo blueprints/i);
    expect(screen.getByTestId('workspace-open-directory')).toHaveTextContent(
      /Open workspace from directory/i
    );
    expect(screen.queryByTestId('workspace-cli-panel')).not.toBeInTheDocument();
  });

  it('shows the CLI panel when requested', () => {
    render(<WorkspaceEntryPanel onOpenSample={vi.fn()} onOpenDirectory={vi.fn()} showCliPanel />);

    expect(screen.getByTestId('workspace-cli-panel')).toHaveTextContent(
      /Generate from your codebase/i
    );
  });

  it('invokes the matching handler for each choice', () => {
    const onOpenSample = vi.fn();
    const onOpenDirectory = vi.fn();

    render(<WorkspaceEntryPanel onOpenSample={onOpenSample} onOpenDirectory={onOpenDirectory} />);

    fireEvent.click(screen.getByTestId('workspace-open-sample'));
    fireEvent.click(screen.getByTestId('workspace-open-directory'));

    expect(onOpenSample).toHaveBeenCalledTimes(1);
    expect(onOpenDirectory).toHaveBeenCalledTimes(1);
  });
});
