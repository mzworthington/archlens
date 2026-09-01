import { dedupeDependencies, assessSchemaVersion, type SystemSchema } from '@archlens/core';
import { isResilienceSimulationDiagramLevel } from '@archlens/core/recommendations';
import {
  normalizeGroupedNodePositions,
  hasGroupedLayout,
  prepareGroupedNodesForLayout,
  hasCompleteSavedLayout,
  stripLayoutCoordinates,
  positionExternalNodes,
} from '@archlens/core/layout';
import {
  clearSessionLayout,
  getSessionLayout,
  hasSessionLayout,
  schemaLayoutFingerprint,
} from '../../sessionLayoutCache';
import {
  mapDomainNodesToRFNodes,
  mapDomainDepsToRFEdges,
  refreshGroupBoundsFromChildren,
  sortNodesForReactFlow,
  shouldAutoLayoutOnLoad,
} from '../../layoutUtils';
import { applyStateUpdates } from './applyStateUpdates';
import type { DiagramStateDeps } from './types';
import type { BlueprintState } from '../../store';

type SetFn = (partial: Record<string, unknown>) => void;
type GetFn = () => DiagramStateDeps;

export function createInitSchema(set: SetFn, get: GetFn) {
  return (schema: SystemSchema) => {
    get().clearHistory();
    set({ focusedCyclePath: null });
    if (
      (get() as BlueprintState).isResilienceMode &&
      !isResilienceSimulationDiagramLevel(schema.level)
    ) {
      (get() as BlueprintState).setResilienceMode(false);
    }
    const filePath = get().currentFilePath;
    const fingerprint = schemaLayoutFingerprint(schema);
    const cachedLayout =
      filePath && (hasCompleteSavedLayout(schema.nodes) || hasSessionLayout(filePath, fingerprint))
        ? getSessionLayout(filePath, fingerprint)
        : undefined;

    if (cachedLayout) {
      set({ schemaVersionWarning: assessSchemaVersion(schema.version) });
      applyStateUpdates(
        set,
        get,
        cachedLayout.nodes,
        cachedLayout.edges,
        schema.name,
        schema.level,
        schema.entityRef ?? null,
        schema.source,
        { syncWorkingCopy: false, updateSessionLayout: false, pushCollab: false }
      );
      set({ layoutSessionId: get().layoutSessionId + 1 });
      return;
    }

    const grouped = hasGroupedLayout(schema.nodes);
    const layoutCustomized = hasCompleteSavedLayout(schema.nodes);
    const needsAutoLayout = !layoutCustomized && shouldAutoLayoutOnLoad(schema);

    if (needsAutoLayout && filePath && !hasSessionLayout(filePath, fingerprint)) {
      clearSessionLayout(filePath);
    }

    const normalizedNodes =
      needsAutoLayout && grouped
        ? stripLayoutCoordinates(schema.nodes)
        : grouped
          ? prepareGroupedNodesForLayout(schema.nodes)
          : normalizeGroupedNodePositions(schema.nodes);

    const normalized: SystemSchema = {
      ...schema,
      nodes: positionExternalNodes(normalizedNodes, dedupeDependencies(schema.dependencies ?? [])),
      dependencies: dedupeDependencies(schema.dependencies ?? []),
    };

    set({
      layoutCustomized,
      ...(needsAutoLayout && get().layoutEngine === null ? { layoutEngine: 'dagre' } : {}),
    });
    const rfNodes = sortNodesForReactFlow(
      refreshGroupBoundsFromChildren(mapDomainNodesToRFNodes(normalized.nodes))
    );
    const rfEdges = mapDomainDepsToRFEdges(normalized.dependencies);
    set({ schemaVersionWarning: assessSchemaVersion(normalized.version) });
    applyStateUpdates(
      set,
      get,
      rfNodes,
      rfEdges,
      normalized.name,
      normalized.level,
      normalized.entityRef ?? null,
      normalized.source,
      needsAutoLayout
        ? { syncWorkingCopy: false, updateSessionLayout: false, pushCollab: false }
        : { pushCollab: false }
    );
    set({ layoutSessionId: get().layoutSessionId + 1 });
  };
}
