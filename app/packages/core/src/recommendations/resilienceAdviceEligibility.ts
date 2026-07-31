import type { C4Level, EntityRef, SystemSchema } from '../models/schema';
import { nodeRole } from '../taxonomy/nodeRoles';

/** Diagram levels that receive full ChaosLens estate resilience simulation. */
export function isEstateResilienceDiagramLevel(level: C4Level): boolean {
  return level === 'context' || level === 'container';
}

/**
 * Whether a node is an appropriate target for outbound resilience safeguards
 * (circuit breakers, timeouts, staleness handling). Excludes structural C4 nodes
 * such as components, code modules, and grouping containers.
 */
export function isResilienceAdviceTarget(schema: SystemSchema, entityRef: EntityRef): boolean {
  const node = schema.nodes.find(candidate => candidate.entityRef === entityRef);
  if (!node) return false;
  return nodeRole(node.type) !== 'structural';
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
  return schema.nodes.find(node => node.entityRef === entityRef)?.name ?? entityRef;
}

function resolveContainerScope(schema: SystemSchema, entityRef: EntityRef): EntityRef {
  if (schema.entityRef) return schema.entityRef;

  const node = schema.nodes.find(candidate => candidate.entityRef === entityRef);
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
