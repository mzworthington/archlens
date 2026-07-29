import type { EntityRef, SystemSchema } from '../models/schema';
import { positionExternalNodes } from '../rules/externalNodeLayout';
import {
  buildWorkspaceEntityIndex,
  enrichContainerSchemaFromComponentDeps,
  listUnresolvedDependencyEndpoints,
  materializeExternalNodes,
  type LoadedSystemInput,
  type WorkspaceEntity,
} from '../rules/workspaceExternals';

export interface SimulationSchemaResult {
  schema: SystemSchema;
  /** Entity refs in the Phase 1 simulation neighborhood (fault target + direct neighbors). */
  scope: EntityRef[];
  /** Workspace entities newly materialized as external proxies for this run. */
  materialized: WorkspaceEntity[];
}

/** Direct dependency neighbors of the fault target (both directions). */
export function collectSimulationNeighborRefs(
  schema: SystemSchema,
  faultTarget: EntityRef
): Set<EntityRef> {
  const refs = new Set<EntityRef>([faultTarget]);

  for (const dep of schema.dependencies ?? []) {
    if (dep.from !== faultTarget && dep.to !== faultTarget) continue;
    refs.add(dep.from);
    refs.add(dep.to);
  }

  return refs;
}

function enrichSchemaWithEntities(
  activeSchema: SystemSchema,
  entities: WorkspaceEntity[]
): SystemSchema {
  if (entities.length === 0) return activeSchema;

  const existingRefs = new Set(activeSchema.nodes.map(n => n.entityRef));
  const missing = entities.filter(entity => !existingRefs.has(entity.entityRef));
  if (missing.length === 0) return activeSchema;

  const externalNodes = materializeExternalNodes(
    missing,
    missing.map(() => ({ x: 0, y: 0 }))
  );
  const nodes = positionExternalNodes(
    [...activeSchema.nodes, ...externalNodes],
    activeSchema.dependencies ?? []
  );

  return { ...activeSchema, nodes };
}

/**
 * Build an enriched schema for ChaosLens simulation: materialize direct external
 * neighbors of the fault target that exist in the workspace but are missing from
 * the active diagram.
 */
export function buildSimulationSchema(
  activeSchema: SystemSchema,
  faultTarget: EntityRef,
  loadedSystems?: LoadedSystemInput[]
): SimulationSchemaResult {
  let workingSchema = activeSchema;
  const neighborRefs = collectSimulationNeighborRefs(workingSchema, faultTarget);
  const scope = [...neighborRefs];

  if (!loadedSystems?.length) {
    return { schema: workingSchema, scope, materialized: [] };
  }

  const index = buildWorkspaceEntityIndex(loadedSystems);

  if (workingSchema.level === 'container') {
    workingSchema = enrichContainerSchemaFromComponentDeps(workingSchema, loadedSystems, index);
    for (const ref of collectSimulationNeighborRefs(workingSchema, faultTarget)) {
      neighborRefs.add(ref);
    }
  }

  const onDiagram = new Set(workingSchema.nodes.map(n => n.entityRef));
  const toMaterialize: WorkspaceEntity[] = [];

  for (const ref of neighborRefs) {
    if (onDiagram.has(ref)) continue;
    const entity = index.byRef.get(ref);
    if (entity) toMaterialize.push(entity);
  }

  const materialized = toMaterialize.sort((a, b) => a.entityRef.localeCompare(b.entityRef));
  const enriched = enrichSchemaWithEntities(workingSchema, materialized);

  return {
    schema: enriched,
    scope: [...neighborRefs],
    materialized,
  };
}

/**
 * Materialize every unresolved dependency endpoint that exists in the workspace.
 * Used when entering ChaosLens so cross-diagram dependencies are visible before Simulate.
 */
export function materializeUnresolvedSimulationEndpoints(
  activeSchema: SystemSchema,
  loadedSystems?: LoadedSystemInput[]
): SimulationSchemaResult {
  const unresolvedRefs = listUnresolvedDependencyEndpoints(activeSchema);
  const scope = [...activeSchema.nodes.map(node => node.entityRef), ...unresolvedRefs];

  if (!loadedSystems?.length || unresolvedRefs.length === 0) {
    return { schema: activeSchema, scope, materialized: [] };
  }

  const index = buildWorkspaceEntityIndex(loadedSystems);
  const onDiagram = new Set(activeSchema.nodes.map(node => node.entityRef));
  const toMaterialize: WorkspaceEntity[] = [];

  for (const ref of unresolvedRefs) {
    if (onDiagram.has(ref)) continue;
    const entity = index.byRef.get(ref);
    if (entity) toMaterialize.push(entity);
  }

  const materialized = toMaterialize.sort((a, b) => a.entityRef.localeCompare(b.entityRef));
  const enriched = enrichSchemaWithEntities(activeSchema, materialized);

  return {
    schema: enriched,
    scope,
    materialized,
  };
}
