import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SaveScanMapDialog } from './SaveScanMapDialog';

describe('SaveScanMapDialog', () => {
  it('names save, download and keep-in-memory actions', () => {
    const onSaveFolder = vi.fn();
    const onDownload = vi.fn();
    const onKeepInMemory = vi.fn();
    render(
      <SaveScanMapDialog
        isOpen
        folderSaveAvailable
        onSaveFolder={onSaveFolder}
        onDownload={onDownload}
        onKeepInMemory={onKeepInMemory}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save map to folder' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download YAML' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep in memory' }));
    expect(onSaveFolder).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onKeepInMemory).toHaveBeenCalledTimes(1);
  });

  it('keeps the map in memory on Escape', () => {
    const onKeepInMemory = vi.fn();
    render(
      <SaveScanMapDialog
        isOpen
        folderSaveAvailable
        onSaveFolder={vi.fn()}
        onDownload={vi.fn()}
        onKeepInMemory={onKeepInMemory}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onKeepInMemory).toHaveBeenCalledTimes(1);
  });

  it('disables folder save when the picker is unavailable', () => {
    render(
      <SaveScanMapDialog
        isOpen
        folderSaveAvailable={false}
        onSaveFolder={vi.fn()}
        onDownload={vi.fn()}
        onKeepInMemory={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Save map to folder' })).toBeDisabled();
  });
});
