import type { NodeForensics } from '@archlens/core';
import {
  churnAccelerationRatio,
  churnAccelerationTone,
  formatChurnAcceleration,
} from '@archlens/core/forensics';

export type ForensicsMetricRow = {
  label: string;
  value: string;
  help?: string;
  tone?: 'danger' | 'warning' | 'none';
};

/** User-facing explanations for each forensics metric key. */
export const FORENSICS_METRIC_HELP: Record<string, string> = {
  complexity: 'Cyclomatic complexity from the AST - higher means more branching and harder review.',
  loc: 'Total lines of code in the file, including blanks and comments.',
  sloc: 'Source lines of code - non-blank, non-comment lines.',
  churn: 'How many times this file changed in the git lookback window.',
  churn30: 'Commits in the last 30 days - compare to churn365 to spot accelerating hotspots.',
  churn365: 'Commits in the full lookback window (typically 365 days).',
  churnAccel:
    'How much faster the file is changing now vs its long-window monthly average. Above 2× suggests accelerating churn.',
  churnTrend: 'Weekly commit count over the lookback window (oldest week on the left).',
  authors: 'Distinct git authors who edited this file in the lookback window.',
  ownership: 'Share of recent commits by the top author - high means concentrated ownership.',
  hotspotScore:
    'Relative risk from complexity × churn (or line churn when available). 0–1 across the analyzed set.',
  lineChurn:
    'Lines added + removed in the git lookback window — often a sharper hotspot signal than commit count alone.',
  complexityPeak:
    'Highest cyclomatic complexity among functions in this file — spots localized complexity spikes.',
  cognitiveComplexity:
    'Peak cognitive complexity (nested control flow) among functions — harder to read than flat cyclomatic count.',
  functionCount: 'Number of functions/methods detected in the file AST.',
  compositeRisk:
    'TraceLens × ChaosLens: hotspotScore × blast radius. Highlights code that is hard to change and painful if it fails.',
  lookback: 'Git history window used when these metrics were collected (from CLI --git-since).',
  fileCount: 'Number of source files rolled up into this container or system.',
  hotspotCount: 'How many files under this node are classified as hotspots.',
  siloCount: 'How many files under this node look like knowledge silos (complex, single author).',
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function pushComplexityRows(rows: ForensicsMetricRow[], forensics: NodeForensics): void {
  if (forensics.complexity !== undefined) {
    rows.push({
      label: 'complexity',
      value: String(forensics.complexity),
      help: FORENSICS_METRIC_HELP.complexity,
      tone: (forensics.complexity ?? 0) >= 10 ? 'warning' : 'none',
    });
  }
  if (forensics.complexityPeak !== undefined) {
    rows.push({
      label: 'complexityPeak',
      value: String(forensics.complexityPeak),
      help: FORENSICS_METRIC_HELP.complexityPeak,
      tone: forensics.complexityPeak >= 15 ? 'warning' : 'none',
    });
  }
  if (forensics.cognitiveComplexity !== undefined) {
    rows.push({
      label: 'cognitiveComplexity',
      value: String(forensics.cognitiveComplexity),
      help: FORENSICS_METRIC_HELP.cognitiveComplexity,
      tone: forensics.cognitiveComplexity >= 15 ? 'warning' : 'none',
    });
  }
  if (forensics.functionCount !== undefined) {
    rows.push({
      label: 'functionCount',
      value: String(forensics.functionCount),
      help: FORENSICS_METRIC_HELP.functionCount,
    });
  }
  if (forensics.loc !== undefined) {
    rows.push({
      label: 'sloc',
      value: String(forensics.sloc),
      help: FORENSICS_METRIC_HELP.sloc,
    });
  }
}

function pushChurnRows(rows: ForensicsMetricRow[], forensics: NodeForensics): void {
  const hasDualChurn = forensics.churn30 !== undefined && forensics.churn365 !== undefined;

  if (hasDualChurn) {
    if (forensics.shortChurnDays !== undefined) {
      rows.push({
        label: 'shortWindow',
        value: `${forensics.shortChurnDays}d`,
        help: 'Short churn window used for churn30.',
      });
    }
    rows.push({
      label: 'churn30',
      value: String(forensics.churn30),
      help: FORENSICS_METRIC_HELP.churn30,
    });
    rows.push({
      label: 'churn365',
      value: String(forensics.churn365),
      help: FORENSICS_METRIC_HELP.churn365,
    });
    const churnAccel = churnAccelerationRatio(forensics.churn30!, forensics.churn365!);
    if (churnAccel !== null) {
      rows.push({
        label: 'churnAccel',
        value: formatChurnAcceleration(churnAccel),
        help: FORENSICS_METRIC_HELP.churnAccel,
        tone: churnAccelerationTone(churnAccel),
      });
    }
  } else if (forensics.churn !== undefined) {
    rows.push({
      label: 'churn',
      value: String(forensics.churn),
      help: FORENSICS_METRIC_HELP.churn,
    });
  }

  if (forensics.lineChurn !== undefined && forensics.lineChurn > 0) {
    rows.push({
      label: 'lineChurn',
      value: String(forensics.lineChurn),
      help: FORENSICS_METRIC_HELP.lineChurn,
    });
  }
  if (forensics.churnByWeek && forensics.churnByWeek.length > 0) {
    rows.push({
      label: 'churnTrend',
      value: `${forensics.churnByWeek.reduce((sum, n) => sum + n, 0)} commits`,
      help: FORENSICS_METRIC_HELP.churnTrend,
    });
  }
}

function pushOwnershipAndRiskRows(
  rows: ForensicsMetricRow[],
  forensics: NodeForensics,
  compositeRiskScore: number | undefined
): void {
  if (forensics.authorCount !== undefined) {
    rows.push({
      label: 'authors',
      value: String(forensics.authorCount),
      help: FORENSICS_METRIC_HELP.authors,
      tone: forensics.authorCount === 1 && (forensics.complexity ?? 0) >= 10 ? 'warning' : 'none',
    });
  }
  if (forensics.topAuthorPercent !== undefined) {
    rows.push({
      label: 'ownership',
      value: formatPercent(forensics.topAuthorPercent),
      help: FORENSICS_METRIC_HELP.ownership,
    });
  }
  if (forensics.hotspotScore !== undefined) {
    rows.push({
      label: 'hotspotScore',
      value: forensics.hotspotScore.toFixed(2),
      help: FORENSICS_METRIC_HELP.hotspotScore,
      tone: forensics.hotspotScore >= 0.5 ? 'danger' : 'none',
    });
  }
  if (compositeRiskScore !== undefined) {
    rows.push({
      label: 'compositeRisk',
      value: compositeRiskScore.toFixed(2),
      help: FORENSICS_METRIC_HELP.compositeRisk,
      tone: compositeRiskScore >= 0.25 ? 'danger' : compositeRiskScore >= 0.1 ? 'warning' : 'none',
    });
  }
}

function pushRollupRows(rows: ForensicsMetricRow[], forensics: NodeForensics): void {
  if (forensics.fileCount !== undefined) {
    rows.push({
      label: 'fileCount',
      value: String(forensics.fileCount),
      help: FORENSICS_METRIC_HELP.fileCount,
    });
  }
  if (forensics.hotspotCount !== undefined) {
    rows.push({
      label: 'hotspotCount',
      value: String(forensics.hotspotCount),
      help: FORENSICS_METRIC_HELP.hotspotCount,
      tone: forensics.hotspotCount > 0 ? 'danger' : 'none',
    });
  }
  if (forensics.knowledgeSiloCount !== undefined) {
    rows.push({
      label: 'siloCount',
      value: String(forensics.knowledgeSiloCount),
      help: FORENSICS_METRIC_HELP.siloCount,
      tone: forensics.knowledgeSiloCount > 0 ? 'warning' : 'none',
    });
  }
}

/**
 * Build ordered metric rows for the forensics property-panel section.
 */
export function buildForensicsMetricRows(
  forensics: NodeForensics,
  compositeRiskScore: number | undefined
): ForensicsMetricRow[] {
  const rows: ForensicsMetricRow[] = [];

  if (forensics.sinceDays !== undefined) {
    rows.push({
      label: 'lookback',
      value: `${forensics.sinceDays}d`,
      help: FORENSICS_METRIC_HELP.lookback,
    });
  }

  pushComplexityRows(rows, forensics);
  pushChurnRows(rows, forensics);
  pushOwnershipAndRiskRows(rows, forensics, compositeRiskScore);
  pushRollupRows(rows, forensics);

  return rows;
}
