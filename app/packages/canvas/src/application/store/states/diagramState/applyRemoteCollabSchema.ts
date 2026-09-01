import type { SystemSchema } from '@archlens/core';
import {
  mapDomainDepsToRFEdges,
  mapDomainNodesToRFNodes,
  refreshGroupBoundsFromChildren,
  sortNodesForReactFlow,
} from '../../layoutUtils';
import { applyStateUpdates } from './applyStateUpdates';
import type { DiagramStateDeps } from './types';

type SetFn = (partial: Record<string, unknown>) => void;
type GetFn = () => DiagramStateDeps;

/** Apply a schema that arrived from the collab session without echoing it back. */
export function applyRemoteCollabSchema(set: SetFn, get: GetFn, schema: SystemSchema): void {
  const rfNodes = sortNodesForReactFlow(
    refreshGroupBoundsFromChildren(mapDomainNodesToRFNodes(schema.nodes))
  );
  const rfEdges = mapDomainDepsToRFEdges(schema.dependencies);
  applyStateUpdates(
    set,
    get,
    rfNodes,
    rfEdges,
    schema.name,
    schema.level,
    schema.entityRef ?? null,
    schema.source,
    { pushCollab: false }
  );
}
