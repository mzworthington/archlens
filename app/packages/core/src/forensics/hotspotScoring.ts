/**
 * Min-max normalize a value into [0, 1].
 * When max === min, returns 0 (no discriminative range).
 */
export function minMaxNormalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

export interface HotspotScoreInput {
  path: string;
  complexity: number;
  /** Commit-touch churn (number of commits). */
  churn: number;
  /** Optional line churn (added + removed lines) when git numstat is available. */
  lineChurn?: number;
}

function churnSignal(input: HotspotScoreInput): number {
  if ((input.lineChurn ?? 0) > 0) return input.lineChurn!;
  return input.churn;
}

/**
 * Hotspot score = normalize(complexity) × normalize(churn signal).
 * When all churn signals are zero, falls back to structural-only normalize(complexity).
 */
export function computeHotspotScores(files: ReadonlyArray<HotspotScoreInput>): Map<string, number> {
  const scores = new Map<string, number>();
  if (files.length === 0) return scores;

  let minC = Infinity;
  let maxC = -Infinity;
  let minH = Infinity;
  let maxH = -Infinity;

  for (const f of files) {
    const churn = churnSignal(f);
    if (f.complexity < minC) minC = f.complexity;
    if (f.complexity > maxC) maxC = f.complexity;
    if (churn < minH) minH = churn;
    if (churn > maxH) maxH = churn;
  }

  const flatChurn = maxH === minH && maxH === 0;

  for (const f of files) {
    if (flatChurn) {
      scores.set(f.path, minMaxNormalize(f.complexity, minC, maxC));
      continue;
    }
    const nC = minMaxNormalize(f.complexity, minC, maxC);
    const nH = minMaxNormalize(churnSignal(f), minH, maxH);
    scores.set(f.path, nC * nH);
  }

  return scores;
}
