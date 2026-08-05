import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import { rankForensicsOffenders, resolveLookbackDays } from './rankOffenders';

const componentSchema = (nodes: SystemSchema['nodes']): SystemSchema => ({
  name: 'Canvas Components',
  version: '1.0.0',
  level: 'component',
  nodes,
  dependencies: [],
});

const containerSchema = (nodes: SystemSchema['nodes']): SystemSchema => ({
  name: 'App Containers',
  version: '1.0.0',
  level: 'container',
  nodes,
  dependencies: [],
});

describe('rankForensicsOffenders', () => {
  it('ranks component hotspots by score and classification', () => {
    const systems = [
      {
        path: 'canvas-components.yaml',
        name: 'canvas',
        schema: componentSchema([
          {
            entityRef: 'app/canvas/ok',
            name: 'OK',
            type: 'component',
            forensics: { hotspotScore: 0.1, complexity: 2, churn: 1, classifications: [] },
          },
          {
            entityRef: 'app/canvas/db',
            name: 'DB',
            type: 'component',
            properties: { containerId: 'canvas' },
            forensics: {
              hotspotScore: 0.9,
              complexity: 40,
              churn: 8,
              authorCount: 2,
              classifications: ['hotspot'],
              sinceDays: 90,
            },
          },
          {
            entityRef: 'app/canvas/mid',
            name: 'Mid',
            type: 'component',
            forensics: {
              hotspotScore: 0.55,
              complexity: 12,
              churn: 3,
              classifications: [],
              sinceDays: 90,
            },
          },
        ]),
      },
    ];

    const ranked = rankForensicsOffenders(systems, 'components', 'all');
    expect(ranked.map(r => r.entityRef)).toEqual([
      'app/canvas/db',
      'app/canvas/mid',
      'app/canvas/ok',
    ]);
    expect(ranked[0].parentLabel).toBe('canvas');
    expect(ranked[0].concern.level).toBe('danger');
  });

  it('filters hotspots and silos', () => {
    const systems = [
      {
        path: 'c.yaml',
        name: 'c',
        schema: componentSchema([
          {
            entityRef: 'a/hot',
            name: 'Hot',
            type: 'component',
            forensics: {
              hotspotScore: 0.8,
              classifications: ['hotspot'],
            },
          },
          {
            entityRef: 'a/silo',
            name: 'Silo',
            type: 'component',
            forensics: {
              hotspotScore: 0.2,
              complexity: 20,
              authorCount: 1,
              classifications: ['knowledge-silo'],
            },
          },
        ]),
      },
    ];

    expect(rankForensicsOffenders(systems, 'components', 'hotspots')).toHaveLength(1);
    expect(rankForensicsOffenders(systems, 'components', 'hotspots')[0].entityRef).toBe('a/hot');
    expect(rankForensicsOffenders(systems, 'components', 'silos')[0].entityRef).toBe('a/silo');
  });

  it('ranks refactor candidates by complexity × churn × (1 - ownership)', () => {
    const systems = [
      {
        path: 'c.yaml',
        name: 'c',
        schema: componentSchema([
          {
            entityRef: 'a/low',
            name: 'Low',
            type: 'component',
            forensics: {
              hotspotScore: 0.1,
              complexity: 5,
              churn: 2,
              topAuthorPercent: 0.9,
            },
          },
          {
            entityRef: 'a/high',
            name: 'High',
            type: 'component',
            forensics: {
              hotspotScore: 0.2,
              complexity: 20,
              churn: 10,
              topAuthorPercent: 0.5,
            },
          },
        ]),
      },
    ];

    const ranked = rankForensicsOffenders(systems, 'components', 'refactor');
    expect(ranked.map(r => r.entityRef)).toEqual(['a/high', 'a/low']);
    expect(ranked[0].refactorScore).toBe(100);
    expect(ranked[1].refactorScore).toBeCloseTo(1);
  });

  it('boosts refactor ranking when ChaosLens shows critical-path exposure', () => {
    const systems = [
      {
        path: 'c.yaml',
        name: 'c',
        schema: componentSchema([
          {
            entityRef: 'a/quiet',
            name: 'Quiet',
            type: 'component',
            forensics: {
              hotspotScore: 0.2,
              complexity: 12,
              churn: 6,
              topAuthorPercent: 0.5,
            },
          },
          {
            entityRef: 'a/blast',
            name: 'Blast',
            type: 'component',
            forensics: {
              hotspotScore: 0.3,
              complexity: 10,
              churn: 5,
              topAuthorPercent: 0.5,
            },
          },
        ]),
      },
    ];

    const chaosContext = new Map([
      [
        'a/blast',
        {
          blastRadius: 0.9,
          onCriticalPath: true,
          isSpof: true,
          safeguardCoverage: 0,
        },
      ],
      [
        'a/quiet',
        {
          blastRadius: 0.05,
          onCriticalPath: false,
          isSpof: false,
          safeguardCoverage: 1,
        },
      ],
    ]);

    const ranked = rankForensicsOffenders(systems, 'components', 'refactor', chaosContext);
    expect(ranked[0].entityRef).toBe('a/blast');
    const blast = ranked.find(r => r.entityRef === 'a/blast')!;
    expect(blast.effectiveRefactorScore).toBeGreaterThan(blast.refactorScore);
    expect(blast.compositeRiskScore).toBeCloseTo(0.27);
  });

  it('includes dependency count as structural context on ranked rows', () => {
    const systems = [
      {
        path: 'c.yaml',
        name: 'c',
        schema: componentSchema([
          {
            entityRef: 'a/ext',
            name: 'Ext',
            type: 'component',
            external: true,
            forensics: { hotspotScore: 0.6, classifications: ['hotspot'] },
          },
          {
            entityRef: 'a/test',
            name: 'Test',
            type: 'component',
            isTest: true,
            forensics: { hotspotScore: 0.2, complexity: 3, classifications: [] },
          },
          {
            entityRef: 'a/plain',
            name: 'Plain',
            type: 'component',
            forensics: { hotspotScore: 0.1, classifications: [] },
          },
        ]),
      },
    ];
    systems[0].schema.dependencies = [
      { from: 'a/ext', to: 'a/test', type: 'direct-call' },
      { from: 'a/plain', to: 'a/ext', type: 'direct-call' },
    ];

    const ranked = rankForensicsOffenders(systems, 'components', 'all');
    expect(ranked.find(r => r.entityRef === 'a/ext')?.dependencyCount).toBe(2);
    expect(ranked.find(r => r.entityRef === 'a/test')?.dependencyCount).toBe(1);
    expect(ranked.find(r => r.entityRef === 'a/plain')?.dependencyCount).toBe(1);
  });

  it('ranks container rollups and ignores component diagrams in containers scope', () => {
    const systems = [
      {
        path: 'containers.yaml',
        name: 'containers',
        schema: containerSchema([
          {
            entityRef: 'app/cli',
            name: 'CLI',
            type: 'container',
            forensics: {
              hotspotScore: 0.4,
              hotspotCount: 3,
              knowledgeSiloCount: 1,
              classifications: [],
              sinceDays: 120,
            },
          },
          {
            entityRef: 'app/canvas',
            name: 'Canvas',
            type: 'container',
            forensics: {
              hotspotScore: 0.7,
              hotspotCount: 5,
              knowledgeSiloCount: 0,
              classifications: ['hotspot'],
              sinceDays: 90,
            },
          },
        ]),
      },
      {
        path: 'comps.yaml',
        name: 'comps',
        schema: componentSchema([
          {
            entityRef: 'app/canvas/db',
            name: 'DB',
            type: 'component',
            forensics: { hotspotScore: 0.99, classifications: ['hotspot'] },
          },
        ]),
      },
    ];

    const ranked = rankForensicsOffenders(systems, 'containers', 'all');
    expect(ranked).toHaveLength(2);
    expect(ranked[0].entityRef).toBe('app/canvas');
    expect(resolveLookbackDays(ranked)).toBe(120);
  });

  it('filters heating offenders by churn acceleration', () => {
    const systems = [
      {
        path: 'c.yaml',
        name: 'c',
        schema: componentSchema([
          {
            entityRef: 'a/heating',
            name: 'Heating',
            type: 'component',
            forensics: { churn30: 6, churn365: 6, hotspotScore: 0.1, complexity: 5 },
          },
          {
            entityRef: 'a/stable',
            name: 'Stable',
            type: 'component',
            forensics: { churn30: 1, churn365: 12, hotspotScore: 0.1, complexity: 5 },
          },
        ]),
      },
    ];

    const ranked = rankForensicsOffenders(systems, 'components', 'heating');
    expect(ranked).toHaveLength(1);
    expect(ranked[0].entityRef).toBe('a/heating');
  });

  it('filters prod and test offenders separately', () => {
    const systems = [
      {
        path: 'c.yaml',
        name: 'c',
        schema: componentSchema([
          {
            entityRef: 'a/prod',
            name: 'Prod',
            type: 'component',
            forensics: { hotspotScore: 0.1, complexity: 2 },
          },
          {
            entityRef: 'a/test',
            name: 'Test',
            type: 'component',
            isTest: true,
            forensics: { hotspotScore: 0.2, complexity: 3 },
          },
        ]),
      },
    ];

    expect(rankForensicsOffenders(systems, 'components', 'all', undefined, 'prod')).toHaveLength(1);
    expect(
      rankForensicsOffenders(systems, 'components', 'all', undefined, 'prod')[0].entityRef
    ).toBe('a/prod');
    expect(rankForensicsOffenders(systems, 'components', 'all', undefined, 'test')).toHaveLength(1);
    expect(
      rankForensicsOffenders(systems, 'components', 'all', undefined, 'test')[0].entityRef
    ).toBe('a/test');
  });
});

describe('offenderMatchesEntityScope', () => {
  it('matches descendants by entityRef prefix and containerId', async () => {
    const { offenderMatchesEntityScope, rankForensicsOffenders } = await import('./rankOffenders');
    const systems = [
      {
        path: 'canvas-components.yaml',
        name: 'canvas',
        schema: componentSchema([
          {
            entityRef: 'app/canvas/db',
            name: 'DB',
            type: 'component',
            properties: { containerId: 'canvas' },
            forensics: { hotspotScore: 0.9, classifications: ['hotspot'] },
          },
          {
            entityRef: 'app/cli/run',
            name: 'Run',
            type: 'component',
            forensics: { hotspotScore: 0.5, classifications: [] },
          },
        ]),
      },
    ];

    const ranked = rankForensicsOffenders(systems, 'components', 'all');
    const canvasDb = ranked.find(r => r.entityRef === 'app/canvas/db')!;
    const cliRun = ranked.find(r => r.entityRef === 'app/cli/run')!;

    expect(offenderMatchesEntityScope(canvasDb, 'app/canvas', systems)).toBe(true);
    expect(offenderMatchesEntityScope(cliRun, 'app/canvas', systems)).toBe(false);
    expect(offenderMatchesEntityScope(canvasDb, 'app/canvas/db', systems)).toBe(true);
  });
});

describe('loadedSystemsHaveForensics', () => {
  it('returns true when any node has forensics', async () => {
    const { loadedSystemsHaveForensics } = await import('./rankOffenders');
    expect(
      loadedSystemsHaveForensics([
        {
          path: 'c.yaml',
          name: 'c',
          schema: componentSchema([
            { entityRef: 'a/x', name: 'X', type: 'component', forensics: { churn: 1 } },
          ]),
        },
      ])
    ).toBe(true);
  });

  it('returns false when no forensics blocks exist', async () => {
    const { loadedSystemsHaveForensics } = await import('./rankOffenders');
    expect(
      loadedSystemsHaveForensics([
        {
          path: 'c.yaml',
          name: 'c',
          schema: componentSchema([{ entityRef: 'a/x', name: 'X', type: 'component' }]),
        },
      ])
    ).toBe(false);
  });
});
