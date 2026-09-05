import { describe, expect, it } from 'vitest';
import { buildRefactorPlanForOffender, collectRefactorBoundaryNodes } from './buildRefactorPlan';
import type { RankedOffender, LoadedSystemRef } from './rankOffenders';

describe('buildRefactorPlan', () => {
  it('collects boundary node inputs from loaded systems', () => {
    const nodes = collectRefactorBoundaryNodes([
      {
        path: 'components.yaml',
        name: 'app',
        schema: {
          name: 'App',
          version: '1.0.0',
          level: 'component' as const,
          nodes: [
            {
              entityRef: 'app/a',
              name: 'A',
              type: 'component',
              properties: { filepath: 'src/a.ts', containerId: 'svc' },
              forensics: {
                hotspotScore: 0.8,
                coupledFiles: [{ path: 'src/b.ts', score: 0.6, sharedCommits: 4 }],
              },
            },
            {
              entityRef: 'app/b',
              name: 'B',
              type: 'component',
              properties: { filepath: 'src/b.ts' },
              forensics: { hotspotScore: 0.4 },
            },
          ],
          dependencies: [],
        },
      },
    ]);

    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({
      entityRef: 'app/a',
      filepath: 'src/a.ts',
      containerId: 'svc',
    });
  });

  it('builds boundary, ownership and suggestions for an offender', () => {
    const systems = [
      {
        path: 'components.yaml',
        name: 'app',
        schema: {
          name: 'App',
          version: '1.0.0',
          level: 'component' as const,
          nodes: [
            {
              entityRef: 'app/a',
              name: 'A',
              type: 'component',
              properties: { filepath: 'src/a.ts' },
              forensics: {
                hotspotScore: 0.9,
                complexity: 20,
                churn: 10,
                authorCount: 1,
                topAuthorPercent: 1,
                classifications: ['hotspot'],
                coupledFiles: [{ path: 'src/b.ts', score: 0.7, sharedCommits: 5 }],
                authors: [{ email: 'dev@example.com', commits: 10 }],
              },
            },
            {
              entityRef: 'app/b',
              name: 'B',
              type: 'component',
              properties: { filepath: 'src/b.ts' },
              forensics: { hotspotScore: 0.5, complexity: 12, churn: 6 },
            },
          ],
          dependencies: [],
        },
      },
    ];

    const offender = {
      entityRef: 'app/a',
      schemaPath: 'components.yaml',
      diagramEntityRef: 'app',
      name: 'A',
    } as RankedOffender;

    const plan = buildRefactorPlanForOffender(offender, systems as LoadedSystemRef[]);

    expect(plan.boundary).toBeDefined();
    expect(plan.boundary?.seedEntityRef).toBe('app/a');
    expect(plan.ownership?.authors).toHaveLength(1);
    expect(plan.coupledFiles).toHaveLength(1);
    expect(plan.suggestions.length).toBeGreaterThan(0);
  });
});
