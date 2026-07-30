import type { ChaosRefactorContext } from './compositeRisk';

/** Plain-language ChaosLens exposure for TraceLens offender rows. */
export function describeChaosRiskContext(ctx: ChaosRefactorContext): string {
  const parts: string[] = [];

  if (ctx.onCriticalPath) {
    parts.push('on blast-radius path');
  }
  if (ctx.isSpof) {
    parts.push('structural SPOF');
  }
  if (ctx.blastRadius > 0) {
    parts.push(`${Math.round(ctx.blastRadius * 100)}% blast heat`);
  }
  if (ctx.safeguardCoverage < 0.5) {
    parts.push('weak safeguards');
  }

  return parts.join(' · ');
}
