import type { ForensicClassification } from '../models/schema';

export function classifyFile(metrics: {
  hotspotScore: number;
  complexity: number;
  authorCount: number;
  topAuthorPercent?: number;
  hotspotThreshold: number;
  complexityThreshold: number;
  /** Minimum dominant-author share to classify knowledge-silo (default 1.0 = sole author). */
  siloTopAuthorPercent?: number;
}): ForensicClassification[] {
  const out: ForensicClassification[] = [];
  if (metrics.hotspotScore >= metrics.hotspotThreshold) {
    out.push('hotspot');
  }

  const siloThreshold = metrics.siloTopAuthorPercent ?? 1;
  if (metrics.complexity >= metrics.complexityThreshold && metrics.authorCount > 0) {
    const ownership = metrics.topAuthorPercent ?? (metrics.authorCount === 1 ? 1 : 0);
    if (ownership >= siloThreshold) {
      out.push('knowledge-silo');
    }
  }

  return out;
}
