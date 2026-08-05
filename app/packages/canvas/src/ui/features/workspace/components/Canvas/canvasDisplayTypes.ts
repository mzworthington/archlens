import type {
  EntityRef,
  LoadedSystemInput,
  SystemDependency,
  SystemSchema,
  WorkspaceFilepathIndex,
} from '@archlens/core';
import type { ExternalSummaryBand } from '@archlens/core';
import type { NodeSafeguards, SimulationResult, NodeFaultConfig } from '@archlens/core/resilience';
import type { CouplingEdgeRef } from '../../../../../application/forensics/resolveCouplingEdges';
import type { BlastRippleFrame } from '../../../../../application/resilience/blastRipple';
import type {
  BlueprintRFEdge,
  BlueprintRFNode,
} from '../../../../../application/store/layoutUtils';
import type { DependencyViewMode } from '../../../../../application/forensics/dependencyViewMode';

export type CanvasExternalSummaryContext = {
  schema: SystemSchema;
  loadedSystems: readonly LoadedSystemInput[];
  allNodes: BlueprintRFNode[];
  allEdges: BlueprintRFEdge[];
  showUpstreamExternals: boolean;
  showDownstreamExternals: boolean;
  expandedExternalHub: ExternalSummaryBand | null;
  dependencyViewMode: DependencyViewMode;
};

export type CanvasDisplayNodesInput = {
  filteredNodes: BlueprintRFNode[];
  filteredEdges: BlueprintRFEdge[];
  focusedCyclePath: string[] | null;
  couplingFocusMode: boolean;
  selectedNodeId: string | null;
  dependencyViewMode: DependencyViewMode;
  couplingGhostNodes: BlueprintRFNode[];
  workspaceFilepathIndex: WorkspaceFilepathIndex;
  showCoupling: boolean;
  couplingRefs: CouplingEdgeRef[];
  guidedRefactorEntityRefs: readonly string[] | null;
  showHotspotHeatmap: boolean;
  isResilienceMode: boolean;
  resilienceSafeguards: Partial<Record<EntityRef, NodeSafeguards>>;
  resilienceFaults: NodeFaultConfig[];
  resilienceSimulationResult: SimulationResult | null;
  resilienceSimulationScope: EntityRef[] | null;
  blastRipple: BlastRippleFrame;
  externalSummary?: CanvasExternalSummaryContext;
  hiddenExternalGhostNodes?: BlueprintRFNode[];
};

export type CanvasDisplayEdgesInput = {
  filteredEdges: BlueprintRFEdge[];
  filteredNodes: BlueprintRFNode[];
  displayNodes: BlueprintRFNode[];
  focusedCyclePath: string[] | null;
  couplingRefs: CouplingEdgeRef[];
  showCoupling: boolean;
  couplingGhostNodes: BlueprintRFNode[];
  selectedNodeId: string | null;
  schemaDependencies: SystemDependency[];
  couplingFocusMode: boolean;
  showCouplingSchemaDeps: boolean;
  selectedEdgeId: string | null;
  edges: BlueprintRFEdge[];
  dependencyViewMode: DependencyViewMode;
  liteCanvas: boolean;
  reduceMotion: boolean;
  isResilienceMode: boolean;
  propagationEdgeKeys: Set<string>;
  externalSummary?: CanvasExternalSummaryContext;
  hiddenExternalGhostEdges?: BlueprintRFEdge[];
};
