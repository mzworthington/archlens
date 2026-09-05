import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SaveBrowserLiteScanDialog } from './SaveBrowserLiteScanDialog';

describe('SaveBrowserLiteScanDialog', () => {
  it('names save, download and keep-in-memory actions', () => {
    const onSaveFolder = vi.fn();
    const onDownload = vi.fn();
    const onKeepInMemory = vi.fn();
    render(
      <SaveBrowserLiteScanDialog
        isOpen
        folderSaveAvailable
        onSaveFolder={onSaveFolder}
        onDownload={onDownload}
        onKeepInMemory={onKeepInMemory}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Save map to folder?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save to folder' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download YAML' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep in memory' }));
    expect(onSaveFolder).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onKeepInMemory).toHaveBeenCalledTimes(1);
  });

  it('keeps the map in memory when Escape is pressed', () => {
    const onKeepInMemory = vi.fn();
    render(
      <SaveBrowserLiteScanDialog
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
      <SaveBrowserLiteScanDialog
        isOpen
        folderSaveAvailable={false}
        onSaveFolder={vi.fn()}
        onDownload={vi.fn()}
        onKeepInMemory={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Save to folder' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download YAML' })).toBeEnabled();
  });

  it('does not render when closed', () => {
    render(
      <SaveBrowserLiteScanDialog
        isOpen={false}
        folderSaveAvailable
        onSaveFolder={vi.fn()}
        onDownload={vi.fn()}
        onKeepInMemory={vi.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
