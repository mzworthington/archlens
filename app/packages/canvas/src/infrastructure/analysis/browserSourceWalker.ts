import { CancellationError } from '@archlens/analysis/cancellation';
import {
  createMutableGitignoreFilter,
  createStructuralPathFilter,
} from '@archlens/analysis/path-filter';
import {
  LITE_SCAN_MAX_FILE_BYTES,
  LITE_SCAN_MAX_FILES,
  LITE_SCAN_MAX_METADATA_FILES,
  LITE_SCAN_MAX_TOTAL_BYTES,
  LITE_SCAN_SKIP_DIR_NAMES,
  isLiteScanPulumiProjectPath,
  type LiteScanTruncationReason,
} from '../../application/analysis/liteScanLimits';
import type { LiteScanProgress } from '../../application/analysis/liteScanProgress';
import type { LiteScanSourceFile } from '../../application/analysis/liteScanTypes';
import {
  createLiteScanTakeState,
  liteScanCandidateKind,
  selectLiteScanCandidateBuckets,
  takeLiteScanCandidate,
  type LiteScanCandidateKind,
} from '../../application/analysis/liteScanCandidateSelect';
import { iterateDirectoryEntries } from './fileSystemDirectoryEntries';

export type BrowserSourceWalkResult = {
  files: LiteScanSourceFile[];
  sourceFileCount: number;
  iacFileCount: number;
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
  kind: LiteScanCandidateKind;
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

export async function walkBrowserSourceDirectory(
  root: DirHandle,
  options: {
    maxFiles?: number;
    maxMetadataFiles?: number;
    maxFileBytes?: number;
    maxTotalBytes?: number;
    signal?: AbortSignal;
    onProgress?: (progress: LiteScanProgress) => void;
  } = {}
): Promise<BrowserSourceWalkResult> {
  const maxFiles = options.maxFiles ?? LITE_SCAN_MAX_FILES;
  const maxMetadataFiles = options.maxMetadataFiles ?? LITE_SCAN_MAX_METADATA_FILES;
  const maxFileBytes = options.maxFileBytes ?? LITE_SCAN_MAX_FILE_BYTES;
  const maxTotalBytes = options.maxTotalBytes ?? LITE_SCAN_MAX_TOTAL_BYTES;
  // allowIac: collect .tf / Pulumi.yaml while still skipping docs/tooling noise.
  const gitignore = createMutableGitignoreFilter();
  const pathFilter = createStructuralPathFilter({ ignore: [], include: [], allowIac: true });
  const shouldSkipPath = (relativePath: string): boolean =>
    pathFilter.shouldSkip(relativePath) || gitignore.ignores(relativePath);

  const candidates: Candidate[] = [];
  const report = (
    phase: LiteScanProgress['phase'],
    filesScanned: number,
    bytesRead: number
  ): void => {
    options.onProgress?.({
      phase,
      filesScanned,
      fileCap: maxFiles,
      bytesRead,
      byteCap: maxTotalBytes,
    });
  };

  const visit = async (dir: DirHandle, prefix: string): Promise<void> => {
    throwIfCancelled(options.signal);

    const fileEntries: Array<[string, FileHandle]> = [];
    const dirEntries: Array<[string, DirHandle]> = [];

    for await (const [name, handle] of iterateDirectoryEntries(dir)) {
      throwIfCancelled(options.signal);
      if (name.startsWith('.') && name !== '.gitignore') continue;

      if (isDirectoryHandle(handle)) {
        dirEntries.push([name, handle]);
        continue;
      }

      if (isFileHandle(handle)) {
        fileEntries.push([name, handle]);
      }
    }

    const hasPulumiProject = fileEntries.some(([name]) => isLiteScanPulumiProjectPath(name));

    for (const [name, handle] of fileEntries) {
      if (name !== '.gitignore') continue;
      throwIfCancelled(options.signal);
      try {
        const file = await handle.getFile();
        gitignore.add(await file.text(), prefix);
      } catch {
        // Unreadable gitignore should not abort the scan.
      }
    }

    for (const [name, handle] of fileEntries) {
      throwIfCancelled(options.signal);
      if (name === '.gitignore') continue;
      const relativePath = prefix ? `${prefix}/${name}` : name;
      if (shouldSkipPath(relativePath)) continue;

      const kind = liteScanCandidateKind(relativePath, hasPulumiProject);
      if (!kind) continue;
      candidates.push({ relativePath, handle, kind });
      report('walking', candidates.length, 0);
    }

    for (const [name, handle] of dirEntries) {
      throwIfCancelled(options.signal);
      const nextPrefix = prefix ? `${prefix}/${name}` : name;
      if (shouldSkipDirectory(nextPrefix, { shouldSkip: shouldSkipPath })) continue;
      await visit(handle, nextPrefix);
    }
  };

  await visit(root, '');

  const selected = selectLiteScanCandidateBuckets(candidates, maxFiles, maxMetadataFiles);
  const state = createLiteScanTakeState(selected.truncationReasons);
  const limits = { maxFileBytes, maxTotalBytes };

  const readCandidate = async (
    candidate: Candidate,
    budget: 'shared' | 'metadata'
  ): Promise<boolean> => {
    throwIfCancelled(options.signal);
    const file = await candidate.handle.getFile();
    if (file.size > maxFileBytes) return true;
    if (state.totalBytes + file.size > maxTotalBytes) {
      state.truncationReasons.add('bytes');
      return false;
    }
    const result = takeLiteScanCandidate(
      state,
      {
        relativePath: candidate.relativePath,
        content: await file.text(),
        size: file.size,
        kind: candidate.kind,
      },
      budget,
      limits
    );
    if (result === 'took') {
      report('reading', state.sourceCount + state.iacCount, state.totalBytes);
    }
    return result !== 'full';
  };

  for (const candidate of selected.sharedBudget) {
    const ok = await readCandidate(candidate, 'shared');
    if (!ok) break;
  }

  for (const candidate of selected.metadata) {
    const ok = await readCandidate(candidate, 'metadata');
    if (!ok) break;
  }

  return {
    files: state.files,
    sourceFileCount: state.sourceCount,
    iacFileCount: state.iacCount,
    truncated: state.truncationReasons.size > 0,
    truncationReasons: [...state.truncationReasons],
    directoryName: root.name || 'scanned',
  };
}

export type DirectoryPicker = () => Promise<DirectoryPickResult>;

export function isBrowserDirectoryPickerSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

export const pickSourceDirectory: DirectoryPicker = async () => {
  if (!isBrowserDirectoryPickerSupported()) {
    return { status: 'unsupported' };
  }
  try {
    const handle = await window.showDirectoryPicker!({ mode: 'read' });
    return { status: 'ok', handle };
  } catch {
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
  return ` Skipped remaining files after hitting the ${parts.join(' and ')}.`;
}
