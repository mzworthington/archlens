import {
  EntityRef as EntityRefUtil,
  type EntityRef,
  type SystemDependency,
  type SystemSchema,
} from '../models/schema';
import {
  buildWorkspaceEntityIndex,
  type LoadedSystemInput,
  type WorkspaceEntityIndex,
} from '../rules/workspaceExternals';

function dependencyKey(dep: SystemDependency): string {
  return `${dep.from}\0${dep.to}\0${dep.type}`;
}

function touchesEntity(dep: SystemDependency, entityRef: EntityRef): boolean {
  if (dep.from === entityRef || dep.to === entityRef) return true;
  const parent = EntityRefUtil.getParent(entityRef);
  return dep.from === parent || dep.to === parent;
}

function rollDependencyToActiveLevel(
  dep: SystemDependency,
  homeSchema: SystemSchema,
  activeSchema: SystemSchema
): SystemDependency {
  if (activeSchema.level !== 'container' || homeSchema.level !== 'component') return dep;

  return {
    ...dep,
    from: EntityRefUtil.getParent(dep.from) ?? dep.from,
    to: EntityRefUtil.getParent(dep.to) ?? dep.to,
  };
}

function resolveHomeSchema(
  entityRef: EntityRef,
  index: WorkspaceEntityIndex,
  loadedSystems: LoadedSystemInput[]
): SystemSchema | undefined {
  const entity = index.byRef.get(entityRef);
  if (entity) {
    return loadedSystems.find(system => system.path === entity.sourcePath)?.schema;
  }

  const parent = EntityRefUtil.getParent(entityRef);
  if (!parent) return undefined;
  const parentEntity = index.byRef.get(parent);
  if (!parentEntity) return undefined;
  return loadedSystems.find(system => system.path === parentEntity.sourcePath)?.schema;
}

function collectProxyExpansionSeeds(
  schema: SystemSchema,
  scopeRefs: Set<EntityRef>,
  faultTargets: EntityRef[],
  index: WorkspaceEntityIndex
): Set<EntityRef> {
  const seeds = new Set<EntityRef>();
  const activeDiagramRef = schema.entityRef?.trim();

  for (const node of schema.nodes) {
    if (node.external && node.entityRef && scopeRefs.has(node.entityRef)) {
      seeds.add(node.entityRef);
    }
  }

  for (const ref of [...faultTargets, ...scopeRefs]) {
    if (seeds.has(ref)) continue;
    const entity = index.byRef.get(ref);
    if (!entity) continue;

    const homeDiagramRef = entity.parentContainerRef ?? EntityRefUtil.getParent(ref);
    const isNativeOnActiveDiagram = schema.nodes.some(
      node => node.entityRef === ref && !node.external
    );
    if (isNativeOnActiveDiagram) continue;
    if (activeDiagramRef && homeDiagramRef && homeDiagramRef !== activeDiagramRef) {
      seeds.add(ref);
    }
  }

  return seeds;
}

function collectHomeDependenciesForSeed(
  seed: EntityRef,
  homeSchema: SystemSchema,
  activeSchema: SystemSchema
): SystemDependency[] {
  const results: SystemDependency[] = [];
  const seen = new Set<string>();

  for (const dep of homeSchema.dependencies ?? []) {
    if (!touchesEntity(dep, seed)) continue;

    const rolled = rollDependencyToActiveLevel(dep, homeSchema, activeSchema);
    const key = dependencyKey(rolled);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(rolled);
  }

  return results;
}

function mergeDependencies(schema: SystemSchema, additions: SystemDependency[]): SystemSchema {
  if (additions.length === 0) return schema;

  const existing = new Set((schema.dependencies ?? []).map(dependencyKey));
  const merged = [...(schema.dependencies ?? [])];

  for (const dep of additions) {
    const key = dependencyKey(dep);
    if (existing.has(key)) continue;
    existing.add(key);
    merged.push(dep);
  }

  return { ...schema, dependencies: merged };
}

/**
 * Expand the simulation graph through external proxy boundaries into each proxy's
 * home diagram subgraph (Phase 3).
 */
export function expandSimulationSchemaThroughProxies(
  schema: SystemSchema,
  scopeRefs: Set<EntityRef>,
  loadedSystems: LoadedSystemInput[],
  faultTargets: EntityRef[] = []
): { schema: SystemSchema; expandedRefs: EntityRef[] } {
  if (!loadedSystems.length) {
    return { schema, expandedRefs: [] };
  }

  const index = buildWorkspaceEntityIndex(loadedSystems);
  const seeds = collectProxyExpansionSeeds(schema, scopeRefs, faultTargets, index);
  if (seeds.size === 0) {
    return { schema, expandedRefs: [] };
  }

  const expandedRefs = new Set<EntityRef>();
  let nextSchema = schema;
  const existing = new Set((schema.dependencies ?? []).map(dependencyKey));

  for (const seed of seeds) {
    const homeSchema = resolveHomeSchema(seed, index, loadedSystems);
    if (!homeSchema) continue;

    const homeDeps = collectHomeDependenciesForSeed(seed, homeSchema, schema);
    const newDeps: SystemDependency[] = [];
    for (const dep of homeDeps) {
      const key = dependencyKey(dep);
      if (existing.has(key)) continue;
      existing.add(key);
      newDeps.push(dep);
      expandedRefs.add(dep.from);
      expandedRefs.add(dep.to);
    }
    nextSchema = mergeDependencies(nextSchema, newDeps);
  }

  return {
    schema: nextSchema,
    expandedRefs: [...expandedRefs].sort((a, b) => a.localeCompare(b)),
  };
}
