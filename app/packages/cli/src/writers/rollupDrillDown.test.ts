import { describe, it, expect } from 'vitest';
import type { SystemDependency, SystemNode } from '@archlens/core';
import {
  buildRollupDrillDownSchemas,
  collectRollupDrillDownDependencies,
  fileLeafEntityRef,
  rollupDrillDownRelativePath,
  shouldEmitRollupDrillDown,
} from './rollupDrillDown.ts';

describe('rollupDrillDown', () => {
  it('builds file leaf entity refs under a rollup parent', () => {
    expect(fileLeafEntityRef('blueprint/app/cli/writers', 'contextLevelWriter')).toBe(
      'blueprint/app/cli/writers/context-level-writer'
    );
  });

  it('derives nested drill-down yaml paths from entity refs', () => {
    expect(rollupDrillDownRelativePath('blueprint/app/cli', 'blueprint/app/cli/writers')).toBe(
      'cli/writers-components.yaml'
    );
    expect(
      rollupDrillDownRelativePath('blueprint/app/cli', 'blueprint/app/cli/analysis/domain')
    ).toBe('cli/analysis/domain-components.yaml');
  });

  it('requires at least two member filepaths before emitting drill-down', () => {
    expect(
      shouldEmitRollupDrillDown({
        entityRef: 'blueprint/app/cli/writers',
        type: 'background-worker',
        name: 'Writers',
        properties: { memberFilepaths: ['a.ts'] },
      })
    ).toBe(false);
    expect(
      shouldEmitRollupDrillDown({
        entityRef: 'blueprint/app/cli/writers',
        type: 'background-worker',
        name: 'Writers',
        properties: { memberFilepaths: ['a.ts', 'b.ts'] },
      })
    ).toBe(true);
  });

  it('builds child component schemas for multi-file rollups', () => {
    const rollupNodes: SystemNode[] = [
      {
        entityRef: 'blueprint/app/cli/writers',
        type: 'background-worker',
        name: 'Writers',
        properties: {
          memberFilepaths: [
            'app/packages/cli/src/writers/baseWriter.ts',
            'app/packages/cli/src/writers/contextLevelWriter.ts',
          ],
        },
      },
    ];
    const fileLevelNodes: SystemNode[] = [
      {
        entityRef: 'blueprint/app/cli/writers/base-writer',
        type: 'background-worker',
        name: 'Base Writer',
        properties: { filepath: 'app/packages/cli/src/writers/baseWriter.ts' },
      },
      {
        entityRef: 'blueprint/app/cli/writers/context-level-writer',
        type: 'background-worker',
        name: 'Context Level Writer',
        properties: { filepath: 'app/packages/cli/src/writers/contextLevelWriter.ts' },
      },
    ];
    const fileLevelDependencies: SystemDependency[] = [
      {
        from: 'blueprint/app/cli/writers/context-level-writer',
        to: 'blueprint/app/cli/writers/base-writer',
        type: 'direct-call',
      },
      {
        from: 'blueprint/app/cli/writers/context-level-writer',
        to: 'blueprint/app/cli/analysis/domain/analyzer',
        type: 'direct-call',
      },
    ];

    const schemas = buildRollupDrillDownSchemas(
      'blueprint/app/cli',
      rollupNodes,
      fileLevelNodes,
      fileLevelDependencies
    );

    expect(schemas).toHaveLength(1);
    expect(schemas[0]?.relativePath).toBe('cli/writers-components.yaml');
    expect(schemas[0]?.schema.entityRef).toBe('blueprint/app/cli/writers');
    expect(schemas[0]?.schema.nodes).toHaveLength(2);
    expect(schemas[0]?.schema.dependencies).toEqual([
      {
        from: 'blueprint/app/cli/writers/context-level-writer',
        to: 'blueprint/app/cli/writers/base-writer',
        type: 'direct-call',
      },
      {
        from: 'blueprint/app/cli/writers/context-level-writer',
        to: 'blueprint/app/cli/analysis/domain/analyzer',
        type: 'direct-call',
      },
    ]);
  });

  it('builds nested drill-down schemas for multi-level folder rollups', () => {
    const rollupNodes: SystemNode[] = [
      {
        entityRef: 'blueprint/app/cli/writers',
        type: 'background-worker',
        name: 'Writers',
        properties: {
          memberFilepaths: [
            'app/packages/cli/src/writers/baseWriter.ts',
            'app/packages/cli/src/writers/nested/contextLevelWriter.ts',
          ],
        },
      },
      {
        entityRef: 'blueprint/app/cli/writers/nested',
        type: 'background-worker',
        name: 'Nested',
        properties: {
          memberFilepaths: [
            'app/packages/cli/src/writers/nested/contextLevelWriter.ts',
            'app/packages/cli/src/writers/nested/externalDependenciesPass.ts',
          ],
        },
      },
    ];
    const fileLevelNodes: SystemNode[] = [
      {
        entityRef: 'blueprint/app/cli/writers/base-writer',
        type: 'background-worker',
        name: 'Base Writer',
        properties: { filepath: 'app/packages/cli/src/writers/baseWriter.ts' },
      },
      {
        entityRef: 'blueprint/app/cli/writers/nested/context-level-writer',
        type: 'background-worker',
        name: 'Context Level Writer',
        properties: { filepath: 'app/packages/cli/src/writers/nested/contextLevelWriter.ts' },
      },
      {
        entityRef: 'blueprint/app/cli/writers/nested/external-dependencies-pass',
        type: 'background-worker',
        name: 'External Dependencies Pass',
        properties: { filepath: 'app/packages/cli/src/writers/nested/externalDependenciesPass.ts' },
      },
    ];

    const schemas = buildRollupDrillDownSchemas(
      'blueprint/app/cli',
      rollupNodes,
      fileLevelNodes,
      []
    );

    expect(schemas).toHaveLength(2);
    const writers = schemas.find(schema => schema.schema.entityRef === 'blueprint/app/cli/writers');
    const nested = schemas.find(
      schema => schema.schema.entityRef === 'blueprint/app/cli/writers/nested'
    );
    expect(writers?.schema.nodes.map(node => node.entityRef).sort()).toEqual([
      'blueprint/app/cli/writers/base-writer',
      'blueprint/app/cli/writers/nested',
    ]);
    expect(nested?.relativePath).toBe('cli/writers/nested-components.yaml');
    expect(nested?.schema.nodes).toHaveLength(2);
  });

  it('keeps outgoing dependencies to other rollups for external resolution', () => {
    const childRefs = new Set([
      'blueprint/app/cli/writers/context-level-writer',
      'blueprint/app/cli/writers/base-writer',
    ]);
    const deps = collectRollupDrillDownDependencies(
      'blueprint/app/cli/writers',
      [...childRefs].map(entityRef => ({ entityRef, type: 'background-worker', name: entityRef })),
      [
        {
          from: 'blueprint/app/cli/writers/context-level-writer',
          to: 'blueprint/app/cli/analysis/domain/analyzer',
          type: 'direct-call',
        },
      ]
    );

    expect(deps).toHaveLength(1);
    expect(childRefs.has(deps[0]!.from)).toBe(true);
  });

  it('rewrites cross-container deps to single-file rollup leaves onto the emitted rollup', () => {
    const analysisRollups: SystemNode[] = [
      {
        entityRef: 'blueprint/app/cli/analysis/domain',
        type: 'background-worker',
        name: 'Domain',
        properties: {
          containerId: 'analysis',
          memberFilepaths: [
            'app/packages/cli/src/analysis/domain/analyzer.ts',
            'app/packages/cli/src/analysis/domain/modelExtractor.ts',
          ],
        },
      },
    ];
    const writerRollups: SystemNode[] = [
      {
        entityRef: 'blueprint/app/cli/writers/contextlevelwriter',
        type: 'background-worker',
        name: 'Contextlevelwriter',
        properties: {
          containerId: 'writers',
          memberFilepaths: ['app/packages/cli/src/writers/contextLevelWriter.ts'],
        },
      },
    ];
    const fileLevelNodes: SystemNode[] = [
      {
        entityRef: 'blueprint/app/cli/analysis/domain/analyzer',
        type: 'background-worker',
        name: 'Analyzer',
        properties: { filepath: 'app/packages/cli/src/analysis/domain/analyzer.ts' },
      },
      {
        entityRef: 'blueprint/app/cli/analysis/domain/model-extractor',
        type: 'background-worker',
        name: 'Model Extractor',
        properties: { filepath: 'app/packages/cli/src/analysis/domain/modelExtractor.ts' },
      },
      {
        entityRef: 'blueprint/app/cli/writers/contextlevelwriter/context-level-writer',
        type: 'background-worker',
        name: 'Context Level Writer',
        properties: { filepath: 'app/packages/cli/src/writers/contextLevelWriter.ts' },
      },
    ];
    const fileLevelDependencies: SystemDependency[] = [
      {
        from: 'blueprint/app/cli/analysis/domain/analyzer',
        to: 'blueprint/app/cli/writers/contextlevelwriter/context-level-writer',
        type: 'direct-call',
      },
    ];

    const schemas = buildRollupDrillDownSchemas(
      'blueprint/app/cli/analysis',
      analysisRollups,
      fileLevelNodes,
      fileLevelDependencies,
      undefined,
      [...analysisRollups, ...writerRollups]
    );

    const domain = schemas.find(
      entry => entry.schema.entityRef === 'blueprint/app/cli/analysis/domain'
    );
    expect(domain).toBeDefined();
    expect(schemas).toHaveLength(1);
    expect(domain?.schema.dependencies).toEqual([
      {
        from: 'blueprint/app/cli/analysis/domain/analyzer',
        to: 'blueprint/app/cli/writers/contextlevelwriter',
        type: 'direct-call',
      },
    ]);
  });
});
