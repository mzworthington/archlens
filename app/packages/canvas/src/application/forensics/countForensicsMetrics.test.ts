import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import { countSchemaForensicsMetrics } from './countForensicsMetrics';

const schema = (partial: Partial<SystemSchema> & Pick<SystemSchema, 'nodes'>): SystemSchema => ({
  name: 'Demo',
  version: '1.0.0',
  level: 'component',
  dependencies: [],
  ...partial,
});

describe('countSchemaForensicsMetrics', () => {
  it('counts diagram-wide externals, tests and dependencies when nothing is selected', () => {
    const s = schema({
      nodes: [
        { entityRef: 'a/core', name: 'Core', type: 'component' },
        { entityRef: 'a/downstream-ext', name: 'Downstream', type: 'component', external: true },
        { entityRef: 'a/upstream-ext', name: 'Upstream', type: 'component', external: true },
        { entityRef: 'a/test', name: 'Test', type: 'component', isTest: true },
      ],
      dependencies: [
        { from: 'a/core', to: 'a/downstream-ext', type: 'direct-call' },
        { from: 'a/upstream-ext', to: 'a/core', type: 'direct-call' },
        { from: 'a/core', to: 'a/test', type: 'direct-call' },
      ],
    });

    expect(countSchemaForensicsMetrics(s)).toEqual({
      upstreamExternals: 1,
      downstreamExternals: 1,
      tests: 1,
      dependencies: 3,
      coupledNodes: 0,
    });
  });

  it('counts partners and incident edges for a selected node', () => {
    const s = schema({
      nodes: [
        { entityRef: 'a/core', name: 'Core', type: 'component' },
        { entityRef: 'a/downstream-ext', name: 'Downstream', type: 'component', external: true },
        { entityRef: 'a/upstream-ext', name: 'Upstream', type: 'component', external: true },
        { entityRef: 'a/test', name: 'Test', type: 'component', isTest: true },
      ],
      dependencies: [
        { from: 'a/core', to: 'a/downstream-ext', type: 'direct-call' },
        { from: 'a/upstream-ext', to: 'a/core', type: 'direct-call' },
        { from: 'a/test', to: 'a/core', type: 'direct-call' },
      ],
    });

    expect(countSchemaForensicsMetrics(s, 'a/core')).toEqual({
      upstreamExternals: 1,
      downstreamExternals: 1,
      tests: 1,
      dependencies: 3,
      coupledNodes: 0,
    });
  });

  it('returns zeros for an unknown selection', () => {
    const s = schema({
      nodes: [{ entityRef: 'a/core', name: 'Core', type: 'component', external: true }],
      dependencies: [{ from: 'a/core', to: 'a/missing', type: 'direct-call' }],
    });

    expect(countSchemaForensicsMetrics(s, 'a/missing-node')).toEqual({
      upstreamExternals: 0,
      downstreamExternals: 0,
      tests: 0,
      dependencies: 0,
      coupledNodes: 0,
    });
  });
});
