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
export { enrichSchemaWithExternals, enrichWorkspaceWithExternals } from './externalEnrichment';
export {
  listCrossContainerComponentDependencies,
  resolveCouplingSourceOnContainerDiagram,
  enrichContainerSchemaFromComponentDeps,
} from './containerRollup';
