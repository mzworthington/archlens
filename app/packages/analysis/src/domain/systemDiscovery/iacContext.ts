import { slugify } from '@archlens/core';
import { resolveProductHubDisplayName } from '../entityRefContext.ts';
import { titleCase } from './helpers.ts';
import type { DiscoveredSystem, IacContextSystemInput } from './types.ts';

/**
 * Plan IaC context nodes with correct parents in one pass.
 * When a product hub exists, modules nest under the hub (no intermediate folder group).
 * Otherwise sibling modules under the same folder get a folder group frame.
 */
export function planIacContextSystems(
  subsystems: IacContextSystemInput[],
  hasProductHub: (productId: string) => boolean
): IacContextSystemInput[] {
  const byParent = new Map<string, IacContextSystemInput[]>();

  for (const system of subsystems) {
    const rel = system.rootPath.replace(/\\/g, '/').replace(/\/$/, '');
    const slash = rel.lastIndexOf('/');
    if (slash === -1) continue;
    const parentPath = rel.slice(0, slash);
    const siblings = byParent.get(parentPath) ?? [];
    siblings.push(system);
    byParent.set(parentPath, siblings);
  }

  const folderGroups: IacContextSystemInput[] = [];
  const parentByChildEntity = new Map<string, string>();

  for (const [parentPath, children] of byParent) {
    if (children.length < 2) continue;

    const productId = children[0]!.productId;
    if (hasProductHub(productId)) {
      for (const child of children) {
        parentByChildEntity.set(child.entityRef, productId);
      }
      continue;
    }

    const folderName = parentPath.split('/').filter(Boolean).pop() || parentPath;
    const groupEntityRef = slugify(folderName);

    folderGroups.push({
      entityRef: groupEntityRef,
      displayName: resolveProductHubDisplayName(groupEntityRef, titleCase(folderName)),
      rootPath: parentPath,
      productId,
    });

    for (const child of children) {
      parentByChildEntity.set(child.entityRef, groupEntityRef);
    }
  }

  return [
    ...folderGroups,
    ...subsystems.map(system => ({
      ...system,
      parentEntityRef: parentByChildEntity.get(system.entityRef) ?? system.parentEntityRef,
    })),
  ];
}

/** Ensure product hub frames exist when IaC roots nest under a multi-system product. */
export function productHubInputsForIac(
  systems: DiscoveredSystem[],
  subsystems: IacContextSystemInput[]
): IacContextSystemInput[] {
  const productIds = new Set(subsystems.map(s => s.productId));
  return systems
    .filter(s => s.kind === 'product' && productIds.has(s.productId))
    .map(s => ({
      entityRef: s.id,
      displayName: s.displayName,
      rootPath: '',
      productId: s.productId,
      isProductHub: true,
    }));
}
