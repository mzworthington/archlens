import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '../../models/schema';
import {
  resolveExternalDisplayLevel,
  rollupEntityRefToDisplayLevel,
  suggestOverviewExternalDependencies,
  groupOverviewExternalsByBand,
  computeExternalSummaryEdgePairs,
  filterOverviewExternalsForSelection,
  externalSummaryHubId,
} from './externalScope';

const containerSchema: SystemSchema = {
  name: 'Cli Containers',
  version: '1.0.0',
  level: 'container',
  entityRef: 'application/cli',
  nodes: [
    { entityRef: 'application/cli/vhs', type: 'container', name: 'Vhs Service' },
    { entityRef: 'application/cli/analysis', type: 'container', name: 'Analysis Service' },
    { entityRef: 'application/cli/writers', type: 'container', name: 'Writers Service' },
  ],
  dependencies: [
    { from: 'application/cli/vhs', to: 'application/cli/analysis', type: 'inter-container' },
    { from: 'application/cli/writers', to: 'application/cli/vhs', type: 'inter-container' },
  ],
};

const vhsComponents: SystemSchema = {
  name: 'Vhs Components',
  version: '1.0.0',
  level: 'component',
  entityRef: 'application/cli/vhs',
  nodes: [
    {
      entityRef: 'application/cli/vhs/cli-demo-test',
      type: 'background-worker',
      name: 'cli-demo.test Service',
    },
  ],
  dependencies: [],
};

const writersComponents: SystemSchema = {
  name: 'Writers Components',
  version: '1.0.0',
  level: 'component',
  entityRef: 'application/cli/writers',
  nodes: [
    {
      entityRef: 'application/cli/writers/context-level-writer',
      type: 'background-worker',
      name: 'Context Level Writer',
    },
  ],
  dependencies: [
    {
      from: 'application/cli/writers/context-level-writer',
      to: 'application/cli/vhs/cli-demo-test',
      type: 'direct-call',
    },
  ],
};

const loadedSystems = [
  { path: 'containers.yaml', name: 'Containers', schema: containerSchema },
  { path: 'vhs-components.yaml', name: 'Vhs', schema: vhsComponents },
  { path: 'writers-components.yaml', name: 'Writers', schema: writersComponents },
];

import { buildWorkspaceEntityIndex } from './entityIndex';

describe('externalScope', () => {
  it('resolves parent C4 display level for each diagram level', () => {
    expect(resolveExternalDisplayLevel('component')).toBe('container');
    expect(resolveExternalDisplayLevel('container')).toBe('context');
    expect(resolveExternalDisplayLevel('context')).toBe('context');
    expect(resolveExternalDisplayLevel('code')).toBe('component');
  });

  it('rolls component refs up to container level using the workspace index', () => {
    const index = buildWorkspaceEntityIndex(loadedSystems);
    expect(
      rollupEntityRefToDisplayLevel(
        'application/cli/writers/context-level-writer',
        'container',
        index
      )
    ).toBe('application/cli/writers');
  });

  it('suggests container-level neighbors only on component diagrams', () => {
    const index = buildWorkspaceEntityIndex(loadedSystems);
    const overview = suggestOverviewExternalDependencies(vhsComponents, loadedSystems, index);
    const refs = overview.map(e => e.entityRef);

    expect(refs).toContain('application/cli/analysis');
    expect(refs).toContain('application/cli/writers');
    expect(refs).not.toContain('application/cli/writers/context-level-writer');
  });

  it('groups overview externals into caller and target bands', () => {
    const active: SystemSchema = {
      ...vhsComponents,
      dependencies: [
        {
          from: 'application/cli/analysis',
          to: 'application/cli/vhs/cli-demo-test',
          type: 'direct-call',
        },
        {
          from: 'application/cli/vhs/cli-demo-test',
          to: 'application/cli/writers',
          type: 'direct-call',
        },
      ],
    };
    const index = buildWorkspaceEntityIndex(loadedSystems);
    const overview = suggestOverviewExternalDependencies(active, loadedSystems, index);
    const bands = groupOverviewExternalsByBand(active, overview);

    expect(bands.callers.map(e => e.entityRef)).toContain('application/cli/analysis');
    expect(bands.targets.map(e => e.entityRef)).toContain('application/cli/writers');
  });

  it('computes aggregated hub edges to internal nodes only', () => {
    const pairs = computeExternalSummaryEdgePairs(
      [
        { from: 'ext/a', to: 'application/cli/vhs/cli-demo-test', type: 'direct-call' },
        { from: 'application/cli/vhs/cli-demo-test', to: 'ext/b', type: 'direct-call' },
      ],
      new Set(['ext/a']),
      new Set(['ext/b']),
      ref => ref.startsWith('application/cli/vhs')
    );

    expect(pairs).toEqual([
      { band: 'callers', internalRef: 'application/cli/vhs/cli-demo-test' },
      { band: 'targets', internalRef: 'application/cli/vhs/cli-demo-test' },
    ]);
  });

  it('filters overview externals to 1-hop selection neighbors', () => {
    const bands = {
      callers: [
        {
          entityRef: 'application/cli/analysis',
          name: 'Analysis',
          type: 'container' as const,
          sourceSchemaLevel: 'container' as const,
          sourcePath: 'c.yaml',
        },
        {
          entityRef: 'application/other',
          name: 'Other',
          type: 'container' as const,
          sourceSchemaLevel: 'container' as const,
          sourcePath: 'o.yaml',
        },
      ],
      targets: [
        {
          entityRef: 'application/cli/writers',
          name: 'Writers',
          type: 'container' as const,
          sourceSchemaLevel: 'container' as const,
          sourcePath: 'w.yaml',
        },
      ],
    };
    const deps = [
      {
        from: 'application/cli/analysis',
        to: 'application/cli/vhs/cli-demo-test',
        type: 'direct-call' as const,
      },
      {
        from: 'application/cli/vhs/cli-demo-test',
        to: 'application/cli/writers',
        type: 'direct-call' as const,
      },
    ];

    const filtered = filterOverviewExternalsForSelection(
      'application/cli/vhs/cli-demo-test',
      bands,
      deps
    );

    expect(filtered.callers.map(e => e.entityRef)).toEqual(['application/cli/analysis']);
    expect(filtered.targets.map(e => e.entityRef)).toEqual(['application/cli/writers']);
    expect(filtered.callers.map(e => e.entityRef)).not.toContain('application/other');
  });

  it('exposes stable hub ids per band', () => {
    expect(externalSummaryHubId('callers')).toContain('callers');
    expect(externalSummaryHubId('targets')).toContain('targets');
  });
});
