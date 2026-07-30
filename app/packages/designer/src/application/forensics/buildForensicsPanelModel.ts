import type { NodeForensics } from '@archlens/core';
import {
  buildOwnershipBreakdown,
  churnAccelerationRatio,
  churnAccelerationTone,
  computeCompositeRiskScore,
  formatChurnAcceleration,
  type OwnershipBreakdown,
} from '@archlens/core/forensics';
import { evaluateForensicsConcern, type ConcernLevel, type ForensicsConcern } from './concern';

export type ForensicsMetricRow = {
  label: string;
  value: string;
  help?: string;
  tone?: 'danger' | 'warning' | 'none';
};

export type ForensicsPanelModel = {
  concern: ForensicsConcern;
  badgeLabel: string;
  ownership: OwnershipBreakdown | undefined;
  compositeRiskScore?: number;
  metricRows: ForensicsMetricRow[];
  coupledFilesPreview: NonNullable<NodeForensics['coupledFiles']>;
  importedFilesPreview: NonNullable<NodeForensics['importedFiles']>;
  focusableCouplingCount: number;
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
    'Relative risk from complexity × churn (0–1 across the analyzed set). Higher needs attention.',
  compositeRisk:
    'TraceLens × ChaosLens: hotspotScore × blast radius. Highlights code that is hard to change and painful if it fails.',
  lookback: 'Git history window used when these metrics were collected (from CLI --git-since).',
  fileCount: 'Number of source files rolled up into this container or system.',
  hotspotCount: 'How many files under this node are classified as hotspots.',
  siloCount: 'How many files under this node look like knowledge silos (complex, single author).',
};

export const COUPLED_FILES_HELP =
  'Files that often change in the same commits (temporal coupling). Score is Jaccard similarity of commit sets. Enabling focus hides other nodes and shows coupled peers—including cross-diagram matches and unmapped files as dashed ghosts.';

export const COUPLING_SCHEMA_DEPS_HELP =
  'When coupling focus is on, also draw declared schema dependencies (cyan) between the selected node and its coupled peers.';

export const IMPORTED_FILES_HELP =
  'Files this module directly imports (static import graph). These links may exist even when files never co-commit.';

export const FORENSICS_SECTION_HELP =
  'Readonly signals from AST complexity and recent git history. Used to spot hotspots, silos, and change coupling.';

export function concernBadgeClasses(level: ConcernLevel): string {
  switch (level) {
    case 'danger':
      return 'bg-red-950/40 text-red-300 border-red-900/50';
    case 'warning':
      return 'bg-amber-950/40 text-amber-300 border-amber-900/50';
    case 'info':
      return 'bg-slate-900 text-slate-300 border-slate-700';
    default:
      return 'bg-slate-950/40 text-slate-400 border-slate-800';
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export type BuildForensicsPanelModelInput = {
  forensics: NodeForensics;
  blastRadius?: number;
  linkedCouplingCount?: number;
  focusCouplingCount?: number;
};

export function buildForensicsPanelModel({
  forensics,
  blastRadius,
  linkedCouplingCount = 0,
  focusCouplingCount = 0,
}: BuildForensicsPanelModelInput): ForensicsPanelModel {
  const concern = evaluateForensicsConcern(forensics);
  const ownership = buildOwnershipBreakdown(forensics);
  const compositeRiskScore =
    blastRadius != null && blastRadius > 0 && forensics.hotspotScore != null
      ? computeCompositeRiskScore(forensics.hotspotScore, blastRadius)
      : undefined;
  const badgeLabel =
    concern.reasons[0] ??
    (concern.level === 'none' ? 'Healthy' : concern.level === 'info' ? 'Mild' : 'Concern');

  const metricRows: ForensicsMetricRow[] = [];
  const hasDualChurn = forensics.churn30 !== undefined && forensics.churn365 !== undefined;
  const churnAccel =
    hasDualChurn && forensics.churn30 !== undefined && forensics.churn365 !== undefined
      ? churnAccelerationRatio(forensics.churn30, forensics.churn365)
      : null;

  if (forensics.sinceDays !== undefined) {
    metricRows.push({
      label: 'lookback',
      value: `${forensics.sinceDays}d`,
      help: FORENSICS_METRIC_HELP.lookback,
    });
  }
  if (forensics.complexity !== undefined) {
    metricRows.push({
      label: 'complexity',
      value: String(forensics.complexity),
      help: FORENSICS_METRIC_HELP.complexity,
      tone:
        (forensics.complexity ?? 0) >= 10 && forensics.authorCount === 1
          ? 'warning'
          : (forensics.complexity ?? 0) >= 10
            ? 'warning'
            : 'none',
    });
  }
  if (forensics.loc !== undefined) {
    metricRows.push({
      label: 'loc',
      value: String(forensics.loc),
      help: FORENSICS_METRIC_HELP.loc,
    });
  }
  if (forensics.sloc !== undefined) {
    metricRows.push({
      label: 'sloc',
      value: String(forensics.sloc),
      help: FORENSICS_METRIC_HELP.sloc,
    });
  }
  if (hasDualChurn) {
    if (forensics.shortChurnDays !== undefined) {
      metricRows.push({
        label: 'shortWindow',
        value: `${forensics.shortChurnDays}d`,
        help: 'Short churn window used for churn30.',
      });
    }
    metricRows.push({
      label: 'churn30',
      value: String(forensics.churn30),
      help: FORENSICS_METRIC_HELP.churn30,
    });
    metricRows.push({
      label: 'churn365',
      value: String(forensics.churn365),
      help: FORENSICS_METRIC_HELP.churn365,
    });
    if (churnAccel !== null) {
      metricRows.push({
        label: 'churnAccel',
        value: formatChurnAcceleration(churnAccel),
        help: FORENSICS_METRIC_HELP.churnAccel,
        tone: churnAccelerationTone(churnAccel),
      });
    }
  } else if (forensics.churn !== undefined) {
    metricRows.push({
      label: 'churn',
      value: String(forensics.churn),
      help: FORENSICS_METRIC_HELP.churn,
    });
  }
  if (forensics.churnByWeek && forensics.churnByWeek.length > 0) {
    metricRows.push({
      label: 'churnTrend',
      value: `${forensics.churnByWeek.reduce((sum, n) => sum + n, 0)} commits`,
      help: FORENSICS_METRIC_HELP.churnTrend,
    });
  }
  if (forensics.authorCount !== undefined) {
    metricRows.push({
      label: 'authors',
      value: String(forensics.authorCount),
      help: FORENSICS_METRIC_HELP.authors,
      tone: forensics.authorCount === 1 && (forensics.complexity ?? 0) >= 10 ? 'warning' : 'none',
    });
  }
  if (forensics.topAuthorPercent !== undefined) {
    metricRows.push({
      label: 'ownership',
      value: formatPercent(forensics.topAuthorPercent),
      help: FORENSICS_METRIC_HELP.ownership,
    });
  }
  if (forensics.hotspotScore !== undefined) {
    metricRows.push({
      label: 'hotspotScore',
      value: forensics.hotspotScore.toFixed(2),
      help: FORENSICS_METRIC_HELP.hotspotScore,
      tone: forensics.hotspotScore >= 0.5 ? 'danger' : 'none',
    });
  }
  if (compositeRiskScore !== undefined) {
    metricRows.push({
      label: 'compositeRisk',
      value: compositeRiskScore.toFixed(2),
      help: FORENSICS_METRIC_HELP.compositeRisk,
      tone: compositeRiskScore >= 0.25 ? 'danger' : compositeRiskScore >= 0.1 ? 'warning' : 'none',
    });
  }
  if (forensics.fileCount !== undefined) {
    metricRows.push({
      label: 'fileCount',
      value: String(forensics.fileCount),
      help: FORENSICS_METRIC_HELP.fileCount,
    });
  }
  if (forensics.hotspotCount !== undefined) {
    metricRows.push({
      label: 'hotspotCount',
      value: String(forensics.hotspotCount),
      help: FORENSICS_METRIC_HELP.hotspotCount,
      tone: forensics.hotspotCount > 0 ? 'danger' : 'none',
    });
  }
  if (forensics.knowledgeSiloCount !== undefined) {
    metricRows.push({
      label: 'siloCount',
      value: String(forensics.knowledgeSiloCount),
      help: FORENSICS_METRIC_HELP.siloCount,
      tone: forensics.knowledgeSiloCount > 0 ? 'warning' : 'none',
    });
  }

  const coupled = (forensics.coupledFiles ?? []).slice(0, 5);
  const imported = (forensics.importedFiles ?? []).slice(0, 5);
  const focusableCouplingCount =
    focusCouplingCount > 0
      ? focusCouplingCount
      : coupled.length > 0
        ? coupled.length
        : linkedCouplingCount;

  return {
    concern,
    badgeLabel,
    ownership,
    compositeRiskScore,
    metricRows,
    coupledFilesPreview: coupled,
    importedFilesPreview: imported,
    focusableCouplingCount,
  };
}
