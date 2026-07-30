import type { CoupledPair, GitCommit } from './gitHistory';

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

/**
 * Build co-change pairs by walking commits (O(Σ k²) per commit, not O(n²) over all files).
 */
export function computeTemporalCoupling(
  commits: readonly GitCommit[],
  options: { minSharedCommits: number; couplingThreshold: number },
  /** Optional allow-list; when set, only these paths participate. */
  allowedPaths?: ReadonlySet<string>
): CoupledPair[] {
  const fileCommits = new Map<string, Set<string>>();
  const sharedCounts = new Map<string, number>();

  for (const commit of commits) {
    const paths = commit.paths
      .filter(p => !allowedPaths || allowedPaths.has(p))
      .sort((a, b) => a.localeCompare(b));

    for (const path of paths) {
      let set = fileCommits.get(path);
      if (!set) {
        set = new Set();
        fileCommits.set(path, set);
      }
      set.add(commit.hash);
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
    const setA = fileCommits.get(a)!;
    const setB = fileCommits.get(b)!;
    const score = couplingScore(shared, setA.size, setB.size);
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
