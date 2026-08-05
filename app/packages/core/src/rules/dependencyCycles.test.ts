import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { canonicalCycleKey, collectDependencyCycles, findSimpleCycles } from './dependencyCycles';

function schema(
  nodes: SystemSchema['nodes'],
  dependencies: SystemSchema['dependencies'],
  level: SystemSchema['level'] = 'component'
): SystemSchema {
  return {
    entityRef: 'acme/app',
    name: 'App',
    version: '1.0.0',
    level,
    metadata: { description: 'test' },
    nodes,
    dependencies,
  };
}

describe('canonicalCycleKey', () => {
  it('normalizes rotations of the same cycle', () => {
    expect(canonicalCycleKey(['a', 'b', 'c', 'a'])).toBe(canonicalCycleKey(['b', 'c', 'a', 'b']));
    expect(canonicalCycleKey(['a', 'b', 'c', 'a'])).toBe('a>b>c');
  });
});

describe('findSimpleCycles', () => {
  it('finds a mutual direct-call cycle', () => {
    const cycles = findSimpleCycles(
      schema(
        [
          { entityRef: 'a', name: 'A', type: 'component' },
          { entityRef: 'b', name: 'B', type: 'component' },
        ],
        [
          { from: 'a', to: 'b', type: 'direct-call' },
          { from: 'b', to: 'a', type: 'direct-call' },
        ]
      )
    );
    expect(cycles).toHaveLength(1);
    expect(canonicalCycleKey(cycles[0]!)).toBe('a>b');
  });
});

describe('collectDependencyCycles', () => {
  it('marks non-external direct-call cycles as actionable', () => {
    const result = collectDependencyCycles([
      {
        path: 'billing.yaml',
        schema: schema(
          [
            { entityRef: 'a', name: 'A', type: 'component' },
            { entityRef: 'b', name: 'B', type: 'component' },
          ],
          [
            { from: 'a', to: 'b', type: 'direct-call' },
            { from: 'b', to: 'a', type: 'direct-call' },
          ]
        ),
      },
    ]);
    expect(result.actionable).toHaveLength(1);
    expect(result.informational).toHaveLength(0);
    expect(result.actionable[0]?.reason).toBe('module-direct-call');
  });

  it('marks cycles through external proxies as informational', () => {
    const result = collectDependencyCycles([
      {
        path: 'analysis.yaml',
        schema: schema(
          [
            { entityRef: 'domain', name: 'Domain', type: 'component' },
            {
              entityRef: 'writer',
              name: 'Writer',
              type: 'component',
              external: true,
            },
          ],
          [
            { from: 'domain', to: 'writer', type: 'direct-call' },
            { from: 'writer', to: 'domain', type: 'read-write' },
          ]
        ),
      },
    ]);
    expect(result.actionable).toHaveLength(0);
    expect(result.informational).toHaveLength(1);
    expect(result.informational[0]?.reason).toBe('includes-external-proxy');
  });

  it('marks inter-container / read-write-only cycles as informational', () => {
    const result = collectDependencyCycles([
      {
        path: 'containers.yaml',
        schema: schema(
          [
            { entityRef: 'analysis', name: 'Analysis', type: 'container' },
            { entityRef: 'writers', name: 'Writers', type: 'container' },
          ],
          [
            { from: 'analysis', to: 'writers', type: 'inter-container' },
            { from: 'writers', to: 'analysis', type: 'inter-container' },
          ],
          'container'
        ),
      },
    ]);
    expect(result.actionable).toHaveLength(0);
    expect(result.informational).toHaveLength(1);
    expect(result.informational[0]?.reason).toBe('non-direct-call-edges');
  });

  it('dedupes the same cycle path across diagrams', () => {
    const cycleSchema = schema(
      [
        { entityRef: 'a', name: 'A', type: 'component' },
        { entityRef: 'b', name: 'B', type: 'component' },
      ],
      [
        { from: 'a', to: 'b', type: 'direct-call' },
        { from: 'b', to: 'a', type: 'direct-call' },
      ]
    );
    const result = collectDependencyCycles([
      { path: 'one.yaml', schema: cycleSchema },
      { path: 'two.yaml', schema: cycleSchema },
    ]);
    expect(result.actionable).toHaveLength(1);
  });
});
