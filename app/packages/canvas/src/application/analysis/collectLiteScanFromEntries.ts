import { throwIfAborted } from '@archlens/analysis/cancellation';
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
} from './liteScanLimits';
import type { LiteScanProgress } from './liteScanProgress';
import type { LiteScanSourceFile } from './liteScanTypes';
import {
  createLiteScanTakeState,
  liteScanCandidateKind,
  selectLiteScanCandidateBuckets,
  takeLiteScanCandidate,
  type LiteScanCandidateKind,
} from './liteScanCandidateSelect';

export type LiteScanWalkResult = {
  files: LiteScanSourceFile[];
  sourceFileCount: number;
  iacFileCount: number;
  truncated: boolean;
  truncationReasons: LiteScanTruncationReason[];
  directoryName: string;
};

export type MemoryScanEntry = {
  relativePath: string;
  content: string;
  size: number;
};

type Candidate = {
  relativePath: string;
  content: string;
  size: number;
  kind: LiteScanCandidateKind;
};

function normalizeRelativePath(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
  if (!normalized || normalized.endsWith('/')) return null;
  const segments = normalized.split('/').filter(Boolean);
  if (segments.some(segment => segment === '..' || segment === '.')) return null;
  return segments.join('/');
}

function baseName(relativePath: string): string {
  return relativePath.split('/').pop() ?? relativePath;
}

function directoryOf(relativePath: string): string {
  const idx = relativePath.lastIndexOf('/');
  return idx === -1 ? '' : relativePath.slice(0, idx);
}

function isHiddenListingName(name: string): boolean {
  return name.startsWith('.') && name !== '.gitignore';
}

const ARCHIVE_SOURCE_ROOT_NAMES = new Set([
  'src',
  'lib',
  'app',
  'apps',
  'packages',
  'cmd',
  'internal',
  'pkg',
  'source',
  'backend',
  'frontend',
]);

function shouldKeepArchiveRoot(root: string): boolean {
  return (
    ARCHIVE_SOURCE_ROOT_NAMES.has(root) ||
    LITE_SCAN_SKIP_DIR_NAMES.has(root) ||
    isHiddenListingName(root)
  );
}

function isUnderSkippedDirectory(relativePath: string): boolean {
  const segments = relativePath.split('/');
  const parents = segments.slice(0, -1);
  return parents.some(
    segment => LITE_SCAN_SKIP_DIR_NAMES.has(segment) || isHiddenListingName(segment)
  );
}

export function stripSharedArchiveRoot(paths: readonly string[]): {
  directoryName: string | null;
  relativize: (path: string) => string;
} {
  const firstSegments = new Set<string>();
  let hasNested = false;
  for (const path of paths) {
    const segments = path.split('/');
    firstSegments.add(segments[0] ?? path);
    if (segments.length > 1) hasNested = true;
  }
  if (firstSegments.size !== 1 || !hasNested) {
    return { directoryName: null, relativize: path => path };
  }
  const root = [...firstSegments][0]!;
  if (shouldKeepArchiveRoot(root)) {
    return { directoryName: null, relativize: path => path };
  }
  const prefix = `${root}/`;
  return {
    directoryName: root,
    relativize: path =>
      path === root ? '' : path.startsWith(prefix) ? path.slice(prefix.length) : path,
  };
}

export function collectLiteScanFromEntries(
  entries: readonly MemoryScanEntry[],
  options: {
    directoryName: string;
    maxFiles?: number;
    maxMetadataFiles?: number;
    maxFileBytes?: number;
    maxTotalBytes?: number;
    signal?: AbortSignal;
    onProgress?: (progress: LiteScanProgress) => void;
  }
): LiteScanWalkResult {
  throwIfAborted(options.signal);
  const maxFiles = options.maxFiles ?? LITE_SCAN_MAX_FILES;
  const maxMetadataFiles = options.maxMetadataFiles ?? LITE_SCAN_MAX_METADATA_FILES;
  const maxFileBytes = options.maxFileBytes ?? LITE_SCAN_MAX_FILE_BYTES;
  const maxTotalBytes = options.maxTotalBytes ?? LITE_SCAN_MAX_TOTAL_BYTES;

  const normalized: MemoryScanEntry[] = [];
  for (const entry of entries) {
    throwIfAborted(options.signal);
    const relativePath = normalizeRelativePath(entry.relativePath);
    if (!relativePath) continue;
    if (isHiddenListingName(baseName(relativePath))) continue;
    if (isUnderSkippedDirectory(relativePath)) continue;
    normalized.push({ ...entry, relativePath });
  }

  const sharedRoot = stripSharedArchiveRoot(normalized.map(entry => entry.relativePath));
  const rooted = normalized
    .map(entry => ({
      ...entry,
      relativePath: sharedRoot.relativize(entry.relativePath),
    }))
    .filter(entry => entry.relativePath.length > 0);

  const gitignore = createMutableGitignoreFilter();
  const pathFilter = createStructuralPathFilter({ ignore: [], include: [], allowIac: true });
  const shouldSkipPath = (relativePath: string): boolean =>
    pathFilter.shouldSkip(relativePath) || gitignore.ignores(relativePath);

  for (const entry of rooted) {
    throwIfAborted(options.signal);
    if (baseName(entry.relativePath) !== '.gitignore') continue;
    gitignore.add(entry.content, directoryOf(entry.relativePath));
  }

  const pulumiDirs = new Set<string>();
  for (const entry of rooted) {
    if (isLiteScanPulumiProjectPath(entry.relativePath)) {
      pulumiDirs.add(directoryOf(entry.relativePath));
    }
  }

  const candidates: Candidate[] = [];
  for (const entry of rooted) {
    throwIfAborted(options.signal);
    if (baseName(entry.relativePath) === '.gitignore') continue;
    if (isHiddenListingName(baseName(entry.relativePath))) continue;
    if (isUnderSkippedDirectory(entry.relativePath)) continue;
    if (shouldSkipPath(entry.relativePath)) continue;
    const kind = liteScanCandidateKind(
      entry.relativePath,
      pulumiDirs.has(directoryOf(entry.relativePath))
    );
    if (!kind) continue;
    candidates.push({
      relativePath: entry.relativePath,
      content: entry.content,
      size: entry.size,
      kind,
    });
    options.onProgress?.({
      phase: 'walking',
      filesScanned: candidates.length,
      fileCap: maxFiles,
      bytesRead: 0,
      byteCap: maxTotalBytes,
    });
  }

  const selected = selectLiteScanCandidateBuckets(candidates, maxFiles, maxMetadataFiles);
  const state = createLiteScanTakeState(selected.truncationReasons);
  const limits = { maxFileBytes, maxTotalBytes };

  const take = (candidate: Candidate, budget: 'shared' | 'metadata'): boolean => {
    throwIfAborted(options.signal);
    const result = takeLiteScanCandidate(state, candidate, budget, limits);
    if (result === 'took') {
      options.onProgress?.({
        phase: 'reading',
        filesScanned: state.sourceCount + state.iacCount,
        fileCap: maxFiles,
        bytesRead: state.totalBytes,
        byteCap: maxTotalBytes,
      });
    }
    return result !== 'full';
  };

  for (const candidate of selected.sharedBudget) {
    if (!take(candidate, 'shared')) break;
  }
  for (const candidate of selected.metadata) {
    if (!take(candidate, 'metadata')) break;
  }

  return {
    files: state.files,
    sourceFileCount: state.sourceCount,
    iacFileCount: state.iacCount,
    truncated: state.truncationReasons.size > 0,
    truncationReasons: [...state.truncationReasons],
    directoryName: sharedRoot.directoryName ?? options.directoryName,
  };
}
