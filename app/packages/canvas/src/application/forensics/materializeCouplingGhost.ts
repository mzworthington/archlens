import type { SystemNode } from '@archlens/core';
import { withNodePosition } from '@archlens/core';
import { mapDomainNodeToRFNode } from '../store/layoutUtils';
import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';
import { applyStateUpdates } from '../store/states/diagramState/applyStateUpdates';

export type MaterializeCouplingGhostActions = {
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  addExternalDependencies: (entityRefs: string[]) => void;
  markLayoutCustomized: () => void;
  logger: { info: (message: string, meta?: Record<string, unknown>) => void };
};

function basename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  const leaf = parts[parts.length - 1] || path;
  return leaf.replace(/\.[^.]+$/, '') || leaf;
}

/**
 * Persist a coupling ghost onto the active diagram.
 * Workspace entities become external proxy nodes; unmapped filepaths become new components.
 */
export function materializeCouplingGhostOnDiagram(
  ghost: {
    entityRef?: string;
    filepath: string;
    position: { x: number; y: number };
  },
  set: (partial: Record<string, unknown>) => void,
  get: () => MaterializeCouplingGhostActions
): void {
  if (ghost.entityRef) {
    get().addExternalDependencies([ghost.entityRef]);
    return;
  }

  const actions = get();
  const entityRef = `coupling-${basename(ghost.filepath)}`;
  const name = basename(ghost.filepath);
  const newDomainNode: SystemNode = withNodePosition(
    {
      entityRef,
      type: 'component',
      name,
      properties: { filepath: ghost.filepath },
    },
    ghost.position
  );

  actions.logger.info('Materializing coupled filepath onto diagram', {
    entityRef,
    filepath: ghost.filepath,
  });
  actions.markLayoutCustomized();

  const newRFNode = mapDomainNodeToRFNode(newDomainNode);
  applyStateUpdates(set, get, [...actions.nodes, newRFNode], actions.edges);
}
