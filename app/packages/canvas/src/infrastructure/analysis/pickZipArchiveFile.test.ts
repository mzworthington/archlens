import { afterEach, describe, expect, it } from 'vitest';
import { pickZipArchiveFile, setPickZipArchiveFileForTests } from './pickZipArchiveFile';

function fileInput(): HTMLInputElement {
  const input = document.body.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('expected a file input in the document');
  }
  return input;
}

describe('pickZipArchiveFile', () => {
  afterEach(() => {
    setPickZipArchiveFileForTests(null);
    document.body.replaceChildren();
  });

  it('names the file input Upload ZIP', () => {
    void pickZipArchiveFile();
    expect(fileInput()).toHaveAttribute('aria-label', 'Upload ZIP');
    expect(fileInput().accept).toMatch(/\.zip/);
  });

  it('returns the selected archive', async () => {
    const pending = pickZipArchiveFile();
    const file = new File(['pk'], 'repo.zip', { type: 'application/zip' });
    const input = fileInput();
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change'));

    await expect(pending).resolves.toEqual({ status: 'ok', file });
    expect(document.body.querySelector('input[type="file"]')).toBeNull();
  });

  it('cancels when the picker fires cancel', async () => {
    const pending = pickZipArchiveFile();
    fileInput().dispatchEvent(new Event('cancel'));
    await expect(pending).resolves.toEqual({ status: 'cancelled' });
  });

  it('cancels when the picker closes with no file', async () => {
    const pending = pickZipArchiveFile();
    fileInput().dispatchEvent(new Event('change'));
    await expect(pending).resolves.toEqual({ status: 'cancelled' });
  });
});
