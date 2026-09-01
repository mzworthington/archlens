import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';
import { resolveDependencyRoles } from './filterSelectedDependencyFocus';

export function applyDependencyHighlights(
  nodes: BlueprintRFNode[],
  selectedNodeId: string | null,
  edges: BlueprintRFEdge[],
  enabled: boolean
): BlueprintRFNode[] {
  if (!enabled || !selectedNodeId) return nodes;

  const roles = resolveDependencyRoles(selectedNodeId, nodes, edges);
  if (roles.size === 0) return nodes;

  return nodes.map(node => {
    const role = roles.get(node.id);
    if (!role) return node;
    return {
      ...node,
      data: {
        ...node.data,
        dependencyRole: role,
      },
    };
  });
}
