export type ZipPickResult = { status: 'ok'; file: File } | { status: 'cancelled' };

export type ZipFilePicker = () => Promise<ZipPickResult>;

const CANCEL_AFTER_FOCUS_MS = 400;

const defaultPickZipArchiveFile: ZipFilePicker = () =>
  new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,application/zip,application/x-zip-compressed';
    input.setAttribute('aria-label', 'Upload ZIP');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    let settled = false;
    const finish = (result: ZipPickResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onWindowFocus);
      input.remove();
      resolve(result);
    };
    const onWindowFocus = () => {
      window.setTimeout(() => {
        if (settled) return;
        if (input.files && input.files.length > 0) return;
        finish({ status: 'cancelled' });
      }, CANCEL_AFTER_FOCUS_MS);
    };
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      finish(file ? { status: 'ok', file } : { status: 'cancelled' });
    });
    input.addEventListener('cancel', () => {
      finish({ status: 'cancelled' });
    });
    document.body.appendChild(input);
    input.click();
    window.setTimeout(() => {
      if (!settled) window.addEventListener('focus', onWindowFocus);
    }, 0);
  });

let pickZipArchiveFileImpl: ZipFilePicker = defaultPickZipArchiveFile;

export const pickZipArchiveFile: ZipFilePicker = () => pickZipArchiveFileImpl();

export function setPickZipArchiveFileForTests(impl: ZipFilePicker | null): void {
  pickZipArchiveFileImpl = impl ?? defaultPickZipArchiveFile;
}
