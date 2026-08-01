import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceEntryPanel } from './WorkspaceEntryPanel';
import { WORKSPACE_STARTUP } from '../../content/productOutcomes';
import { GOLDEN_PATHS_CONTEXT_PATH } from '../../../application/store/defaultData';

describe('WorkspaceEntryPanel', () => {
  it('renders sandbox choices and open-directory action', () => {
    render(<WorkspaceEntryPanel onLoadSandbox={vi.fn()} onOpenDirectory={vi.fn()} />);

    expect(screen.getByRole('heading', { name: WORKSPACE_STARTUP.title })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-load-sandbox-golden-paths')).toHaveTextContent(
      /Golden Paths/i
    );
    expect(screen.getByTestId('workspace-open-directory')).toHaveTextContent(
      /Open workspace from directory/i
    );
    expect(screen.queryByTestId('workspace-cli-panel')).not.toBeInTheDocument();
  });

  it('shows the CLI panel when requested', () => {
    render(<WorkspaceEntryPanel onLoadSandbox={vi.fn()} onOpenDirectory={vi.fn()} showCliPanel />);

    expect(screen.getByTestId('workspace-cli-panel')).toHaveTextContent(
      /Generate from your codebase/i
    );
  });

  it('invokes the matching handler for each choice', () => {
    const onLoadSandbox = vi.fn();
    const onOpenDirectory = vi.fn();

    render(<WorkspaceEntryPanel onLoadSandbox={onLoadSandbox} onOpenDirectory={onOpenDirectory} />);

    fireEvent.click(screen.getByTestId('workspace-load-sandbox-golden-paths'));
    fireEvent.click(screen.getByTestId('workspace-open-directory'));

    expect(onLoadSandbox).toHaveBeenCalledWith(GOLDEN_PATHS_CONTEXT_PATH);
    expect(onOpenDirectory).toHaveBeenCalledTimes(1);
  });
});
