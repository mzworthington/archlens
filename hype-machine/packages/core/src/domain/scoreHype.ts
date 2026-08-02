import type { FeatureFrame, HypePoint } from "./types.js";

export type ScoreHypeOptions = {
  acousticWeight?: number;
  kineticWeight?: number;
};

/**
 * Interpretable hype score from acoustic + kinetic layers.
 * Missing layers redistribute weight to available signals.
 */
export function scoreHype(
  frames: readonly FeatureFrame[],
  options: ScoreHypeOptions = {},
): HypePoint[] {
  const acousticWeight = options.acousticWeight ?? 0.55;
  const kineticWeight = options.kineticWeight ?? 0.45;

  return frames.map((frame) => {
    const acoustic = clamp01(frame.acousticEnergy);
    const kinetic = clamp01(frame.kineticEnergy);
    const hasAcoustic = frame.acousticEnergy !== undefined;
    const hasKinetic = frame.kineticEnergy !== undefined;

    let score = 0;
    if (hasAcoustic && hasKinetic) {
      score = acousticWeight * (acoustic as number) + kineticWeight * (kinetic as number);
    } else if (hasAcoustic) {
      score = acoustic as number;
    } else if (hasKinetic) {
      score = kinetic as number;
    }

    return { tSec: frame.tSec, score: clamp01(score) ?? 0 };
  });
}

function clamp01(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
