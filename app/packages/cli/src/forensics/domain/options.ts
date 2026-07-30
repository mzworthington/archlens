import { DEFAULT_FORENSICS_GLOB } from './forensicsGlob.ts';

export interface ForensicsOptions {
  /** Lookback window for churn / authors / coupling. Default 365. */
  sinceDays: number;
  /** Short churn window for trend comparison. Default 30. Set to 0 to disable dual windows. */
  shortChurnDays: number;
  /** Minimum hotspotScore to classify as Hotspot. Default 0.5. */
  hotspotThreshold: number;
  /** Minimum complexity to consider for Knowledge Silo. Default 10. */
  complexityThreshold: number;
  /** Minimum dominant-author share for Knowledge Silo (default 1 = sole author). */
  siloTopAuthorPercent: number;
  /** Minimum shared commits before a coupling pair is reported. Default 5. */
  minSharedCommits: number;
  /** Minimum coupling Jaccard score to report a pair. Default 0.75. */
  couplingThreshold: number;
  /**
   * When > 0, skip AST complexity for files with churn below this value.
   * Default 0 (always compute structural metrics).
   */
  minChurnForComplexity: number;
  /** Glob for structural scan. Default common source extensions. */
  glob: string;
  ignore: string[];
  include: string[];
}

export const DEFAULT_FORENSICS_OPTIONS: ForensicsOptions = {
  sinceDays: 365,
  shortChurnDays: 30,
  hotspotThreshold: 0.5,
  complexityThreshold: 10,
  siloTopAuthorPercent: 1,
  minSharedCommits: 5,
  couplingThreshold: 0.75,
  minChurnForComplexity: 0,
  glob: DEFAULT_FORENSICS_GLOB,
  ignore: [],
  include: [],
};

export function mergeForensicsOptions(
  base: ForensicsOptions,
  overrides: Partial<ForensicsOptions> = {}
): ForensicsOptions {
  return {
    sinceDays: overrides.sinceDays ?? base.sinceDays,
    shortChurnDays: overrides.shortChurnDays ?? base.shortChurnDays,
    hotspotThreshold: overrides.hotspotThreshold ?? base.hotspotThreshold,
    complexityThreshold: overrides.complexityThreshold ?? base.complexityThreshold,
    siloTopAuthorPercent: overrides.siloTopAuthorPercent ?? base.siloTopAuthorPercent,
    minSharedCommits: overrides.minSharedCommits ?? base.minSharedCommits,
    couplingThreshold: overrides.couplingThreshold ?? base.couplingThreshold,
    minChurnForComplexity: overrides.minChurnForComplexity ?? base.minChurnForComplexity,
    glob: overrides.glob ?? base.glob,
    ignore: overrides.ignore !== undefined ? overrides.ignore : base.ignore,
    include: overrides.include !== undefined ? overrides.include : base.include,
  };
}
