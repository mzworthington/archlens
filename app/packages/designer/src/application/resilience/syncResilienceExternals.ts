import { EntityRef, listUnresolvedDependencyEndpoints } from '@archlens/core';
import { materializeUnresolvedSimulationEndpoints } from '@archlens/core/resilience';
import type { BlueprintState } from '../store/store';
import { ensureSystemLoaded } from '../store/states/ioState/ensureSystemLoaded';

async function ensureWorkspaceSystemsForEntityRefs(
  entityRefs: string[],
  get: () => BlueprintState,
  set: (partial: Partial<BlueprintState>) => void
): Promise<void> {
  if (!get().isWorkspaceOpen) return;

  const { logger, workspacePort, workingCopyPort } = get();
  const pathsToLoad = new Set<string>();

  for (const ref of entityRefs) {
    let candidate: string | null = ref;
    while (candidate) {
      const catalogPath = get().workspaceCatalog.find(entry => entry.entityRef === candidate)?.path;
      if (catalogPath && !get().loadedSystems.some(system => system.path === catalogPath)) {
        pathsToLoad.add(catalogPath);
      }
      const parent = EntityRef.getParent(candidate);
      if (!parent || parent === candidate) break;
      candidate = parent;
    }
  }

  for (const path of pathsToLoad) {
    await ensureSystemLoaded(path, {
      workspacePort,
      workingCopyPort,
      logger,
      get,
      set,
    });
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

  await ensureWorkspaceSystemsForEntityRefs(unresolvedRefs, get, set);

  const { materialized } = materializeUnresolvedSimulationEndpoints(schema, get().loadedSystems);

  if (materialized.length > 0) {
    addExternalDependencies(materialized.map(entity => entity.entityRef));
  }
}
