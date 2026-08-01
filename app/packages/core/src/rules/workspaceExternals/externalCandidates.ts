import type { EntityRef, SystemSchema } from '../../models/schema';
import type {
  EnrichExternalsOptions,
  ExternalCandidateFilters,
  LoadedSystemInput,
  WorkspaceEntity,
  WorkspaceEntityIndex,
} from './types';
import {
  isExcludedFromExternalCandidates,
  listUnresolvedDependencyEndpoints,
} from './diagramScope';
import { collectComponentDiagramNeighborRefs } from './containerDiagramScope';

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * List workspace entities that can be materialized as external nodes on the active diagram.
 */
export function listExternalCandidates(
  activeSchema: SystemSchema,
  index: WorkspaceEntityIndex,
  filters: ExternalCandidateFilters = {}
): WorkspaceEntity[] {
  const search = filters.search ? normalizeSearch(filters.search) : '';
  const results: WorkspaceEntity[] = [];

  for (const entity of index.byRef.values()) {
    if (isExcludedFromExternalCandidates(entity.entityRef, activeSchema)) continue;

    if (
      filters.sourceSchemaLevels &&
      !filters.sourceSchemaLevels.includes(entity.sourceSchemaLevel)
    ) {
      continue;
    }

    if (filters.types && !filters.types.includes(entity.type)) {
      continue;
    }

    if (search) {
      const haystack = `${entity.name} ${entity.entityRef}`.toLowerCase();
      if (!haystack.includes(search)) continue;
    }

    results.push(entity);
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

function collectContainerNeighborRefs(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[]
): EntityRef[] {
  if (activeSchema.level === 'container') {
    const onDiagram = new Set(activeSchema.nodes.map(n => n.entityRef));
    const related = new Set<EntityRef>();
    for (const dep of activeSchema.dependencies) {
      if (onDiagram.has(dep.from)) related.add(dep.to);
      if (onDiagram.has(dep.to)) related.add(dep.from);
    }
    return [...related];
  }

  if (activeSchema.level === 'context') {
    const onDiagram = new Set(activeSchema.nodes.map(n => n.entityRef));
    const related = new Set<EntityRef>();
    for (const dep of activeSchema.dependencies) {
      if (onDiagram.has(dep.from)) related.add(dep.to);
      if (onDiagram.has(dep.to)) related.add(dep.from);
    }
    return [...related];
  }

  if (activeSchema.level !== 'component' || !activeSchema.entityRef) return [];

  return collectComponentDiagramNeighborRefs(activeSchema, loadedSystems);
}

function collectCrossDiagramRefs(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[]
): EntityRef[] {
  // Context scopes (e.g. `blueprint`) match almost every ref - never fan out here.
  if (activeSchema.level === 'context') return [];

  const scope = activeSchema.entityRef?.trim();
  if (!scope) return [];

  const refs = new Set<EntityRef>();

  const touchesScope = (ref: string) => ref === scope || ref.startsWith(`${scope}/`);

  for (const system of loadedSystems) {
    for (const dep of system.schema.dependencies) {
      const fromExternal = !isExcludedFromExternalCandidates(dep.from, activeSchema);
      const toExternal = !isExcludedFromExternalCandidates(dep.to, activeSchema);

      if (touchesScope(dep.from) && toExternal) refs.add(dep.to);
      if (touchesScope(dep.to) && fromExternal) refs.add(dep.from);
    }
  }

  return [...refs];
}

/**
 * Infer workspace entities that are likely external dependencies for the active diagram.
 */
export function suggestExternalDependencies(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[],
  index: WorkspaceEntityIndex
): WorkspaceEntity[] {
  const suggestedRefs = new Set<EntityRef>([
    ...collectContainerNeighborRefs(activeSchema, loadedSystems),
    ...collectCrossDiagramRefs(activeSchema, loadedSystems),
    ...listUnresolvedDependencyEndpoints(activeSchema),
  ]);

  const entities: WorkspaceEntity[] = [];
  for (const ref of suggestedRefs) {
    const entity = index.byRef.get(ref);
    if (!entity) continue;
    if (isExcludedFromExternalCandidates(ref, activeSchema)) continue;
    entities.push(entity);
  }

  return entities.sort((a, b) => a.name.localeCompare(b.name));
}

export function filterEntitiesForDiagramLevel(
  activeSchema: SystemSchema,
  entities: WorkspaceEntity[],
  options: EnrichExternalsOptions
): WorkspaceEntity[] {
  if (activeSchema.level === 'context') {
    return entities.filter(entity => entity.sourceSchemaLevel === 'context');
  }

  const containersOnly = options.containersOnlyOnContainerDiagrams !== false;
  if (containersOnly && activeSchema.level === 'container') {
    return entities.filter(entity => entity.sourceSchemaLevel === 'container');
  }

  return entities;
}

export function selectEntitiesForEnrichment(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[],
  index: WorkspaceEntityIndex,
  options: EnrichExternalsOptions
): WorkspaceEntity[] {
  const mode = options.mode ?? 'suggested';
  const entities =
    mode === 'unresolved'
      ? listUnresolvedDependencyEndpoints(activeSchema)
          .map(ref => index.byRef.get(ref))
          .filter((entity): entity is WorkspaceEntity => !!entity)
          .filter(entity => !isExcludedFromExternalCandidates(entity.entityRef, activeSchema))
          .sort((a, b) => a.name.localeCompare(b.name))
      : suggestExternalDependencies(activeSchema, loadedSystems, index);

  return filterEntitiesForDiagramLevel(activeSchema, entities, options);
}
