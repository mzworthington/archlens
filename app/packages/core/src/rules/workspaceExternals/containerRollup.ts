import type { EntityRef, SystemDependency, SystemSchema } from '../../models/schema';
import { EntityRef as EntityRefUtil } from '../../models/schema';
import { positionExternalNodes } from '../externalNodeLayout';
import type {
  CrossContainerComponentDep,
  LoadedSystemInput,
  WorkspaceEntity,
  WorkspaceEntityIndex,
} from './types';
import { listUnresolvedDependencyEndpoints } from './diagramScope';
import { materializeExternalNodes } from './externalNodes';

function displayNameForRef(ref: EntityRef, index: WorkspaceEntityIndex): string {
  const entity = index.byRef.get(ref);
  if (entity?.name) {
    return entity.name.replace(/\s*\(External\)\s*$/i, '').trim();
  }
  return EntityRefUtil.leaf(ref);
}

/**
 * List component→component dependencies that cross container boundaries.
 * Uses parent entityRefs (not EntityRef.getLevel) so monorepo paths like
 * `context/system/container/component` still roll up correctly.
 */
export function listCrossContainerComponentDependencies(
  loadedSystems: LoadedSystemInput[]
): CrossContainerComponentDep[] {
  const results: CrossContainerComponentDep[] = [];
  const seen = new Set<string>();

  for (const system of loadedSystems) {
    if (system.schema.level !== 'component') continue;
    for (const dep of system.schema.dependencies) {
      const fromContainer = EntityRefUtil.getParent(dep.from);
      const toContainer = EntityRefUtil.getParent(dep.to);
      if (!fromContainer || !toContainer || fromContainer === toContainer) continue;

      // Ignore edges that are already container↔container (no further parent leaf).
      // Component refs always have a container parent that itself has a parent (system).
      if (!EntityRefUtil.getParent(fromContainer) || !EntityRefUtil.getParent(toContainer)) {
        continue;
      }

      const key = `${dep.from}\0${dep.to}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        fromComponent: dep.from,
        toComponent: dep.to,
        fromContainer,
        toContainer,
        type: dep.type,
      });
    }
  }

  return results;
}

function edgeTouchesContainerDiagram(dep: SystemDependency, schema: SystemSchema): boolean {
  const onDiagram = new Set(schema.nodes.map(n => n.entityRef));
  // Only roll up edges that connect to something already on this diagram.
  return onDiagram.has(dep.from) || onDiagram.has(dep.to);
}

/** Best on-diagram source node for a cross-container component coupling. */
export function resolveCouplingSourceOnContainerDiagram(
  containerSchema: SystemSchema,
  fromComponent: EntityRef,
  fromContainer: EntityRef
): EntityRef | undefined {
  const onDiagram = containerSchema.nodes.map(node => node.entityRef);
  if (onDiagram.includes(fromComponent)) return fromComponent;

  const candidates = containerSchema.nodes
    .filter(node => {
      const ref = node.entityRef;
      if (ref === fromContainer) return true;
      if (fromComponent === ref || fromComponent.startsWith(`${ref}/`)) return true;
      if (fromContainer && ref.startsWith(`${fromContainer}/`)) return true;
      return false;
    })
    .sort((a, b) => b.entityRef.length - a.entityRef.length);

  return candidates[0]?.entityRef;
}

function containerDiagramOwnsComponentCoupling(
  containerSchema: SystemSchema,
  fromComponent: EntityRef,
  fromContainer: EntityRef
): boolean {
  const scope = containerSchema.entityRef?.trim();
  if (!scope) return false;
  return (
    fromComponent === scope ||
    fromComponent.startsWith(`${scope}/`) ||
    fromContainer === scope ||
    fromContainer.startsWith(`${scope}/`)
  );
}

function resolveContainerEntity(
  ref: EntityRef,
  index: WorkspaceEntityIndex,
  loadedSystems: LoadedSystemInput[]
): WorkspaceEntity | undefined {
  const direct = index.byRef.get(ref);
  if (direct) return direct;

  for (const system of loadedSystems) {
    if (system.schema.level !== 'container') continue;
    const node = system.schema.nodes.find(n => n.entityRef === ref);
    if (node) {
      return {
        entityRef: ref,
        name: node.name,
        type: node.type,
        sourceSchemaLevel: 'container',
        sourcePath: system.path,
        properties: node.properties,
      };
    }
  }

  // Synthesize from a known child component under this container.
  for (const entity of index.byRef.values()) {
    if (EntityRefUtil.getParent(entity.entityRef) !== ref) continue;
    const leaf = EntityRefUtil.leaf(ref);
    const titled = leaf.charAt(0).toUpperCase() + leaf.slice(1);
    return {
      entityRef: ref,
      name: `${titled} Service`,
      type: 'container',
      sourceSchemaLevel: 'container',
      sourcePath: entity.sourcePath,
    };
  }

  return undefined;
}

function materializeUnresolvedEndpoints(
  schema: SystemSchema,
  index: WorkspaceEntityIndex,
  loadedSystems: LoadedSystemInput[]
): SystemSchema {
  const missingEntities: WorkspaceEntity[] = [];
  const seen = new Set<EntityRef>();

  for (const ref of listUnresolvedDependencyEndpoints(schema)) {
    if (seen.has(ref)) continue;
    seen.add(ref);
    const entity = index.byRef.get(ref) ?? resolveContainerEntity(ref, index, loadedSystems);
    if (entity) missingEntities.push(entity);
  }

  if (missingEntities.length === 0) return schema;

  const externalNodes = materializeExternalNodes(
    missingEntities,
    missingEntities.map(() => ({ x: 0, y: 0 }))
  );
  const nodes = positionExternalNodes(
    [...schema.nodes, ...externalNodes],
    schema.dependencies ?? []
  );
  return { ...schema, nodes };
}

/**
 * Roll cross-container component dependencies up into inter-container edges on a
 * container diagram, and materialize any missing container endpoints as externals.
 */
export function enrichContainerSchemaFromComponentDeps(
  containerSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[],
  index: WorkspaceEntityIndex
): SystemSchema {
  if (containerSchema.level !== 'container') return containerSchema;

  const pairs = listCrossContainerComponentDependencies(loadedSystems);
  if (pairs.length === 0) return containerSchema;

  const existing = new Set(containerSchema.dependencies.map(d => `${d.from}\0${d.to}`));
  const byKey = new Map<string, { dep: SystemDependency; labels: string[] }>();
  const componentCouplings: SystemDependency[] = [];

  for (const pair of pairs) {
    const rolled: SystemDependency = {
      from: pair.fromContainer,
      to: pair.toContainer,
      type: 'inter-container',
    };
    if (!edgeTouchesContainerDiagram(rolled, containerSchema)) continue;

    const key = `${rolled.from}\0${rolled.to}`;
    const label = `${displayNameForRef(pair.fromComponent, index)} → ${displayNameForRef(pair.toComponent, index)}`;
    const entry = byKey.get(key);
    if (entry) {
      entry.labels.push(label);
    } else {
      byKey.set(key, { dep: rolled, labels: [label] });
    }

    if (
      !containerDiagramOwnsComponentCoupling(
        containerSchema,
        pair.fromComponent,
        pair.fromContainer
      )
    ) {
      continue;
    }

    const source = resolveCouplingSourceOnContainerDiagram(
      containerSchema,
      pair.fromComponent,
      pair.fromContainer
    );
    if (!source) continue;

    const couplingKey = `${source}\0${pair.toComponent}`;
    if (existing.has(couplingKey)) continue;

    componentCouplings.push({
      from: source,
      to: pair.toComponent,
      type: pair.type,
      description: label,
    });
    existing.add(couplingKey);
  }

  const additions: SystemDependency[] = [...componentCouplings];
  for (const { dep, labels } of byKey.values()) {
    const key = `${dep.from}\0${dep.to}`;
    if (existing.has(key)) continue;
    const description =
      labels.length === 1 ? labels[0]! : `${labels[0]} (+${labels.length - 1} more)`;
    additions.push({ ...dep, description });
  }

  const describe = (key: string): string | undefined => {
    const entry = byKey.get(key);
    if (!entry) return undefined;
    const { labels } = entry;
    return labels.length === 1 ? labels[0]! : `${labels[0]} (+${labels.length - 1} more)`;
  };

  let depsChanged = additions.length > 0;
  const mergedDeps =
    additions.length === 0
      ? containerSchema.dependencies.map(dep => {
          if (dep.description) return dep;
          const description = describe(`${dep.from}\0${dep.to}`);
          if (!description) return dep;
          depsChanged = true;
          return { ...dep, description };
        })
      : [
          ...containerSchema.dependencies.map(dep => {
            if (dep.description) return dep;
            const description = describe(`${dep.from}\0${dep.to}`);
            return description ? { ...dep, description } : dep;
          }),
          ...additions,
        ];

  let next: SystemSchema = depsChanged
    ? { ...containerSchema, dependencies: mergedDeps }
    : containerSchema;

  return materializeUnresolvedEndpoints(next, index, loadedSystems);
}
