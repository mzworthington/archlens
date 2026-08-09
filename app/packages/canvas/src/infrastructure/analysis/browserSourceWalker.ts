import { CancellationError } from '@archlens/analysis/cancellation';
import { createStructuralPathFilter } from '@archlens/analysis/path-filter';
import {
  LITE_SCAN_MAX_FILE_BYTES,
  LITE_SCAN_MAX_FILES,
  LITE_SCAN_MAX_METADATA_FILES,
  LITE_SCAN_MAX_TOTAL_BYTES,
  LITE_SCAN_SKIP_DIR_NAMES,
  isLiteScanMetadataPath,
  isLiteScanSourcePath,
  liteScanMetadataPriority,
  liteScanSourcePriority,
  type LiteScanTruncationReason,
} from '../../application/analysis/liteScanLimits';
import type { LiteScanSourceFile } from '../../application/analysis/liteScanTypes';

export type BrowserSourceWalkResult = {
  files: LiteScanSourceFile[];
  /** Parseable source files only — metadata manifests are excluded. */
  sourceFileCount: number;
  truncated: boolean;
  truncationReasons: LiteScanTruncationReason[];
  directoryName: string;
};

export type DirectoryPickResult =
  | { status: 'ok'; handle: FileSystemDirectoryHandle }
  | { status: 'cancelled' }
  | { status: 'unsupported' };

type DirHandle = FileSystemDirectoryHandle;
type FileHandle = FileSystemFileHandle;

type Candidate = {
  relativePath: string;
  handle: FileHandle;
  kind: 'source' | 'metadata';
};

function isDirectoryHandle(handle: FileSystemHandle): handle is DirHandle {
  return handle.kind === 'directory';
}

function isFileHandle(handle: FileSystemHandle): handle is FileHandle {
  return handle.kind === 'file';
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new CancellationError('Scan cancelled.');
  }
}

function shouldSkipDirectory(
  relativeDir: string,
  pathFilter: { shouldSkip: (p: string) => boolean }
): boolean {
  const name = relativeDir.split('/').pop() ?? relativeDir;
  if (LITE_SCAN_SKIP_DIR_NAMES.has(name)) return true;
  // Probe a child path so `e2e/**`-style globs match the directory tree.
  return pathFilter.shouldSkip(relativeDir) || pathFilter.shouldSkip(`${relativeDir}/__probe__`);
}

/**
 * Recursively walk a directory handle for TS/JS sources (browser File System Access).
 * Sources, manifests, and total bytes are budgeted separately; source roots are preferred
 * when the file cap is hit so peripheral scripts do not starve `src/`.
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
  const pathFilter = createStructuralPathFilter();

  const candidates: Candidate[] = [];

  const visit = async (dir: DirHandle, prefix: string): Promise<void> => {
    throwIfCancelled(options.signal);

    for await (const [name, handle] of dir as unknown as AsyncIterable<
      [string, FileSystemHandle]
    >) {
      throwIfCancelled(options.signal);
      if (name.startsWith('.')) continue;

      if (isDirectoryHandle(handle)) {
        const nextPrefix = prefix ? `${prefix}/${name}` : name;
        if (shouldSkipDirectory(nextPrefix, pathFilter)) continue;
        await visit(handle, nextPrefix);
        continue;
      }

      if (!isFileHandle(handle)) continue;
      const relativePath = prefix ? `${prefix}/${name}` : name;
      if (pathFilter.shouldSkip(relativePath)) continue;

      if (isLiteScanSourcePath(relativePath)) {
        candidates.push({ relativePath, handle, kind: 'source' });
      } else if (isLiteScanMetadataPath(relativePath)) {
        candidates.push({ relativePath, handle, kind: 'metadata' });
      }
    }
  };

  await visit(root, '');

  const sources = candidates
    .filter(c => c.kind === 'source')
    .sort(
      (a, b) =>
        liteScanSourcePriority(a.relativePath) - liteScanSourcePriority(b.relativePath) ||
        a.relativePath.localeCompare(b.relativePath)
    );
  const metadata = candidates
    .filter(c => c.kind === 'metadata')
    .sort(
      (a, b) =>
        liteScanMetadataPriority(a.relativePath) - liteScanMetadataPriority(b.relativePath) ||
        a.relativePath.localeCompare(b.relativePath)
    );

  const truncationReasons = new Set<LiteScanTruncationReason>();
  if (sources.length > maxFiles) truncationReasons.add('files');
  if (metadata.length > maxMetadataFiles) truncationReasons.add('metadata');

  const files: LiteScanSourceFile[] = [];
  let totalBytes = 0;
  let sourceCount = 0;
  let metadataCount = 0;

  const readCandidate = async (
    candidate: Candidate,
    budget: 'source' | 'metadata'
  ): Promise<boolean> => {
    throwIfCancelled(options.signal);
    const file = await candidate.handle.getFile();
    if (file.size > maxFileBytes) return true;
    if (totalBytes + file.size > maxTotalBytes) {
      truncationReasons.add('bytes');
      return false;
    }
    const content = await file.text();
    totalBytes += file.size;
    files.push({ relativePath: candidate.relativePath, content });
    if (budget === 'source') sourceCount += 1;
    else metadataCount += 1;
    return true;
  };

  for (const candidate of sources.slice(0, maxFiles)) {
    const ok = await readCandidate(candidate, 'source');
    if (!ok) break;
  }

  for (const candidate of metadata.slice(0, maxMetadataFiles)) {
    const ok = await readCandidate(candidate, 'metadata');
    if (!ok) break;
  }

  return {
    files,
    sourceFileCount: sourceCount,
    truncated: truncationReasons.size > 0,
    truncationReasons: [...truncationReasons],
    directoryName: root.name || 'scanned',
  };
}

export type DirectoryPicker = () => Promise<DirectoryPickResult>;

/** True when the File System Access directory picker is available (Chrome/Edge; not Firefox/Safari). */
export function isBrowserDirectoryPickerSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

/** Default picker — read-only is enough for lite scan (we write YAML into memory). */
export const pickSourceDirectory: DirectoryPicker = async () => {
  if (!isBrowserDirectoryPickerSupported()) {
    return { status: 'unsupported' };
  }
  try {
    const handle = await window.showDirectoryPicker!({ mode: 'read' });
    return { status: 'ok', handle };
  } catch {
    // User cancelled or permission denied.
    return { status: 'cancelled' };
  }
};

export function describeTruncation(
  reasons: readonly LiteScanTruncationReason[],
  sourceFileCount: number
): string {
  if (reasons.length === 0) return '';
  const parts: string[] = [];
  if (reasons.includes('files')) {
    parts.push(`source file cap (${sourceFileCount})`);
  }
  if (reasons.includes('bytes')) {
    parts.push('total size budget');
  }
  if (reasons.includes('metadata')) {
    parts.push('manifest budget');
  }
  return ` Truncated by ${parts.join(' and ')} for browser responsiveness.`;
}
