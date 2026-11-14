import {
  listChildDiagramExternals,
  resolveChildDiagramEntry,
  resolveExternalNodeKind,
  type ExternalNodeKind,
  type WorkspaceCatalogEntry,
} from '@archlens/core';
import type { ComponentNodeData } from '../../../../../application/store/store';
import type { ForensicsConcern } from '../../../../../application/forensics/concern';
import type { LoadedSystemRef } from '../../../../../application/forensics/concern';

function resolveConcernBorder(concern: ForensicsConcern): string | null {
  if (concern.level === 'danger') return 'border-red-800/80';
  if (concern.level === 'warning') return 'border-amber-800/80';
  return null;
}

function resolveBlueprintNodeBorderClass(
  data: ComponentNodeData,
  selected: boolean | undefined,
  concern: ForensicsConcern
): string {
  if (data.hiddenExternalGhost) {
    return 'border-dashed border-cyan-500/70 bg-cyan-950/30 hover:border-cyan-400/80';
  }
  if (data.couplingGhost) {
    return 'border-dashed border-amber-500/70 bg-amber-950/30 hover:border-amber-400/80';
  }
  if (data.external) {
    return 'border-dashed border-cyan-600/70 bg-cyan-950 hover:border-cyan-500/80';
  }
  if (data.isResilienceFaultTarget) {
    return 'resilience-fault-target';
  }
  if (selected) {
    return 'border-brand-500 bg-slate-900 scale-102';
  }
  if (data.dependencyRole === 'upstream') {
    return 'border-violet-500/70 bg-slate-900';
  }
  if (data.dependencyRole === 'downstream') {
    return 'border-emerald-500/70 bg-slate-900';
  }
  if (data.couplingHighlight) {
    return 'border-amber-500/70 bg-slate-900';
  }
  if (data.refactorBoundaryHighlight) {
    return 'border-violet-500/70 bg-slate-900';
  }
  if (data.resilienceSafeguards) {
    return 'resilience-safeguard';
  }
  const concernBorder = resolveConcernBorder(concern);
  if (concernBorder) {
    return `${concernBorder} bg-slate-950 hover:border-slate-700`;
  }
  return 'bg-slate-950 border-slate-800 hover:border-slate-700';
}

function resolveBlueprintNodeTestId(
  liteCanvas: boolean,
  activeSafeguards: ComponentNodeData['resilienceSafeguards'],
  showRiskVisualization: boolean
): string {
  if (liteCanvas) return 'blueprint-node-simplified';
  if (activeSafeguards) return 'resilience-safeguard-node';
  if (showRiskVisualization) return 'hotspot-heat';
  return 'blueprint-node';
}

export interface BlueprintNodeVisualState {
  canZoom: boolean;
  canCreateZoom: boolean;
  childExternalsCount: number;
  sourceFilepath: string | undefined;
  showSourceCodeButton: boolean;
  externalKind: ExternalNodeKind | null;
  showHotBadge: boolean;
  showSiloBadge: boolean;
  hotspotHeat: number;
  blastHeat: number;
  integrityHeat: number;
  showHotspotHeat: boolean;
  showAvailabilityRisk: boolean;
  showIntegrityRisk: boolean;
  showBlastRipple: boolean;
  isOutOfSimulationScope: boolean;
  borderClass: string;
  resilienceTitle: string;
  testId: string;
}

function numericHeat(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function resolveResilienceTitle(
  name: string,
  showAvailabilityRisk: boolean,
  showIntegrityRisk: boolean,
  blastHeat: number,
  integrityHeat: number
): string {
  if (!showAvailabilityRisk && !showIntegrityRisk) return name;
  const parts: string[] = [];
  if (showAvailabilityRisk) {
    parts.push(`Availability ${Math.round((1 - blastHeat) * 100)}%`);
  }
  if (showIntegrityRisk) {
    parts.push(`Integrity ${Math.round((1 - integrityHeat) * 100)}%`);
  }
  return parts.join(' · ');
}

export function resolveBlueprintNodeVisualState(input: {
  data: ComponentNodeData;
  selected: boolean | undefined;
  liteCanvas: boolean;
  concern: ForensicsConcern;
  workspaceCatalog: WorkspaceCatalogEntry[];
  loadedSystems: LoadedSystemRef[];
}): BlueprintNodeVisualState {
  const { data, selected, liteCanvas, concern, workspaceCatalog, loadedSystems } = input;
  const entityRef = data.entityRef;
  const canZoom = entityRef
    ? Boolean(resolveChildDiagramEntry(workspaceCatalog, entityRef))
    : false;
  const canCreateZoom = Boolean(
    entityRef && !canZoom && !data.external && !data.couplingGhost && !data.hiddenExternalGhost
  );
  const childExternalsCount =
    canZoom && entityRef
      ? listChildDiagramExternals(workspaceCatalog, loadedSystems, entityRef).length
      : 0;
  const sourceFilepath =
    typeof data.properties?.filepath === 'string' ? data.properties.filepath : undefined;
  const showSourceCodeButton = Boolean(sourceFilepath) && !canZoom;

  const classifications = data.forensics?.classifications ?? [];
  const externalKind = data.external
    ? resolveExternalNodeKind({ external: data.external, properties: data.properties })
    : null;
  const showHotBadge = classifications.includes('hotspot') || concern.level === 'danger';
  const showSiloBadge =
    classifications.includes('knowledge-silo') ||
    (concern.level === 'warning' && concern.reasons.some(r => /silo/i.test(r)));

  const hotspotHeat = numericHeat(data.hotspotHeat);
  const blastHeat = numericHeat(data.blastHeat);
  const integrityHeat = numericHeat(data.integrityHeat);
  const showHotspotHeat = hotspotHeat > 0.08;
  const showAvailabilityRisk = blastHeat > 0.08;
  const showIntegrityRisk = integrityHeat > 0.08;
  const showRiskVisualization = showHotspotHeat || showAvailabilityRisk || showIntegrityRisk;

  return {
    canZoom,
    canCreateZoom,
    childExternalsCount,
    sourceFilepath,
    showSourceCodeButton,
    externalKind,
    showHotBadge,
    showSiloBadge,
    hotspotHeat,
    blastHeat,
    integrityHeat,
    showHotspotHeat,
    showAvailabilityRisk,
    showIntegrityRisk,
    showBlastRipple: Boolean(data.blastRipple) && !liteCanvas,
    isOutOfSimulationScope: Boolean(data.resilienceOutOfScope),
    borderClass: resolveBlueprintNodeBorderClass(data, selected, concern),
    resilienceTitle: resolveResilienceTitle(
      data.name,
      showAvailabilityRisk,
      showIntegrityRisk,
      blastHeat,
      integrityHeat
    ),
    testId: resolveBlueprintNodeTestId(
      liteCanvas,
      data.resilienceSafeguards,
      showRiskVisualization
    ),
  };
}
