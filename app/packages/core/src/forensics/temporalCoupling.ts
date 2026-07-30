import type { CoupledPair, GitCommit } from './gitHistory';

export interface TemporalCouplingOptions {
  minSharedCommits: number;
  couplingThreshold: number;
  /**
   * Skip coupling for commits touching more than this many files (after allow-list filter).
   * Mass refactors and lockfile churn rarely carry coupling signal and can OOM on monorepos.
   * Default 50. Set to 0 to disable the cap.
   */
  maxFilesPerCommitForCoupling?: number;
}

export const DEFAULT_MAX_FILES_PER_COMMIT_FOR_COUPLING = 50;

/**
 * Jaccard-style temporal coupling:
 * shared / (commitsA + commitsB - shared)
 */
export function couplingScore(shared: number, commitsA: number, commitsB: number): number {
  const denom = commitsA + commitsB - shared;
  if (denom <= 0) return 0;
  return shared / denom;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

function resolveMaxFilesPerCommit(options: TemporalCouplingOptions): number {
  const raw = options.maxFilesPerCommitForCoupling;
  if (raw === undefined) return DEFAULT_MAX_FILES_PER_COMMIT_FOR_COUPLING;
  return raw > 0 ? raw : 0;
}

/**
 * Build co-change pairs by walking commits (O(Σ k²) per commit, not O(n²) over all files).
 */
export function computeTemporalCoupling(
  commits: readonly GitCommit[],
  options: TemporalCouplingOptions,
  /** Optional allow-list; when set, only these paths participate. */
  allowedPaths?: ReadonlySet<string>
): CoupledPair[] {
  const maxFilesPerCommit = resolveMaxFilesPerCommit(options);
  const fileCommitCounts = new Map<string, number>();
  const sharedCounts = new Map<string, number>();

  for (const commit of commits) {
    const paths = commit.paths
      .filter(p => !allowedPaths || allowedPaths.has(p))
      .sort((a, b) => a.localeCompare(b));

    if (maxFilesPerCommit > 0 && paths.length > maxFilesPerCommit) {
      continue;
    }

    for (const path of paths) {
      fileCommitCounts.set(path, (fileCommitCounts.get(path) ?? 0) + 1);
    }

    for (let i = 0; i < paths.length; i++) {
      const a = paths[i]!;
      for (let j = i + 1; j < paths.length; j++) {
        const b = paths[j]!;
        const key = pairKey(a, b);
        sharedCounts.set(key, (sharedCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const pairs: CoupledPair[] = [];

  for (const [key, shared] of sharedCounts) {
    if (shared < options.minSharedCommits) continue;
    const [a, b] = key.split('\0');
    const commitsA = fileCommitCounts.get(a)!;
    const commitsB = fileCommitCounts.get(b)!;
    const score = couplingScore(shared, commitsA, commitsB);
    if (score < options.couplingThreshold) continue;
    pairs.push({
      a: a < b ? a : b,
      b: a < b ? b : a,
      score,
      sharedCommits: shared,
    });
  }

  return pairs.sort((x, y) => y.score - x.score || x.a.localeCompare(y.a));
}
