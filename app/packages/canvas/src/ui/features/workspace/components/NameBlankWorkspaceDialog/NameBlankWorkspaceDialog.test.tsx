import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NameBlankWorkspaceDialog } from './NameBlankWorkspaceDialog';

describe('NameBlankWorkspaceDialog', () => {
  it('saves as a file with the typed name', () => {
    const onSaveFile = vi.fn();
    render(
      <NameBlankWorkspaceDialog
        isOpen
        folderSaveAvailable
        onSaveFile={onSaveFile}
        onSaveFolder={vi.fn()}
        onContinueUnsaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'Billing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save as a file' }));
    expect(onSaveFile).toHaveBeenCalledWith('Billing');
  });

  it('blocks continue unsaved until the risk is acknowledged', () => {
    const onContinueUnsaved = vi.fn();
    render(
      <NameBlankWorkspaceDialog
        isOpen
        folderSaveAvailable={false}
        onSaveFile={vi.fn()}
        onSaveFolder={vi.fn()}
        onContinueUnsaved={onContinueUnsaved}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Continue unsaved' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue unsaved' }));
    expect(onContinueUnsaved).toHaveBeenCalledWith('Empty Workspace');
  });

  it('disables folder save when the picker is unavailable', () => {
    render(
      <NameBlankWorkspaceDialog
        isOpen
        folderSaveAvailable={false}
        onSaveFile={vi.fn()}
        onSaveFolder={vi.fn()}
        onContinueUnsaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Save in a folder' })).toBeDisabled();
  });
});
