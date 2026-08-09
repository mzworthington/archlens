import {
  LITE_SCAN_EXTENSIONS,
  LITE_SCAN_MAX_FILE_BYTES,
  LITE_SCAN_MAX_FILES,
  LITE_SCAN_SKIP_DIR_NAMES,
} from '../../application/analysis/liteScanLimits';
import type { LiteScanSourceFile } from '../../application/analysis/buildLiteScanSchemas';

export type BrowserSourceWalkResult = {
  files: LiteScanSourceFile[];
  truncated: boolean;
  directoryName: string;
};

type DirHandle = FileSystemDirectoryHandle;
type FileHandle = FileSystemFileHandle;

function isDirectoryHandle(handle: FileSystemHandle): handle is DirHandle {
  return handle.kind === 'directory';
}

function isFileHandle(handle: FileSystemHandle): handle is FileHandle {
  return handle.kind === 'file';
}

function extensionOf(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

/**
 * Recursively walk a directory handle for TS/JS sources (browser File System Access).
 * Applies file-count and per-file size caps for onboarding responsiveness.
 */
export async function walkBrowserSourceDirectory(
  root: DirHandle,
  options: {
    maxFiles?: number;
    maxFileBytes?: number;
    signal?: AbortSignal;
  } = {}
): Promise<BrowserSourceWalkResult> {
  const maxFiles = options.maxFiles ?? LITE_SCAN_MAX_FILES;
  const maxFileBytes = options.maxFileBytes ?? LITE_SCAN_MAX_FILE_BYTES;
  const files: LiteScanSourceFile[] = [];
  let truncated = false;

  const visit = async (dir: DirHandle, prefix: string): Promise<void> => {
    if (options.signal?.aborted) {
      const err = new Error('Scan cancelled.');
      err.name = 'CancellationError';
      throw err;
    }
    // FileSystemDirectoryHandle is async-iterable in supporting browsers.
    for await (const [name, handle] of dir as unknown as AsyncIterable<
      [string, FileSystemHandle]
    >) {
      if (files.length >= maxFiles) {
        truncated = true;
        return;
      }
      if (name.startsWith('.')) continue;

      if (isDirectoryHandle(handle)) {
        if (LITE_SCAN_SKIP_DIR_NAMES.has(name)) continue;
        const nextPrefix = prefix ? `${prefix}/${name}` : name;
        await visit(handle, nextPrefix);
        if (truncated) return;
        continue;
      }

      if (!isFileHandle(handle)) continue;
      if (!LITE_SCAN_EXTENSIONS.has(extensionOf(name))) continue;

      const file = await handle.getFile();
      if (file.size > maxFileBytes) continue;
      const content = await file.text();
      const relativePath = prefix ? `${prefix}/${name}` : name;
      files.push({ relativePath, content });
      if (files.length >= maxFiles) {
        truncated = true;
        return;
      }
    }
  };

  await visit(root, '');
  return { files, truncated, directoryName: root.name || 'scanned' };
}

export type DirectoryPicker = () => Promise<DirHandle | null>;

/** Default picker — read-only is enough for lite scan (we write YAML into memory). */
export const pickSourceDirectory: DirectoryPicker = async () => {
  if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
    return null;
  }
  try {
    return await window.showDirectoryPicker({ mode: 'read' });
  } catch {
    // User cancelled or permission denied.
    return null;
  }
};
