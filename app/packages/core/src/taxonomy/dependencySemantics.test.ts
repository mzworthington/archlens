import { describe, expect, it } from 'vitest';
import type { DependencyType } from '../models/schema';
import { dependencySemantics, isAsyncStreamDependency } from './dependencySemantics';

const ALL_DEPENDENCY_TYPES: DependencyType[] = [
  'direct-call',
  'publish-subscribe',
  'read-write',
  'inter-container',
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
});
