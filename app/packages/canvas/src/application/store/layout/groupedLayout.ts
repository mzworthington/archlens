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
