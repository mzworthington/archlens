import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '@blueprint/core';
import {
  classifyExternalNode,
  countExternalNodesByDirection,
  isExternalNodeVisible,
  shouldShowExternalNode,
} from './externalNodeVisibility';

const schema = (partial: Partial<SystemSchema> & Pick<SystemSchema, 'nodes'>): SystemSchema => ({
  name: 'Demo',
  apiVersion: 'blueprint.dev/v4', kind: 'Diagram',
  level: 'component',
  dependencies: [],
  ...partial,
});

describe('externalNodeVisibility', () => {
  const diagram = schema({
    nodes: [
      { entityRef: 'a/core', name: 'Core', type: 'component' },
      { entityRef: 'a/downstream-ext', name: 'Downstream', type: 'component', external: true },
      { entityRef: 'a/upstream-ext', name: 'Upstream', type: 'component', external: true },
      { entityRef: 'a/orphan-ext', name: 'Orphan', type: 'component', external: true },
    ],
    dependencies: [
      { from: 'a/core', to: 'a/downstream-ext', type: 'direct-call' },
      { from: 'a/upstream-ext', to: 'a/core', type: 'direct-call' },
    ],
  });

  it('classifies upstream and downstream externals from dependency direction', () => {
    expect(classifyExternalNode('a/downstream-ext', diagram)).toEqual({
      upstream: false,
      downstream: true,
    });
    expect(classifyExternalNode('a/upstream-ext', diagram)).toEqual({
      upstream: true,
      downstream: false,
    });
    expect(classifyExternalNode('a/orphan-ext', diagram)).toEqual({
      upstream: false,
      downstream: false,
    });
  });

  it('shows externals based on directional toggles', () => {
    expect(shouldShowExternalNode({ upstream: true, downstream: false }, true, false)).toBe(true);
    expect(shouldShowExternalNode({ upstream: true, downstream: false }, false, true)).toBe(false);
    expect(shouldShowExternalNode({ upstream: false, downstream: false }, true, false)).toBe(true);
    expect(shouldShowExternalNode({ upstream: false, downstream: false }, false, false)).toBe(
      false
    );
  });

  it('filters schema externals by direction', () => {
    expect(isExternalNodeVisible('a/downstream-ext', diagram, true, false)).toBe(false);
    expect(isExternalNodeVisible('a/downstream-ext', diagram, false, true)).toBe(true);
    expect(isExternalNodeVisible('a/downstream-ext', diagram, false, false)).toBe(false);

    expect(isExternalNodeVisible('a/upstream-ext', diagram, true, false)).toBe(true);
    expect(isExternalNodeVisible('a/upstream-ext', diagram, false, true)).toBe(false);
  });

  it('counts externals per direction', () => {
    expect(countExternalNodesByDirection(diagram)).toEqual({ upstream: 2, downstream: 2 });
  });
});
