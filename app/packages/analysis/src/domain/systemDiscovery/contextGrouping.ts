import type { SystemNode } from '@archlens/core';

/** Leaf segment of an entity ref (`application/aws` → `aws`). */
function entityRefLeaf(entityRef: string): string {
  const slash = entityRef.lastIndexOf('/');
  return slash === -1 ? entityRef : entityRef.slice(slash + 1);
}

/** Top-level product hub for a product id (entity ref leaf matches productId). */
export function hubRefForProductNodes(nodes: SystemNode[], productId: string): string | undefined {
  return nodes.find(
    n =>
      n.type !== 'person' &&
      !n.parentEntityRef &&
      String(n.properties?.productId || '') === productId &&
      entityRefLeaf(n.entityRef) === productId
  )?.entityRef;
}

function isIacFolderGroupNode(node: SystemNode, hubRef: string | undefined): boolean {
  const productId = String(node.properties?.productId || '');
  if (!productId || !hubRef || node.entityRef === hubRef || node.type !== 'group') {
    return false;
  }
  const rootPath = String(node.properties?.rootPath || '');
  return !!rootPath && entityRefLeaf(node.entityRef) !== productId;
}

/**
 * Remove stale IaC folder groups under a product hub and promote hubs with children to `group`.
 * Handles incremental merges when prior scans left orphan folder frames in context.yaml.
 */
export function normalizeContextGrouping(nodes: SystemNode[]): SystemNode[] {
  const hubByProduct = new Map<string, string>();
  for (const node of nodes) {
    if (node.type === 'person' || node.parentEntityRef) continue;
    const productId = String(node.properties?.productId || '');
    if (!productId) continue;
    if (entityRefLeaf(node.entityRef) === productId) {
      hubByProduct.set(productId, node.entityRef);
    }
  }

  const folderGroupRefs = new Set<string>();
  for (const node of nodes) {
    const productId = String(node.properties?.productId || '');
    const hubRef = hubByProduct.get(productId);
    if (!isIacFolderGroupNode(node, hubRef)) continue;

    const hasChildren = nodes.some(n => n.parentEntityRef === node.entityRef);
    const nestedUnderHub = node.parentEntityRef === hubRef;
    const topLevelOrphan = !node.parentEntityRef;

    if (hasChildren && (topLevelOrphan || nestedUnderHub)) {
      folderGroupRefs.add(node.entityRef);
    } else if (nestedUnderHub && !hasChildren) {
      folderGroupRefs.add(node.entityRef);
    }
  }

  let result = nodes
    .filter(n => !folderGroupRefs.has(n.entityRef))
    .map(node => {
      if (node.parentEntityRef && folderGroupRefs.has(node.parentEntityRef)) {
        const productId = String(node.properties?.productId || '');
        const hubRef = hubByProduct.get(productId);
        if (hubRef) return { ...node, parentEntityRef: hubRef };
      }
      return node;
    });

  const childCounts = new Map<string, number>();
  for (const node of result) {
    if (!node.parentEntityRef) continue;
    childCounts.set(node.parentEntityRef, (childCounts.get(node.parentEntityRef) ?? 0) + 1);
  }

  return result.map(node => {
    const productId = String(node.properties?.productId || '');
    const hubRef = hubByProduct.get(productId);
    if (node.entityRef === hubRef && (childCounts.get(node.entityRef) ?? 0) > 0) {
      return { ...node, type: 'group' };
    }
    return node;
  });
}

/** Drop product hub frames that no longer have nested systems. */
export function pruneEmptyProductHubs(nodes: SystemNode[], productIds: string[]): SystemNode[] {
  let result = [...nodes];
  for (const productId of productIds) {
    const hub = result.find(
      n =>
        n.type === 'group' &&
        String(n.properties?.productId || '') === productId &&
        !n.parentEntityRef
    );
    if (!hub) continue;
    const hasChildren = result.some(n => n.parentEntityRef === hub.entityRef);
    if (!hasChildren) {
      result = result.filter(n => n.entityRef !== hub.entityRef);
    }
  }
  return result;
}
