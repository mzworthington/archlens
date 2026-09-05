import { EntityRef, slugify, withNodePosition, type SystemNode } from '@archlens/core';
import type { RefactorBoundary } from '@archlens/core/forensics';
import {
  mapDomainNodeToRFNode,
  sortNodesForReactFlow,
  type BlueprintRFNode,
  type BlueprintRFEdge,
} from '../../store/layoutUtils';
import { applyStateUpdates } from '../../store/states/diagramState/applyStateUpdates';

type DraftGet = () => {
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  schema: { name: string };
};

type DraftSet = (partial: Record<string, unknown>) => void;

function computeGroupBounds(members: BlueprintRFNode[]): { x: number; y: number } {
  if (members.length === 0) return { x: 100, y: 100 };
  const xs = members.map(n => n.position.x);
  const ys = members.map(n => n.position.y);
  const padding = 48;
  return {
    x: Math.min(...xs) - padding,
    y: Math.min(...ys) - padding,
  };
}

/**
 * Materialize a TraceLens refactor boundary as a draft group on the active diagram.
 * Writes to the working copy so users can review via Pending Changes.
 */
export function applyRefactorBoundaryAsDraft(
  boundary: RefactorBoundary,
  get: DraftGet,
  set: DraftSet
): boolean {
  const memberRefs = new Set(boundary.memberEntityRefs);
  const { nodes, edges } = get();
  const membersOnCanvas = nodes.filter(n => memberRefs.has(n.data.entityRef ?? n.id));
  if (membersOnCanvas.length < 2) return false;

  const groupEntityRef = EntityRef.create(
    'refactor-draft',
    slugify(boundary.seedName || 'boundary')
  );

  const groupDomainNode: SystemNode = withNodePosition(
    {
      entityRef: groupEntityRef,
      type: 'group',
      name: `Refactor: ${boundary.seedName}`,
      properties: {
        refactorDraft: true,
        boundaryId: boundary.id,
        memberCount: boundary.members.length,
      },
    },
    computeGroupBounds(membersOnCanvas)
  );

  const groupRF = mapDomainNodeToRFNode(groupDomainNode);
  const nextNodes = nodes.map(node => {
    if (!memberRefs.has(node.data.entityRef ?? node.id)) return node;
    return {
      ...node,
      parentId: groupEntityRef,
    };
  });

  applyStateUpdates(set, get, sortNodesForReactFlow([...nextNodes, groupRF]), edges);
  return true;
}
