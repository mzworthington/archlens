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
  isLiteScanIacPath,
  isLiteScanMetadataPath,
  isLiteScanPulumiProjectPath,
  isLiteScanPulumiYamlProgramPath,
  isLiteScanSourcePath,
  liteScanIacPriority,
  liteScanMetadataPriority,
  liteScanSourcePriority,
  type LiteScanTruncationReason,
} from './liteScanLimits';
import type { LiteScanProgress } from './liteScanProgress';
import type { LiteScanSourceFile } from './liteScanTypes';

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

type CandidateKind = 'source' | 'metadata' | 'iac';

type Candidate = {
  relativePath: string;
  content: string;
  size: number;
  kind: CandidateKind;
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

function candidateKind(relativePath: string, hasPulumiProjectInDir: boolean): CandidateKind | null {
  if (isLiteScanSourcePath(relativePath)) return 'source';
  if (isLiteScanMetadataPath(relativePath)) return 'metadata';
  if (isLiteScanIacPath(relativePath)) return 'iac';
  if (hasPulumiProjectInDir && isLiteScanPulumiYamlProgramPath(relativePath)) return 'iac';
  return null;
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
    const kind = candidateKind(entry.relativePath, pulumiDirs.has(directoryOf(entry.relativePath)));
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

  const sharedBudgetPaths = [...sources, ...iac];
  const truncationReasons = new Set<LiteScanTruncationReason>();
  if (sharedBudgetPaths.length > maxFiles) truncationReasons.add('files');
  if (metadata.length > maxMetadataFiles) truncationReasons.add('metadata');

  const files: LiteScanSourceFile[] = [];
  let totalBytes = 0;
  let sourceCount = 0;
  let iacCount = 0;

  const take = (candidate: Candidate, budget: 'shared' | 'metadata'): boolean => {
    throwIfAborted(options.signal);
    if (candidate.size > maxFileBytes) return true;
    if (totalBytes + candidate.size > maxTotalBytes) {
      truncationReasons.add('bytes');
      return false;
    }
    totalBytes += candidate.size;
    files.push({ relativePath: candidate.relativePath, content: candidate.content });
    if (budget === 'metadata') {
      options.onProgress?.({
        phase: 'reading',
        filesScanned: sourceCount + iacCount,
        fileCap: maxFiles,
        bytesRead: totalBytes,
        byteCap: maxTotalBytes,
      });
      return true;
    }
    if (candidate.kind === 'iac') iacCount += 1;
    else sourceCount += 1;
    options.onProgress?.({
      phase: 'reading',
      filesScanned: sourceCount + iacCount,
      fileCap: maxFiles,
      bytesRead: totalBytes,
      byteCap: maxTotalBytes,
    });
    return true;
  };

  for (const candidate of sharedBudgetPaths.slice(0, maxFiles)) {
    if (!take(candidate, 'shared')) break;
  }
  for (const candidate of metadata.slice(0, maxMetadataFiles)) {
    if (!take(candidate, 'metadata')) break;
  }

  return {
    files,
    sourceFileCount: sourceCount,
    iacFileCount: iacCount,
    truncated: truncationReasons.size > 0,
    truncationReasons: [...truncationReasons],
    directoryName: sharedRoot.directoryName ?? options.directoryName,
  };
}
