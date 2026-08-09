import {
  LITE_SCAN_MAX_FILE_BYTES,
  LITE_SCAN_MAX_FILES,
  LITE_SCAN_MAX_METADATA_FILES,
  LITE_SCAN_MAX_TOTAL_BYTES,
  LITE_SCAN_SKIP_DIR_NAMES,
  isLiteScanMetadataPath,
  isLiteScanSourcePath,
} from '../../application/analysis/liteScanLimits';
import type { LiteScanSourceFile } from '../../application/analysis/liteScanTypes';

export type BrowserSourceWalkResult = {
  files: LiteScanSourceFile[];
  /** Parseable source files only — metadata manifests are excluded. */
  sourceFileCount: number;
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

function throwIfCancelled(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const err = new Error('Scan cancelled.');
  err.name = 'CancellationError';
  throw err;
}

/**
 * Recursively walk a directory handle for TS/JS sources (browser File System Access).
 * Sources, manifests, and total bytes are budgeted separately for onboarding responsiveness.
 */
export async function walkBrowserSourceDirectory(
  root: DirHandle,
  options: {
    maxFiles?: number;
    maxMetadataFiles?: number;
    maxFileBytes?: number;
    maxTotalBytes?: number;
    signal?: AbortSignal;
  } = {}
): Promise<BrowserSourceWalkResult> {
  const maxFiles = options.maxFiles ?? LITE_SCAN_MAX_FILES;
  const maxMetadataFiles = options.maxMetadataFiles ?? LITE_SCAN_MAX_METADATA_FILES;
  const maxFileBytes = options.maxFileBytes ?? LITE_SCAN_MAX_FILE_BYTES;
  const maxTotalBytes = options.maxTotalBytes ?? LITE_SCAN_MAX_TOTAL_BYTES;

  const files: LiteScanSourceFile[] = [];
  let sourceCount = 0;
  let metadataCount = 0;
  let totalBytes = 0;
  let truncated = false;

  const visit = async (dir: DirHandle, prefix: string): Promise<void> => {
    throwIfCancelled(options.signal);

    // FileSystemDirectoryHandle is async-iterable in supporting browsers.
    for await (const [name, handle] of dir as unknown as AsyncIterable<
      [string, FileSystemHandle]
    >) {
      throwIfCancelled(options.signal);
      if (sourceCount >= maxFiles) {
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

      const isSource = isLiteScanSourcePath(name);
      const isMetadata = !isSource && isLiteScanMetadataPath(name);
      if (!isSource && !isMetadata) continue;
      if (isMetadata && metadataCount >= maxMetadataFiles) continue;

      const file = await handle.getFile();
      if (file.size > maxFileBytes) continue;
      if (totalBytes + file.size > maxTotalBytes) {
        truncated = true;
        if (isSource) return;
        continue;
      }

      const content = await file.text();
      totalBytes += file.size;
      files.push({ relativePath: prefix ? `${prefix}/${name}` : name, content });

      if (isSource) {
        sourceCount += 1;
        if (sourceCount >= maxFiles) {
          truncated = true;
          return;
        }
      } else {
        metadataCount += 1;
      }
    }
  };

  await visit(root, '');
  return {
    files,
    sourceFileCount: sourceCount,
    truncated,
    directoryName: root.name || 'scanned',
  };
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
