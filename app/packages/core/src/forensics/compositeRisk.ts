export interface ChaosRefactorContext {
  blastRadius: number;
  onCriticalPath: boolean;
  isSpof: boolean;
  safeguardCoverage: number;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Composite risk: how painful a hotspot would be if it failed during an outage.
 * hotspotScore × blastRadius, both clamped to 0–1.
 */
export function computeCompositeRiskScore(hotspotScore: number, blastRadius: number): number {
  return clamp01(hotspotScore) * clamp01(blastRadius);
}

/**
 * Multiplier applied to refactor score when ChaosLens shows elevated blast exposure.
 */
export function computeChaosRefactorMultiplier(ctx: ChaosRefactorContext): number {
  let multiplier = 1;

  if (ctx.blastRadius >= 0.25) {
    multiplier += ctx.blastRadius * 0.6;
  }
  if (ctx.onCriticalPath) {
    multiplier += 0.25;
  }
  if (ctx.isSpof) {
    multiplier += 0.35;
  }
  if (ctx.safeguardCoverage < 0.5) {
    multiplier += (0.5 - ctx.safeguardCoverage) * 0.4;
  }

  return multiplier;
}

export function computeEffectiveRefactorScore(
  refactorScore: number,
  ctx: ChaosRefactorContext
): number {
  if (refactorScore <= 0) return 0;
  return refactorScore * computeChaosRefactorMultiplier(ctx);
}
