import type { C4Level, EntityRef, SystemNode, SystemSchema } from '../models/schema';
import { isHumanActorNode, isThirdPartyNode } from '../taxonomy/nodeOwnership';
import { nodeRole, type NodeRole } from '../taxonomy/nodeRoles';

/** Diagram levels that receive full ChaosLens estate resilience simulation. */
export function isEstateResilienceDiagramLevel(level: C4Level): boolean {
  return level === 'context' || level === 'container';
}

/** Roles that may receive outbound resilience safeguard advice (application runtime, not infra). */
const SAFEGUARD_TARGET_ROLES: ReadonlySet<NodeRole> = new Set([
  'user-facing',
  'sync-service',
  'async-worker',
  'serverless',
]);

function isIacImportedNode(node: SystemNode): boolean {
  const props = node.properties;
  if (!props) return false;
  return props['iac.address'] != null || props['iac.kind'] != null;
}

function findNode(schema: SystemSchema, entityRef: EntityRef): SystemNode | undefined {
  return schema.nodes.find(candidate => candidate.entityRef === entityRef);
}

/**
 * Whether a node is an appropriate target for outbound resilience safeguards
 * (circuit breakers, timeouts, staleness handling). Targets calling application
 * services and workers — not human actors, third-party vendors, shared data
 * stores, brokers, structural C4 nodes, or IaC-imported resources.
 */
export function isResilienceAdviceTarget(schema: SystemSchema, entityRef: EntityRef): boolean {
  const node = findNode(schema, entityRef);
  if (!node) return false;
  if (isHumanActorNode(node)) return false;
  if (isThirdPartyNode(node)) return false;
  if (isIacImportedNode(node)) return false;
  return SAFEGUARD_TARGET_ROLES.has(nodeRole(node.type));
}

/**
 * Whether AdviceLens may prescribe implementation actions on this entity
 * (safeguard toggles, refactor plans). Alias for resilience eligibility today;
 * kept separate so ownership rules can diverge later.
 */
export function isAdviceActionable(schema: SystemSchema, entityRef: EntityRef): boolean {
  return isResilienceAdviceTarget(schema, entityRef);
}

export function isThirdPartyDependency(
  schema: SystemSchema,
  dependencyEntityRef: EntityRef
): boolean {
  const node = findNode(schema, dependencyEntityRef);
  return node != null && isThirdPartyNode(node);
}

export interface AdviceApplicability {
  adviceTargetEntityRef: EntityRef;
  adviceTargetName: string;
  scopeEntityRef: EntityRef;
  scopeName: string;
  contributorEntityRef?: EntityRef;
  contributorName?: string;
}

function nodeName(schema: SystemSchema, entityRef: EntityRef): string {
  return findNode(schema, entityRef)?.name ?? entityRef;
}

function resolveContainerScope(schema: SystemSchema, entityRef: EntityRef): EntityRef {
  if (schema.entityRef) return schema.entityRef;

  const node = findNode(schema, entityRef);
  if (node?.parentEntityRef && isResilienceAdviceTarget(schema, node.parentEntityRef)) {
    return node.parentEntityRef;
  }

  const service = schema.nodes.find(
    candidate =>
      isResilienceAdviceTarget(schema, candidate.entityRef) &&
      (candidate.type === 'microservice' ||
        candidate.type === 'rest-api' ||
        candidate.type === 'web-app')
  );
  if (service) return service.entityRef;

  return entityRef;
}

/**
 * Resolves the entity a recommendation should target, rolling code/component
 * contributors up to their owning container scope when needed.
 */
export function resolveAdviceApplicability(
  schema: SystemSchema,
  entityRef: EntityRef
): AdviceApplicability {
  const name = nodeName(schema, entityRef);

  if (isResilienceAdviceTarget(schema, entityRef)) {
    return {
      adviceTargetEntityRef: entityRef,
      adviceTargetName: name,
      scopeEntityRef: entityRef,
      scopeName: name,
    };
  }

  const scopeEntityRef = resolveContainerScope(schema, entityRef);
  const scopeName = nodeName(schema, scopeEntityRef);

  return {
    adviceTargetEntityRef: scopeEntityRef,
    adviceTargetName: scopeName,
    scopeEntityRef,
    scopeName,
    contributorEntityRef: entityRef,
    contributorName: name,
  };
}

export function applicabilityEvidence(applicability: AdviceApplicability): {
  applicabilityScope: {
    entityRef: EntityRef;
    name: string;
    contributorEntityRef?: EntityRef;
    contributorName?: string;
  };
} {
  return {
    applicabilityScope: {
      entityRef: applicability.scopeEntityRef,
      name: applicability.scopeName,
      ...(applicability.contributorEntityRef
        ? {
            contributorEntityRef: applicability.contributorEntityRef,
            contributorName: applicability.contributorName,
          }
        : {}),
    },
  };
}
