import { describe, it, expect } from 'vitest';
import { compareBlueprintTrees } from './compareBlueprintTrees';
import { blueprintTreeDiffHasChanges } from '../schema/schemaDiff';
import type { SystemSchema } from '../../models/schema';

function file(relativePath: string, schema: SystemSchema) {
  return { relativePath, schema };
}

describe('compareBlueprintTrees', () => {
  it('reports added and removed files', () => {
    const baseline = [
      file('context.yaml', {
        name: 'Context',
        version: '1',
        level: 'context',
        nodes: [{ entityRef: 'demo', type: 'software-system', name: 'Demo' }],
        dependencies: [],
      }),
    ];
    const current = [
      file('demo/containers.yaml', {
        name: 'Demo',
        version: '1',
        level: 'container',
        entityRef: 'demo',
        nodes: [{ entityRef: 'demo/api', type: 'rest-api', name: 'API' }],
        dependencies: [],
      }),
    ];

    const treeDiff = compareBlueprintTrees(baseline, current);
    expect(blueprintTreeDiffHasChanges(treeDiff)).toBe(true);
    expect(treeDiff.files.find(f => f.relativePath === 'context.yaml')?.status).toBe('removed');
    expect(treeDiff.files.find(f => f.relativePath === 'demo/containers.yaml')?.status).toBe(
      'added'
    );
  });

  it('reports unchanged files when schemas match', () => {
    const schema: SystemSchema = {
      name: 'Context',
      version: '1',
      level: 'context',
      nodes: [{ entityRef: 'demo', type: 'software-system', name: 'Demo' }],
      dependencies: [],
    };
    const treeDiff = compareBlueprintTrees(
      [file('context.yaml', schema)],
      [file('context.yaml', schema)]
    );
    expect(blueprintTreeDiffHasChanges(treeDiff)).toBe(false);
    expect(treeDiff.files[0]?.status).toBe('unchanged');
  });
});
