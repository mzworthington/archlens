import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import { summarizeWorkspaceForensics, type LoadedSystemRef } from './summarizeWorkspaceForensics';

const v4 = 'https://archlens.dev/schemas/v4/blueprint.schema.json';

function system(
  path: string,
  schema: Partial<SystemSchema> & Pick<SystemSchema, 'level' | 'nodes'>
): LoadedSystemRef {
  return {
    path,
    name: schema.name ?? path,
    schema: {
      version: v4,
      name: schema.name ?? path,
      entityRef: schema.entityRef ?? path.replace(/\.yaml$/, ''),
      dependencies: schema.dependencies ?? [],
      ...schema,
    },
  };
}

describe('summarizeWorkspaceForensics', () => {
  it('returns zeros for an empty workspace', () => {
    expect(summarizeWorkspaceForensics([])).toEqual({
      diagramCount: 0,
      nodeCount: 0,
      dependencyCount: 0,
      nodesWithForensics: 0,
      totalLoc: 0,
      totalSloc: 0,
      maxComplexity: 0,
      avgComplexity: null,
      hotspotNodes: 0,
      knowledgeSiloNodes: 0,
      fileCount: 0,
    });
  });

  it('aggregates topology and forensics across diagrams without double-counting entityRefs', () => {
    const summary = summarizeWorkspaceForensics([
      system('shop/context.yaml', {
        level: 'context',
        entityRef: 'shop',
        name: 'Shop',
        nodes: [
          {
            entityRef: 'shop/api',
            type: 'software-system',
            name: 'API',
            forensics: {
              complexity: 5,
              loc: 100,
              sloc: 80,
              hotspotScore: 0.1,
              classifications: [],
            },
          },
        ],
        dependencies: [{ from: 'shop/web', to: 'shop/api', type: 'direct-call' }],
      }),
      system('shop/api-components.yaml', {
        level: 'component',
        entityRef: 'shop/api',
        name: 'API components',
        nodes: [
          {
            entityRef: 'shop/api',
            type: 'component',
            name: 'API root',
            forensics: {
              complexity: 40,
              loc: 900,
              sloc: 700,
              fileCount: 3,
              hotspotScore: 0.8,
              classifications: ['hotspot'],
              hotspotCount: 2,
            },
          },
          {
            entityRef: 'shop/api/handler',
            type: 'component',
            name: 'Handler',
            forensics: {
              complexity: 12,
              loc: 200,
              sloc: 160,
              hotspotScore: 0.4,
              classifications: ['knowledge-silo'],
            },
          },
        ],
        dependencies: [
          { from: 'shop/api/handler', to: 'shop/api/db', type: 'direct-call' },
          { from: 'shop/api/handler', to: 'shop/api/cache', type: 'direct-call' },
        ],
      }),
    ]);

    // shop/api prefers component-level forensics (loc 900) over context (loc 100).
    expect(summary.diagramCount).toBe(2);
    expect(summary.nodeCount).toBe(2); // shop/api + shop/api/handler
    expect(summary.dependencyCount).toBe(3);
    expect(summary.nodesWithForensics).toBe(2);
    expect(summary.totalLoc).toBe(1100);
    expect(summary.totalSloc).toBe(860);
    expect(summary.maxComplexity).toBe(40);
    expect(summary.avgComplexity).toBe(26); // (40+12)/2
    expect(summary.hotspotNodes).toBe(1);
    expect(summary.knowledgeSiloNodes).toBe(1);
    expect(summary.fileCount).toBe(4); // fileCount 3 on rollup + 1 leaf without fileCount
  });

  it('counts topology even when no TraceLens blocks are present', () => {
    const summary = summarizeWorkspaceForensics([
      system('bare/containers.yaml', {
        level: 'container',
        entityRef: 'bare',
        nodes: [
          { entityRef: 'bare/web', type: 'web-app', name: 'Web' },
          { entityRef: 'bare/api', type: 'rest-api', name: 'API' },
        ],
        dependencies: [{ from: 'bare/web', to: 'bare/api', type: 'direct-call' }],
      }),
    ]);

    expect(summary.diagramCount).toBe(1);
    expect(summary.nodeCount).toBe(2);
    expect(summary.dependencyCount).toBe(1);
    expect(summary.nodesWithForensics).toBe(0);
    expect(summary.totalLoc).toBe(0);
    expect(summary.avgComplexity).toBeNull();
  });
});
