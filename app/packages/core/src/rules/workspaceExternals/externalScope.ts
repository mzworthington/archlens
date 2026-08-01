import {
  EntityRef as EntityRefUtil,
  type C4Level,
  type EntityRef,
  type SystemDependency,
} from '../../models/schema';
import type { LoadedSystemInput, WorkspaceEntity, WorkspaceEntityIndex } from './types';
import {
  isExcludedFromExternalCandidates,
  listUnresolvedDependencyEndpoints,
} from './diagramScope';
import { collectComponentDiagramNeighborRefs, isUnderScope } from './containerDiagramScope';
import type { SystemSchema } from '../../models/schema';
import type { ExternalNodeDirection } from '../externalNodeLayout';

export const EXTERNAL_SUMMARY_HUB_CALLERS_ID = '__external-summary-callers__';
export const EXTERNAL_SUMMARY_HUB_TARGETS_ID = '__external-summary-targets__';

export type ExternalSummaryBand = 'callers' | 'targets';

export function externalSummaryHubId(band: ExternalSummaryBand): string {
  return band === 'callers' ? EXTERNAL_SUMMARY_HUB_CALLERS_ID : EXTERNAL_SUMMARY_HUB_TARGETS_ID;
}

/** Parent C4 level used for cross-diagram external proxies on the active diagram. */
export function resolveExternalDisplayLevel(diagramLevel: C4Level): C4Level {
  switch (diagramLevel) {
    case 'code':
      return 'component';
    case 'component':
      return 'container';
    case 'container':
    case 'context':
      return 'context';
    default:
      return 'context';
  }
}

/**
 * Walk entityRef ancestors until one is indexed at the target workspace schema level.
 * EntityRef segment depth does not always match C4 file level (e.g. container nodes use 3 segments).
 */
export function rollupEntityRefToDisplayLevel(
  entityRef: EntityRef,
  displayLevel: C4Level,
  index: WorkspaceEntityIndex
): EntityRef {
  let ref: EntityRef | null = entityRef;
  while (ref) {
    const entity = index.byRef.get(ref);
    if (entity?.sourceSchemaLevel === displayLevel) return ref;
    ref = EntityRefUtil.getParent(ref);
  }
  return entityRef;
}

function collectContainerNeighborRefs(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[]
): EntityRef[] {
  if (activeSchema.level === 'container' || activeSchema.level === 'context') {
    const onDiagram = new Set(activeSchema.nodes.map(n => n.entityRef));
    const related = new Set<EntityRef>();
    for (const dep of activeSchema.dependencies) {
      if (onDiagram.has(dep.from)) related.add(dep.to);
      if (onDiagram.has(dep.to)) related.add(dep.from);
    }
    return [...related];
  }

  return collectComponentDiagramNeighborRefs(activeSchema, loadedSystems);
}

function collectCrossDiagramRefs(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[]
): EntityRef[] {
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

function resolveOverviewEntity(
  ref: EntityRef,
  displayLevel: C4Level,
  index: WorkspaceEntityIndex,
  activeSchema: SystemSchema
): WorkspaceEntity | null {
  const rolled = rollupEntityRefToDisplayLevel(ref, displayLevel, index);
  if (isExcludedFromExternalCandidates(rolled, activeSchema)) return null;

  const entity = index.byRef.get(rolled);
  if (!entity || entity.sourceSchemaLevel !== displayLevel) return null;
  return entity;
}

/**
 * Workspace externals at the parent C4 level for overview display (grouped hubs).
 */
export function suggestOverviewExternalDependencies(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[],
  index: WorkspaceEntityIndex
): WorkspaceEntity[] {
  const displayLevel = resolveExternalDisplayLevel(activeSchema.level);
  const suggestedRefs = new Set<EntityRef>([
    ...collectContainerNeighborRefs(activeSchema, loadedSystems),
    ...collectCrossDiagramRefs(activeSchema, loadedSystems),
    ...listUnresolvedDependencyEndpoints(activeSchema),
  ]);

  const entities = new Map<EntityRef, WorkspaceEntity>();
  for (const ref of suggestedRefs) {
    const entity = resolveOverviewEntity(ref, displayLevel, index, activeSchema);
    if (!entity) continue;
    entities.set(entity.entityRef, entity);
  }

  return [...entities.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export type OverviewExternalBands = {
  callers: WorkspaceEntity[];
  targets: WorkspaceEntity[];
};

export function classifyOverviewExternalDirection(
  entityRef: EntityRef,
  activeSchema: SystemSchema,
  dependencies: readonly SystemDependency[]
): ExternalNodeDirection {
  const scope = activeSchema.entityRef?.trim();
  const isDiagramInternal = (ref: EntityRef) =>
    activeSchema.nodes.some(node => node.entityRef === ref && !node.external) ||
    (scope != null && isUnderScope(ref, scope));

  let upstream = false;
  let downstream = false;

  for (const dep of dependencies) {
    if (dep.from === entityRef && isDiagramInternal(dep.to)) upstream = true;
    if (dep.to === entityRef && isDiagramInternal(dep.from)) downstream = true;
  }

  return { upstream, downstream };
}

export function groupOverviewExternalsByBand(
  activeSchema: SystemSchema,
  entities: WorkspaceEntity[],
  dependencies: readonly SystemDependency[] = activeSchema.dependencies ?? []
): OverviewExternalBands {
  const callers: WorkspaceEntity[] = [];
  const targets: WorkspaceEntity[] = [];

  for (const entity of entities) {
    const direction = classifyOverviewExternalDirection(
      entity.entityRef,
      activeSchema,
      dependencies
    );
    if (direction.upstream) callers.push(entity);
    if (direction.downstream) targets.push(entity);
    if (!direction.upstream && !direction.downstream) {
      callers.push(entity);
      targets.push(entity);
    }
  }

  return { callers, targets };
}

export type ExternalSummaryEdgePair = {
  band: ExternalSummaryBand;
  internalRef: EntityRef;
};

export function computeExternalSummaryEdgePairs(
  dependencies: readonly SystemDependency[],
  callerRefs: ReadonlySet<EntityRef>,
  targetRefs: ReadonlySet<EntityRef>,
  isInternal: (ref: EntityRef) => boolean
): ExternalSummaryEdgePair[] {
  const pairs: ExternalSummaryEdgePair[] = [];
  const seen = new Set<string>();

  for (const dep of dependencies) {
    if (callerRefs.has(dep.from) && isInternal(dep.to)) {
      const key = `callers\0${dep.to}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ band: 'callers', internalRef: dep.to });
      }
    }
    if (targetRefs.has(dep.to) && isInternal(dep.from)) {
      const key = `targets\0${dep.from}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ band: 'targets', internalRef: dep.from });
      }
    }
  }

  return pairs;
}

const DEFAULT_SELECTION_EXTERNAL_CAP = 8;

function entityTouchesSelection(
  entityRef: EntityRef,
  selectedRef: EntityRef,
  dependencies: readonly SystemDependency[]
): boolean {
  return dependencies.some(
    dep =>
      (dep.from === entityRef && dep.to === selectedRef) ||
      (dep.from === selectedRef && dep.to === entityRef)
  );
}

/** 1-hop externals for the selected node, capped per band. */
export function filterOverviewExternalsForSelection(
  selectedRef: EntityRef,
  bands: OverviewExternalBands,
  dependencies: readonly SystemDependency[],
  maxPerBand = DEFAULT_SELECTION_EXTERNAL_CAP
): OverviewExternalBands {
  const callers = bands.callers
    .filter(entity => entityTouchesSelection(entity.entityRef, selectedRef, dependencies))
    .slice(0, maxPerBand);
  const targets = bands.targets
    .filter(entity => entityTouchesSelection(entity.entityRef, selectedRef, dependencies))
    .slice(0, maxPerBand);
  return { callers, targets };
}
