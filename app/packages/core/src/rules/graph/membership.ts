import { EntityRef } from '../../lib/entityRefIdentity.ts';

export type GraphMembershipNode = {
  entityRef: string;
  parentEntityRef?: string;
  properties?: { containerId?: unknown } & Record<string, unknown>;
};

function lastSegment(entityRef: string): string {
  return EntityRef.leaf(entityRef);
}

function parentRef(entityRef: string): string | null {
  return EntityRef.getParent(entityRef);
}

export function componentsInContainer<T extends GraphMembershipNode>(
  container: Pick<GraphMembershipNode, 'entityRef'>,
  components: readonly T[]
): T[] {
  const containerId = lastSegment(container.entityRef);
  return components.filter(component => {
    const cid = component.properties?.containerId;
    if (typeof cid === 'string' && cid === containerId) return true;
    return parentRef(component.entityRef) === container.entityRef;
  });
}

export function componentsInSystem<T extends GraphMembershipNode>(
  system: Pick<GraphMembershipNode, 'entityRef'>,
  components: readonly T[]
): T[] {
  const prefix = `${system.entityRef}/`;
  return components.filter(
    component => component.entityRef === system.entityRef || component.entityRef.startsWith(prefix)
  );
}
