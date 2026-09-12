import {
  isLiteScanIacPath,
  isLiteScanMetadataPath,
  isLiteScanPulumiYamlProgramPath,
  isLiteScanSourcePath,
  liteScanIacPriority,
  liteScanMetadataPriority,
  liteScanSourcePriority,
  type LiteScanTruncationReason,
} from './liteScanLimits';
import type { LiteScanSourceFile } from './liteScanTypes';

export type LiteScanCandidateKind = 'source' | 'metadata' | 'iac';

export type LiteScanCandidateRef = {
  relativePath: string;
  kind: LiteScanCandidateKind;
};

export function liteScanCandidateKind(
  relativePath: string,
  hasPulumiProjectInDir: boolean
): LiteScanCandidateKind | null {
  if (isLiteScanSourcePath(relativePath)) return 'source';
  if (isLiteScanMetadataPath(relativePath)) return 'metadata';
  if (isLiteScanIacPath(relativePath)) return 'iac';
  if (hasPulumiProjectInDir && isLiteScanPulumiYamlProgramPath(relativePath)) return 'iac';
  return null;
}

export function selectLiteScanCandidateBuckets<T extends LiteScanCandidateRef>(
  candidates: readonly T[],
  maxFiles: number,
  maxMetadataFiles: number
): {
  sharedBudget: T[];
  metadata: T[];
  truncationReasons: LiteScanTruncationReason[];
} {
  const byPath = (left: T, right: T) => left.relativePath.localeCompare(right.relativePath);
  const sources = candidates
    .filter(candidate => candidate.kind === 'source')
    .sort(
      (left, right) =>
        liteScanSourcePriority(left.relativePath) - liteScanSourcePriority(right.relativePath) ||
        byPath(left, right)
    );
  const iac = candidates
    .filter(candidate => candidate.kind === 'iac')
    .sort(
      (left, right) =>
        liteScanIacPriority(left.relativePath) - liteScanIacPriority(right.relativePath) ||
        byPath(left, right)
    );
  const metadata = candidates
    .filter(candidate => candidate.kind === 'metadata')
    .sort(
      (left, right) =>
        liteScanMetadataPriority(left.relativePath) -
          liteScanMetadataPriority(right.relativePath) || byPath(left, right)
    );
  const sharedBudget = [...sources, ...iac];
  const truncationReasons: LiteScanTruncationReason[] = [];
  if (sharedBudget.length > maxFiles) truncationReasons.push('files');
  if (metadata.length > maxMetadataFiles) truncationReasons.push('metadata');
  return {
    sharedBudget: sharedBudget.slice(0, maxFiles),
    metadata: metadata.slice(0, maxMetadataFiles),
    truncationReasons,
  };
}

type LiteScanTakeResult = 'took' | 'skipped' | 'full';

type LiteScanTakeState = {
  files: LiteScanSourceFile[];
  totalBytes: number;
  sourceCount: number;
  iacCount: number;
  truncationReasons: Set<LiteScanTruncationReason>;
};

export function createLiteScanTakeState(
  truncationReasons: readonly LiteScanTruncationReason[]
): LiteScanTakeState {
  return {
    files: [],
    totalBytes: 0,
    sourceCount: 0,
    iacCount: 0,
    truncationReasons: new Set(truncationReasons),
  };
}

export function takeLiteScanCandidate(
  state: LiteScanTakeState,
  candidate: {
    relativePath: string;
    content: string;
    size: number;
    kind: LiteScanCandidateKind;
  },
  budget: 'shared' | 'metadata',
  limits: { maxFileBytes: number; maxTotalBytes: number }
): LiteScanTakeResult {
  if (candidate.size > limits.maxFileBytes) return 'skipped';
  if (state.totalBytes + candidate.size > limits.maxTotalBytes) {
    state.truncationReasons.add('bytes');
    return 'full';
  }
  state.totalBytes += candidate.size;
  state.files.push({ relativePath: candidate.relativePath, content: candidate.content });
  if (budget !== 'metadata') {
    if (candidate.kind === 'iac') state.iacCount += 1;
    else state.sourceCount += 1;
  }
  return 'took';
}
