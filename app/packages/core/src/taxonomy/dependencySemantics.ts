import type { DependencyType } from '../models/schema';

export type DependencySemantics = 'synchronous' | 'async-stream' | 'data-access';

export type PropagationAxis = 'availability' | 'integrity';

const SEMANTICS_BY_TYPE: Record<DependencyType, DependencySemantics> = {
  'direct-call': 'synchronous',
  'inter-container': 'synchronous',
  'publish-subscribe': 'async-stream',
  'read-write': 'data-access',
};

export function dependencySemantics(type: DependencyType): DependencySemantics {
  return SEMANTICS_BY_TYPE[type];
}

export function isAsyncStreamDependency(type: DependencyType): boolean {
  return dependencySemantics(type) === 'async-stream';
}
