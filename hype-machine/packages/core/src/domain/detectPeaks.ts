import type { HypePeak, HypePoint } from "./types.js";

export type DetectPeaksOptions = {
  /** Rolling baseline window in frames. */
  baselineWindow?: number;
  /** Score must exceed baseline + threshold. */
  riseThreshold?: number;
  /** Minimum consecutive frames above threshold. */
  minDurationFrames?: number;
};

/**
 * Detect sustained hype rises above a rolling baseline.
 */
export function detectPeaks(
  curve: readonly HypePoint[],
  options: DetectPeaksOptions = {},
): HypePeak[] {
  if (curve.length === 0) return [];

  const baselineWindow = options.baselineWindow ?? 8;
  const riseThreshold = options.riseThreshold ?? 0.18;
  const minDurationFrames = options.minDurationFrames ?? 3;

  const peaks: HypePeak[] = [];
  let runStart = -1;
  let runPeakIdx = -1;
  let runPeakScore = -1;

  const flush = (endExclusive: number) => {
    if (runStart < 0) return;
    const duration = endExclusive - runStart;
    if (duration >= minDurationFrames && runPeakIdx >= 0) {
      const start = curve[runStart];
      const end = curve[endExclusive - 1];
      const peak = curve[runPeakIdx];
      if (start && end && peak) {
        peaks.push({
          startSec: start.tSec,
          endSec: end.tSec,
          peakSec: peak.tSec,
          peakScore: peak.score,
        });
      }
    }
    runStart = -1;
    runPeakIdx = -1;
    runPeakScore = -1;
  };

  for (let i = 0; i < curve.length; i++) {
    const point = curve[i];
    if (!point) continue;

    const baseline = rollingMedian(
      curve.slice(Math.max(0, i - baselineWindow), i).map((p) => p.score),
    );
    const above = point.score >= baseline + riseThreshold;

    if (above) {
      if (runStart < 0) {
        runStart = i;
        runPeakIdx = i;
        runPeakScore = point.score;
      } else if (point.score > runPeakScore) {
        runPeakIdx = i;
        runPeakScore = point.score;
      }
    } else {
      flush(i);
    }
  }
  flush(curve.length);

  return peaks;
}

function rollingMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const a = sorted[mid];
  if (a === undefined) return 0;
  if (sorted.length % 2 === 1) return a;
  const b = sorted[mid - 1];
  return ((b ?? a) + a) / 2;
}
