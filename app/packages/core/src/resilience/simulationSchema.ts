import type { EntityRef, SystemSchema } from '../models/schema';
import { expandEndpoints } from './graph';
import { expandSimulationSchemaThroughProxies } from './simulationProxyExpansion';
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
  /** Entity refs in the simulation neighborhood (fault targets, upstream closure, direct neighbors). */
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

/** Map dependency target → callers, including unresolved diagram endpoints. */
function buildSimulationDependents(schema: SystemSchema): Map<EntityRef, EntityRef[]> {
  const dependents = new Map<EntityRef, EntityRef[]>();

  for (const dep of schema.dependencies ?? []) {
    const sources = expandEndpoints(dep.from, schema);
    const targets = expandEndpoints(dep.to, schema);

    for (const target of targets) {
      for (const source of sources) {
        const list = dependents.get(target);
        if (list) list.push(source);
        else dependents.set(target, [source]);
      }
    }
  }

  return dependents;
}

/** All upstream callers reachable from fault targets (matches blast-radius propagation). */
export function collectSimulationUpstreamRefs(
  schema: SystemSchema,
  faultTargets: EntityRef[]
): Set<EntityRef> {
  const dependents = buildSimulationDependents(schema);
  const scope = new Set<EntityRef>();

  const queue = [...faultTargets];
  for (const target of faultTargets) {
    scope.add(target);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const caller of dependents.get(current) ?? []) {
      if (scope.has(caller)) continue;
      scope.add(caller);
      queue.push(caller);
    }
  }

  return scope;
}

/** Fault targets plus upstream transitive closure and direct dependency neighbors. */
export function collectSimulationScopeRefs(
  schema: SystemSchema,
  faultTargets: EntityRef[]
): Set<EntityRef> {
  const scope = collectSimulationUpstreamRefs(schema, faultTargets);
  for (const target of faultTargets) {
    for (const ref of collectSimulationNeighborRefs(schema, target)) {
      scope.add(ref);
    }
  }
  return scope;
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

function applyProxyBoundaryExpansion(
  schema: SystemSchema,
  scopeRefs: Set<EntityRef>,
  faultTargets: EntityRef[],
  loadedSystems: LoadedSystemInput[]
): { schema: SystemSchema; scopeRefs: Set<EntityRef> } {
  let workingSchema = schema;
  let scope = new Set(scopeRefs);

  for (let pass = 0; pass < 2; pass++) {
    const { schema: expandedSchema, expandedRefs } = expandSimulationSchemaThroughProxies(
      workingSchema,
      scope,
      loadedSystems,
      faultTargets
    );
    if (expandedRefs.length === 0) break;

    workingSchema = expandedSchema;
    for (const ref of expandedRefs) scope.add(ref);
  }

  return { schema: workingSchema, scopeRefs: scope };
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
  return buildSimulationSchemaForFaults(activeSchema, [faultTarget], loadedSystems);
}

export function buildSimulationSchemaForFaults(
  activeSchema: SystemSchema,
  faultTargets: EntityRef[],
  loadedSystems?: LoadedSystemInput[]
): SimulationSchemaResult {
  if (faultTargets.length === 0) {
    return { schema: activeSchema, scope: [], materialized: [] };
  }

  let workingSchema = activeSchema;
  let scopeRefs = collectSimulationScopeRefs(workingSchema, faultTargets);

  if (!loadedSystems?.length) {
    return { schema: workingSchema, scope: [...scopeRefs], materialized: [] };
  }

  const index = buildWorkspaceEntityIndex(loadedSystems);

  if (workingSchema.level === 'container') {
    workingSchema = enrichContainerSchemaFromComponentDeps(workingSchema, loadedSystems, index);
    scopeRefs = collectSimulationScopeRefs(workingSchema, faultTargets);
  }

  ({ schema: workingSchema, scopeRefs } = applyProxyBoundaryExpansion(
    workingSchema,
    scopeRefs,
    faultTargets,
    loadedSystems
  ));

  const onDiagram = new Set(workingSchema.nodes.map(n => n.entityRef));
  const toMaterialize: WorkspaceEntity[] = [];

  for (const ref of scopeRefs) {
    if (onDiagram.has(ref)) continue;
    const entity = index.byRef.get(ref);
    if (entity) toMaterialize.push(entity);
  }

  const materialized = toMaterialize.sort((a, b) => a.entityRef.localeCompare(b.entityRef));
  let enriched = enrichSchemaWithEntities(workingSchema, materialized);

  ({ schema: enriched, scopeRefs } = applyProxyBoundaryExpansion(
    enriched,
    collectSimulationScopeRefs(enriched, faultTargets),
    faultTargets,
    loadedSystems
  ));

  const scope = [...collectSimulationScopeRefs(enriched, faultTargets)];

  return {
    schema: enriched,
    scope,
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
