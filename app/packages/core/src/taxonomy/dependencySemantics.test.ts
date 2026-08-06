import { describe, expect, it } from 'vitest';
import type { DependencyType } from '../models/schema';
import {
  dependencySemantics,
  isAsyncStreamDependency,
  isAvailabilityPropagatingDependency,
} from './dependencySemantics';

const ALL_DEPENDENCY_TYPES: DependencyType[] = [
  'direct-call',
  'publish-subscribe',
  'read-write',
  'inter-container',
  'provisions',
];

describe('dependencySemantics', () => {
  it('maps every DependencyType to semantics', () => {
    for (const type of ALL_DEPENDENCY_TYPES) {
      expect(dependencySemantics(type)).toBeTruthy();
    }
  });

  it('identifies publish-subscribe as async-stream', () => {
    expect(dependencySemantics('publish-subscribe')).toBe('async-stream');
    expect(isAsyncStreamDependency('publish-subscribe')).toBe(true);
    expect(isAsyncStreamDependency('direct-call')).toBe(false);
  });

  it('treats provisions as non-runtime provisioning (no availability propagation)', () => {
    expect(dependencySemantics('provisions')).toBe('provisioning');
    expect(isAvailabilityPropagatingDependency('provisions')).toBe(false);
    expect(isAvailabilityPropagatingDependency('direct-call')).toBe(true);
    expect(isAvailabilityPropagatingDependency('read-write')).toBe(true);
  });
});
