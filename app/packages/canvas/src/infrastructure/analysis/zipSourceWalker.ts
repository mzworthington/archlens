import { unzipSync } from 'fflate';
import { CancellationError } from '@archlens/analysis/cancellation';
import type { LiteScanProgress } from '../../application/analysis/liteScanProgress';
import { walkBrowserSourceDirectory, type BrowserSourceWalkResult } from './browserSourceWalker';

export const ZIP_SCAN_INVALID_MESSAGE = 'That file is not a valid ZIP.';
export const ZIP_SCAN_TOO_LARGE_MESSAGE = 'That ZIP is too large for a browser lite scan.';
export const ZIP_SCAN_TOO_MANY_ENTRIES_MESSAGE =
  'That ZIP has too many files for a browser lite scan.';

/** Compressed archive cap - unzip still applies the same per-file and total read budgets. */
export const LITE_SCAN_MAX_ZIP_ARCHIVE_BYTES = 16_000_000;
export const LITE_SCAN_MAX_ZIP_ENTRIES = 2_000;

export type ZipPickResult = { status: 'ok'; file: File } | { status: 'cancelled' };

export type ZipWalkOptions = {
  maxFiles?: number;
  maxMetadataFiles?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
  signal?: AbortSignal;
  onProgress?: (progress: LiteScanProgress) => void;
};

type VirtualTree = {
  dirs: Map<string, VirtualTree>;
  files: Map<string, Uint8Array>;
};

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new CancellationError('Scan cancelled.');
  }
}

function archiveName(zip: File | Uint8Array): string {
  if (zip instanceof File) {
    return zip.name.replace(/\.zip$/i, '') || 'scanned';
  }
  return 'scanned';
}

function sanitizeZipPath(raw: string): string | null {
  const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.endsWith('/')) return null;
  const parts = normalized.split('/').filter(part => part.length > 0 && part !== '.');
  if (parts.length === 0) return null;
  if (parts.some(part => part === '..' || part === '__MACOSX')) return null;
  return parts.join('/');
}

function stripSharedRoot(paths: string[]): {
  root: string | null;
  relativize: (path: string) => string;
} {
  if (paths.length === 0) {
    return { root: null, relativize: path => path };
  }
  const firstSegments = paths.map(path => path.split('/')[0] ?? path);
  const unique = new Set(firstSegments);
  if (unique.size !== 1 || paths.length < 2) {
    return { root: null, relativize: path => path };
  }
  const root = firstSegments[0]!;
  if (!paths.some(path => path.includes('/'))) {
    return { root: null, relativize: path => path };
  }
  return {
    root,
    relativize: path => (path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path),
  };
}

function insertPath(tree: VirtualTree, relativePath: string, bytes: Uint8Array): void {
  const parts = relativePath.split('/');
  let current = tree;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const name = parts[i]!;
    let child = current.dirs.get(name);
    if (!child) {
      child = { dirs: new Map(), files: new Map() };
      current.dirs.set(name, child);
    }
    current = child;
  }
  current.files.set(parts[parts.length - 1]!, bytes);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  if (
    bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength &&
    bytes.buffer instanceof ArrayBuffer
  ) {
    return bytes.buffer;
  }
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function fileHandleFromBytes(name: string, bytes: Uint8Array): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    getFile: async () => new File([toArrayBuffer(bytes)], name),
  } as unknown as FileSystemFileHandle;
}

function treeToDirectoryHandle(name: string, tree: VirtualTree): FileSystemDirectoryHandle {
  const entries: Array<[string, FileSystemHandle]> = [];
  for (const [childName, bytes] of tree.files) {
    entries.push([childName, fileHandleFromBytes(childName, bytes)]);
  }
  for (const [childName, child] of tree.dirs) {
    entries.push([childName, treeToDirectoryHandle(childName, child)]);
  }
  return {
    kind: 'directory',
    name,
    async *[Symbol.asyncIterator]() {
      for (const entry of entries) yield entry;
    },
  } as unknown as FileSystemDirectoryHandle;
}

async function readZipBytes(zip: File | Uint8Array): Promise<Uint8Array> {
  if (zip instanceof Uint8Array) return zip;
  if (zip.size > LITE_SCAN_MAX_ZIP_ARCHIVE_BYTES) {
    throw new Error(ZIP_SCAN_TOO_LARGE_MESSAGE);
  }
  return new Uint8Array(await zip.arrayBuffer());
}

function unzipArchive(bytes: Uint8Array): Record<string, Uint8Array> {
  if (bytes.byteLength > LITE_SCAN_MAX_ZIP_ARCHIVE_BYTES) {
    throw new Error(ZIP_SCAN_TOO_LARGE_MESSAGE);
  }
  let entries = 0;
  try {
    return unzipSync(bytes, {
      filter: () => {
        entries += 1;
        if (entries > LITE_SCAN_MAX_ZIP_ENTRIES) {
          throw new Error(ZIP_SCAN_TOO_MANY_ENTRIES_MESSAGE);
        }
        return true;
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === ZIP_SCAN_TOO_MANY_ENTRIES_MESSAGE) {
      throw err;
    }
    throw new Error(ZIP_SCAN_INVALID_MESSAGE);
  }
}

/**
 * Unzip a repo archive into a virtual directory and walk it with the same
 * lite-scan caps and ignore rules as a folder pick.
 */
export async function walkZipArchive(
  zip: File | Uint8Array,
  options: ZipWalkOptions = {}
): Promise<BrowserSourceWalkResult> {
  throwIfCancelled(options.signal);
  const bytes = await readZipBytes(zip);
  throwIfCancelled(options.signal);
  const unzipped = unzipArchive(bytes);
  throwIfCancelled(options.signal);

  const sanitized: Array<{ path: string; content: Uint8Array }> = [];
  for (const [rawPath, content] of Object.entries(unzipped)) {
    const path = sanitizeZipPath(rawPath);
    if (!path) continue;
    sanitized.push({ path, content });
  }

  const { root, relativize } = stripSharedRoot(sanitized.map(entry => entry.path));
  const tree: VirtualTree = { dirs: new Map(), files: new Map() };
  for (const entry of sanitized) {
    const relativePath = relativize(entry.path);
    if (!relativePath) continue;
    insertPath(tree, relativePath, entry.content);
  }

  const directoryName = root ?? archiveName(zip);
  const walked = await walkBrowserSourceDirectory(
    treeToDirectoryHandle(directoryName, tree),
    options
  );
  return { ...walked, directoryName };
}

export async function pickZipArchive(): Promise<ZipPickResult> {
  if (typeof document === 'undefined') {
    return { status: 'cancelled' };
  }
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,application/zip,application/x-zip-compressed';
    input.setAttribute('aria-label', 'Upload ZIP for browser lite scan');
    const finish = (result: ZipPickResult) => {
      input.remove();
      resolve(result);
    };
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      finish(file ? { status: 'ok', file } : { status: 'cancelled' });
    });
    input.addEventListener('cancel', () => finish({ status: 'cancelled' }));
    input.click();
  });
}
