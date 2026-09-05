import { CancellationError } from '@archlens/analysis/cancellation';
import { createStructuralPathFilter } from '@archlens/analysis/path-filter';
import {
  LITE_SCAN_MAX_FILE_BYTES,
  LITE_SCAN_MAX_FILES,
  LITE_SCAN_MAX_METADATA_FILES,
  LITE_SCAN_MAX_TOTAL_BYTES,
  LITE_SCAN_SKIP_DIR_NAMES,
  isLiteScanIacPath,
  isLiteScanMetadataPath,
  isLiteScanPulumiProjectPath,
  isLiteScanPulumiYamlProgramPath,
  isLiteScanSourcePath,
  liteScanIacPriority,
  liteScanMetadataPriority,
  liteScanSourcePriority,
  type LiteScanTruncationReason,
} from '../../application/analysis/liteScanLimits';
import type { LiteScanProgress } from '../../application/analysis/liteScanProgress';
import type { LiteScanSourceFile } from '../../application/analysis/liteScanTypes';

export type BrowserSourceWalkResult = {
  files: LiteScanSourceFile[];
  /** Application source files only - metadata and IaC inputs are excluded. */
  sourceFileCount: number;
  /** Terraform / Pulumi inputs collected for the IaC analyzer pass. */
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
  kind: 'source' | 'metadata' | 'iac';
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

function candidateKind(
  relativePath: string,
  hasPulumiProjectInDir: boolean
): Candidate['kind'] | null {
  if (isLiteScanSourcePath(relativePath)) return 'source';
  if (isLiteScanMetadataPath(relativePath)) return 'metadata';
  if (isLiteScanIacPath(relativePath)) return 'iac';
  if (hasPulumiProjectInDir && isLiteScanPulumiYamlProgramPath(relativePath)) return 'iac';
  return null;
}

/**
 * Recursively walk a directory handle for supported sources and IaC inputs
 * (browser File System Access). Sources, manifests and total bytes are budgeted
 * separately; source roots are preferred when the file cap is hit so peripheral
 * scripts do not starve `src/`.
 */
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
  const pathFilter = createStructuralPathFilter({ ignore: [], include: [], allowIac: true });

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

    for await (const [name, handle] of dir as unknown as AsyncIterable<
      [string, FileSystemHandle]
    >) {
      throwIfCancelled(options.signal);
      if (name.startsWith('.')) continue;

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
      throwIfCancelled(options.signal);
      const relativePath = prefix ? `${prefix}/${name}` : name;
      if (pathFilter.shouldSkip(relativePath)) continue;

      const kind = candidateKind(relativePath, hasPulumiProject);
      if (!kind) continue;
      candidates.push({ relativePath, handle, kind });
      report('walking', candidates.length, 0);
    }

    for (const [name, handle] of dirEntries) {
      throwIfCancelled(options.signal);
      const nextPrefix = prefix ? `${prefix}/${name}` : name;
      if (shouldSkipDirectory(nextPrefix, pathFilter)) continue;
      await visit(handle, nextPrefix);
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
  const iac = candidates
    .filter(c => c.kind === 'iac')
    .sort(
      (a, b) =>
        liteScanIacPriority(a.relativePath) - liteScanIacPriority(b.relativePath) ||
        a.relativePath.localeCompare(b.relativePath)
    );
  const metadata = candidates
    .filter(c => c.kind === 'metadata')
    .sort(
      (a, b) =>
        liteScanMetadataPriority(a.relativePath) - liteScanMetadataPriority(b.relativePath) ||
        a.relativePath.localeCompare(b.relativePath)
    );

  // Application sources and IaC share the file cap so large monorepos stay responsive.
  const sharedBudgetPaths = [...sources, ...iac];
  const truncationReasons = new Set<LiteScanTruncationReason>();
  if (sharedBudgetPaths.length > maxFiles) truncationReasons.add('files');
  if (metadata.length > maxMetadataFiles) truncationReasons.add('metadata');

  const files: LiteScanSourceFile[] = [];
  let totalBytes = 0;
  let sourceCount = 0;
  let iacCount = 0;

  const readCandidate = async (
    candidate: Candidate,
    budget: 'shared' | 'metadata'
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
    if (budget === 'metadata') {
      report('reading', sourceCount + iacCount, totalBytes);
      return true;
    }
    if (candidate.kind === 'iac') iacCount += 1;
    else sourceCount += 1;
    report('reading', sourceCount + iacCount, totalBytes);
    return true;
  };

  for (const candidate of sharedBudgetPaths.slice(0, maxFiles)) {
    const ok = await readCandidate(candidate, 'shared');
    if (!ok) break;
  }

  for (const candidate of metadata.slice(0, maxMetadataFiles)) {
    const ok = await readCandidate(candidate, 'metadata');
    if (!ok) break;
  }

  return {
    files,
    sourceFileCount: sourceCount,
    iacFileCount: iacCount,
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

/** Default picker - read-only is enough for lite scan (we write YAML into memory). */
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
  return ` Skipped remaining files after hitting the ${parts.join(' and ')}. Structure only — no git history.`;
}
