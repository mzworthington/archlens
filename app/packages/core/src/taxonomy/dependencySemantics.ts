import type { DependencyType } from '../models/schema';

export type DependencySemantics =
  | 'synchronous'
  | 'async-stream'
  | 'data-access'
  /** Declarative link from IaC to provisioned infrastructure - not a runtime call. */
  | 'provisioning';

export type PropagationAxis = 'availability' | 'integrity';

const SEMANTICS_BY_TYPE: Record<DependencyType, DependencySemantics> = {
  'direct-call': 'synchronous',
  'inter-container': 'synchronous',
  'publish-subscribe': 'async-stream',
  'read-write': 'data-access',
  provisions: 'provisioning',
};

export function dependencySemantics(type: DependencyType): DependencySemantics {
  return SEMANTICS_BY_TYPE[type];
}

export function isAsyncStreamDependency(type: DependencyType): boolean {
  return dependencySemantics(type) === 'async-stream';
}

/** Edges that participate in ChaosLens availability blast-radius propagation. */
export function isAvailabilityPropagatingDependency(type: DependencyType): boolean {
  const semantics = dependencySemantics(type);
  return semantics === 'synchronous' || semantics === 'async-stream' || semantics === 'data-access';
}
