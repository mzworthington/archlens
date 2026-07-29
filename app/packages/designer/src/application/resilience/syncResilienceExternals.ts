import { EntityRef, listUnresolvedDependencyEndpoints } from '@archlens/core';
import { materializeUnresolvedSimulationEndpoints } from '@archlens/core/resilience';
import type { BlueprintState } from '../store/store';
import {
  ensureBundledSystemLoaded,
  guessBundledPathForEntityRef,
} from '../store/states/diagramState/bundledBlueprintLoader';

async function ensureBundledSystemsForEntityRefs(
  entityRefs: string[],
  get: () => BlueprintState,
  set: (partial: Partial<BlueprintState>) => void
): Promise<void> {
  if (get().isWorkspaceOpen) return;

  const { logger } = get();
  const pathsToLoad = new Set<string>();

  for (const ref of entityRefs) {
    let candidate: string | null = ref;
    while (candidate) {
      const path = guessBundledPathForEntityRef(candidate);
      if (path && !get().loadedSystems.some(system => system.path === path)) {
        pathsToLoad.add(path);
      }
      const parent = EntityRef.getParent(candidate);
      if (!parent || parent === candidate) break;
      candidate = parent;
    }
  }

  for (const path of pathsToLoad) {
    await ensureBundledSystemLoaded(path, { get, set, logger });
  }
}

/** Pull unresolved cross-diagram dependency endpoints onto the canvas for ChaosLens. */
export async function syncResilienceExternalsToCanvas(
  get: () => BlueprintState,
  set: (partial: Partial<BlueprintState>) => void
): Promise<void> {
  const { schema, addExternalDependencies } = get();
  const unresolvedRefs = listUnresolvedDependencyEndpoints(schema);

  if (unresolvedRefs.length === 0) return;

  await ensureBundledSystemsForEntityRefs(unresolvedRefs, get, set);

  const { materialized } = materializeUnresolvedSimulationEndpoints(schema, get().loadedSystems);

  if (materialized.length > 0) {
    addExternalDependencies(materialized.map(entity => entity.entityRef));
  }
}
