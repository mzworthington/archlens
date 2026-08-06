import { describe, expect, it } from 'vitest';
import type { SystemNode } from '@archlens/core';
import {
  applyHydrationUpgrade,
  findComponentInMap,
  pushUniqueDependency,
} from './modelExtractorHelpers.ts';

describe('applyHydrationUpgrade', () => {
  it('upgrades node type when hydration has higher priority', () => {
    const node: SystemNode = {
      entityRef: 'shop/api/core',
      type: 'code-module',
      name: 'Core',
      properties: { technology: 'TypeScript' },
    };

    applyHydrationUpgrade(
      node,
      { type: 'rest-api', technology: 'NestJS', reason: 'controller' },
      false
    );

    expect(node.type).toBe('rest-api');
    expect(node.properties?.technology).toBe('NestJS');
    expect(node.properties?.classification).toBe('controller');
    expect(node.isTest).toBe(false);
  });

  it('keeps existing type when hydration is lower priority', () => {
    const node: SystemNode = {
      entityRef: 'shop/api/core',
      type: 'rest-api',
      name: 'Core',
      isTest: true,
    };

    applyHydrationUpgrade(
      node,
      { type: 'code-module', technology: 'TypeScript', reason: 'util' },
      true
    );

    expect(node.type).toBe('rest-api');
    expect(node.isTest).toBe(true);
  });
});

describe('findComponentInMap', () => {
  const nodes = new Map<string, SystemNode>([
    ['api/orders', { entityRef: 'shop/api/orders', type: 'component', name: 'Orders' }],
    ['web/orders', { entityRef: 'shop/web/orders', type: 'component', name: 'Orders UI' }],
  ]);

  it('prefers the container-hinted map key', () => {
    expect(findComponentInMap(nodes, 'web', 'orders')?.entityRef).toBe('shop/web/orders');
  });

  it('falls back to suffix match when hint misses', () => {
    expect(findComponentInMap(nodes, 'missing', 'orders')?.entityRef).toBe('shop/api/orders');
  });
});

describe('pushUniqueDependency', () => {
  it('dedupes identical edges', () => {
    const deps = [
      {
        from: 'a',
        to: 'b',
        type: 'direct-call' as const,
        description: 'x',
      },
    ];
    pushUniqueDependency(deps, {
      from: 'a',
      to: 'b',
      type: 'direct-call',
      description: 'x',
    });
    pushUniqueDependency(deps, {
      from: 'a',
      to: 'c',
      type: 'direct-call',
    });
    expect(deps).toHaveLength(2);
  });
});
