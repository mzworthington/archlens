import type { NodeForensics } from '@archlens/core';
import {
  buildOwnershipBreakdown,
  computeCompositeRiskScore,
  type OwnershipBreakdown,
} from '@archlens/core/forensics';
import { evaluateForensicsConcern, type ConcernLevel, type ForensicsConcern } from '../concern';
import { buildForensicsMetricRows, type ForensicsMetricRow } from '../forensicsMetricRows';

export type { ForensicsMetricRow };
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

export const COUPLED_FILES_HELP =
  'Files that often change in the same commits (temporal coupling). Score is Jaccard similarity of commit sets. Enabling focus hides other nodes and shows coupled peers - including cross-diagram matches and unmapped files as dashed ghosts.';

export const COUPLING_SCHEMA_DEPS_HELP =
  'When coupling focus is on, also draw declared schema dependencies (cyan) between the selected node and its coupled peers.';

export const IMPORTED_FILES_HELP =
  'Files this module directly imports (static import graph). These links may exist even when files never co-commit.';

export const FORENSICS_SECTION_HELP =
  'Readonly signals from AST complexity and recent git history. Used to spot hotspots, silos and change coupling.';

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

function concernBadgeLabel(concern: ForensicsConcern): string {
  return (
    concern.reasons[0] ??
    (concern.level === 'none' ? 'Healthy' : concern.level === 'info' ? 'Mild' : 'Concern')
  );
}

function resolveFocusableCouplingCount(
  coupledCount: number,
  focusCouplingCount: number,
  linkedCouplingCount: number
): number {
  if (focusCouplingCount > 0) return focusCouplingCount;
  if (coupledCount > 0) return coupledCount;
  return linkedCouplingCount;
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

  const coupled = (forensics.coupledFiles ?? []).slice(0, 5);
  const imported = (forensics.importedFiles ?? []).slice(0, 5);

  return {
    concern,
    badgeLabel: concernBadgeLabel(concern),
    ownership,
    compositeRiskScore,
    metricRows: buildForensicsMetricRows(forensics, compositeRiskScore),
    coupledFilesPreview: coupled,
    importedFilesPreview: imported,
    focusableCouplingCount: resolveFocusableCouplingCount(
      coupled.length,
      focusCouplingCount,
      linkedCouplingCount
    ),
  };
}
