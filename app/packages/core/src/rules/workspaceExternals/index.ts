export type {
  CrossContainerComponentDep,
  EnrichExternalsOptions,
  ExternalCandidateFilters,
  ExternalEnrichMode,
  LoadedSystemInput,
  WorkspaceEntity,
  WorkspaceEntityIndex,
  WorkspaceFilepathIndex,
} from './types';

export { normalizeWorkspaceFilepath, buildWorkspaceFilepathIndex } from './filepath';
export { buildWorkspaceEntityIndex } from './entityIndex';
export {
  isOnActiveDiagram,
  isExcludedFromExternalCandidates,
  listUnresolvedDependencyEndpoints,
} from './diagramScope';
export { materializeExternalNodes } from './externalNodes';
export {
  listExternalCandidates,
  suggestExternalDependencies,
  filterEntitiesForDiagramLevel,
  selectEntitiesForEnrichment,
} from './externalCandidates';
export {
  EXTERNAL_SUMMARY_HUB_CALLERS_ID,
  EXTERNAL_SUMMARY_HUB_TARGETS_ID,
  externalSummaryHubId,
  resolveExternalDisplayLevel,
  rollupEntityRefToDisplayLevel,
  suggestOverviewExternalDependencies,
  classifyOverviewExternalDirection,
  groupOverviewExternalsByBand,
  computeExternalSummaryEdgePairs,
  filterOverviewExternalsForSelection,
  type ExternalSummaryBand,
  type OverviewExternalBands,
  type ExternalSummaryEdgePair,
} from './externalScope';
export { enrichSchemaWithExternals, enrichWorkspaceWithExternals } from './externalEnrichment';
export {
  listCrossContainerComponentDependencies,
  resolveCouplingSourceOnContainerDiagram,
  enrichContainerSchemaFromComponentDeps,
} from './containerRollup';
