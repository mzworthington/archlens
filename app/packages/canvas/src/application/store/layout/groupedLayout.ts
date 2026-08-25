import type { SystemSchema, SystemNode, SystemDependency } from '@archlens/core';
import { getNodePosition, withNodePosition } from '@archlens/core';
import {
  resolveGroupContentLayout,
  prepareGroupedNodesForLayout,
  groupLayoutDimensions,
  DEFAULT_NODE_SIZE,
  hasCompleteSavedLayout,
  positionExternalNodes,
} from '@archlens/core/layout';
import type { LayoutEngineId, LayoutRegistryPort } from '../../../core';
import { computeClientLayout } from '../../layout/computeClientLayout';
import { NODE_SIZE } from '../../layout/constants';
import type { BlueprintRFNode } from './mapping';

function getNodeDimensions(node: BlueprintRFNode): { width: number; height: number } {
  const style = node.style as { width?: number; height?: number } | undefined;
  return {
    width: node.measured?.width ?? style?.width ?? NODE_SIZE.width,
    height: node.measured?.height ?? style?.height ?? NODE_SIZE.height,
  };
}

export function getAbsoluteNodePosition(
  node: BlueprintRFNode,
  nodeById: Map<string, BlueprintRFNode>
): { x: number; y: number } {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = typeof node.parentId === 'string' ? node.parentId : undefined;
  while (parentId) {
    const parent = nodeById.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = typeof parent.parentId === 'string' ? parent.parentId : undefined;
  }
  return { x, y };
}

/** Run automatic layout on load unless every node already has saved coordinates. */
export function shouldAutoLayoutOnLoad(schema: SystemSchema): boolean {
  if (schema.nodes.length === 0) return false;
  return !hasCompleteSavedLayout(schema.nodes);
}

export async function layoutGroupedDomainNodes(
  nodes: SystemNode[],
  dependencies: SystemDependency[],
  layoutEngine: LayoutEngineId,
  registry: LayoutRegistryPort
): Promise<SystemNode[]> {
  const prepared = prepareGroupedNodesForLayout(nodes);
  const topLevel = prepared.filter(n => !n.parentEntityRef);
  const layoutTopLevel = topLevel.filter(n => !n.external);
  const layoutTopLevelIds = new Set(layoutTopLevel.map(n => n.entityRef));

  const topEdges = dependencies
    .filter(d => layoutTopLevelIds.has(d.from) && layoutTopLevelIds.has(d.to))
    .map((d, i) => ({
      id: `layout-${d.from}-${d.to}-${i}`,
      source: d.from,
      target: d.to,
      ...(d.description ? { label: d.description } : {}),
    }));

  const layoutInput = layoutTopLevel.map(n => {
    if (n.type === 'group') {
      const children = prepared.filter(c => c.parentEntityRef === n.entityRef);
      const bounds = groupLayoutDimensions(children);
      return { id: n.entityRef, width: bounds.width, height: bounds.height };
    }
    return {
      id: n.entityRef,
      width: DEFAULT_NODE_SIZE.width,
      height: DEFAULT_NODE_SIZE.height,
    };
  });

  const positions = await computeClientLayout(layoutEngine, layoutInput, topEdges, registry);

  const laidOut = prepared.map(n => {
    if (n.parentEntityRef || n.external) return n;
    const pos = positions.get(n.entityRef);
    return pos ? withNodePosition(n, pos) : n;
  });

  return positionExternalNodes(laidOut, dependencies);
}

/** Place upstream externals above and downstream externals below internal nodes. */
export function repositionExternalRfNodes(
  nodes: BlueprintRFNode[],
  dependencies: SystemDependency[]
): BlueprintRFNode[] {
  const systemNodes: SystemNode[] = nodes.map(node =>
    withNodePosition(
      {
        entityRef: node.id,
        type: node.data.type,
        name: node.data.name,
        external: node.data.external,
        ...(typeof node.parentId === 'string' ? { parentEntityRef: node.parentId } : {}),
      },
      node.position
    )
  );

  const positioned = positionExternalNodes(systemNodes, dependencies);
  const byRef = new Map(positioned.map(node => [node.entityRef, node]));

  return nodes.map(node => {
    if (!node.data.external) return node;
    const updated = byRef.get(node.id);
    const updatedPos = updated ? getNodePosition(updated) : undefined;
    if (!updatedPos) return node;
    return { ...node, position: updatedPos };
  });
}

export function refreshGroupBoundsFromChildren(nodes: BlueprintRFNode[]): BlueprintRFNode[] {
  const childrenByParent = new Map<string, BlueprintRFNode[]>();
  for (const node of nodes) {
    const parentId = typeof node.parentId === 'string' ? node.parentId : undefined;
    if (!parentId) continue;
    const list = childrenByParent.get(parentId) ?? [];
    list.push(node);
    childrenByParent.set(parentId, list);
  }

  const childPositions = new Map<string, { x: number; y: number }>();
  const groupBounds = new Map<string, { width: number; height: number }>();

  for (const [parentId, children] of childrenByParent) {
    const { bounds, positionsByRef } = resolveGroupContentLayout(
      children.map(child => {
        const dims = getNodeDimensions(child);
        return {
          entityRef: child.id,
          x: child.position.x,
          y: child.position.y,
          width: dims.width,
          height: dims.height,
        };
      })
    );
    groupBounds.set(parentId, bounds);
    for (const [childId, pos] of positionsByRef) {
      childPositions.set(childId, pos);
    }
  }

  return nodes.map(node => {
    if (node.type === 'blueprintGroup') {
      const bounds = groupBounds.get(node.id);
      if (!bounds) return node;
      return {
        ...node,
        style: { ...(node.style as object), width: bounds.width, height: bounds.height },
        width: bounds.width,
        height: bounds.height,
      };
    }

    const childPos = childPositions.get(node.id);
    if (childPos) {
      return { ...node, position: childPos };
    }

    return node;
  });
}

/**
 * Update group parentage when nodes finish dragging.
 * If a node's center point is dragged into a group boundary, parent it to that group.
 * If a node is dragged out of its group boundary, un-parent it back to the main canvas.
 */
export function resolveDragGroupMembership(
  nodes: BlueprintRFNode[],
  draggedNodeIds: string[]
): BlueprintRFNode[] {
  if (nodes.length === 0 || draggedNodeIds.length === 0) return nodes;

  const nodeById = new Map(nodes.map(n => [n.id, n]));

  const groups = nodes.filter(n => n.type === 'blueprintGroup' || n.data?.type === 'group');

  if (groups.length === 0 && nodes.every(n => !n.parentId)) {
    return nodes;
  }

  const groupInfos = groups.map(g => {
    const abs = getAbsoluteNodePosition(g, nodeById);
    const dims = getNodeDimensions(g);
    return {
      id: g.id,
      minX: abs.x,
      minY: abs.y,
      maxX: abs.x + dims.width,
      maxY: abs.y + dims.height,
      area: dims.width * dims.height,
    };
  });

  const draggedSet = new Set(draggedNodeIds);
  let changed = false;

  const nextNodes = nodes.map(node => {
    if (!draggedSet.has(node.id)) return node;
    // Do not change parentage for group containers themselves
    if (node.type === 'blueprintGroup' || node.data?.type === 'group') return node;

    const abs = getAbsoluteNodePosition(node, nodeById);
    const dims = getNodeDimensions(node);
    const centerX = abs.x + dims.width / 2;
    const centerY = abs.y + dims.height / 2;

    // Find candidate containing groups (excluding node itself)
    const matchingGroups = groupInfos.filter(
      g =>
        g.id !== node.id &&
        centerX >= g.minX &&
        centerX <= g.maxX &&
        centerY >= g.minY &&
        centerY <= g.maxY
    );

    // If multiple groups match, pick smallest area group (innermost)
    matchingGroups.sort((a, b) => a.area - b.area);
    const targetGroup = matchingGroups[0];

    const currentParentId =
      typeof node.parentId === 'string'
        ? node.parentId
        : typeof node.data?.parentEntityRef === 'string'
          ? node.data.parentEntityRef
          : undefined;

    const targetGroupId = targetGroup?.id;

    if (targetGroupId === currentParentId) return node;

    changed = true;

    if (targetGroup) {
      // Re-parent node to target group
      const relX = Math.max(0, abs.x - targetGroup.minX);
      const relY = Math.max(0, abs.y - targetGroup.minY);
      return {
        ...node,
        parentId: targetGroup.id,
        position: { x: relX, y: relY },
        data: {
          ...node.data,
          parentEntityRef: targetGroup.id,
        },
      };
    } else {
      // Un-parent node to top-level canvas
      const { parentId: _parentId, extent: _extent, ...rest } = node;
      return {
        ...rest,
        position: { x: abs.x, y: abs.y },
        data: {
          ...node.data,
          parentEntityRef: undefined,
        },
      };
    }
  });

  if (!changed) return nodes;

  return refreshGroupBoundsFromChildren(nextNodes);
}
