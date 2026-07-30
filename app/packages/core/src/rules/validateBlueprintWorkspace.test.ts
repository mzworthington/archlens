import { describe, it, expect } from 'vitest';
import { validateBlueprintWorkspace } from './validateBlueprintWorkspace';
import type { SystemSchema } from '../models/schema';

function loaded(path: string, schema: SystemSchema) {
  return { path, schema };
}

describe('validateBlueprintWorkspace', () => {
  it('passes a valid context + container workspace', () => {
    const result = validateBlueprintWorkspace([
      loaded('context.yaml', {
        name: 'Demo',
        version: '1',
        level: 'context',
        entityRef: 'demo',
        nodes: [{ entityRef: 'demo/app', type: 'software-system', name: 'App' }],
        dependencies: [],
      }),
      loaded('app/containers.yaml', {
        name: 'App',
        version: '1',
        level: 'container',
        entityRef: 'demo/app',
        nodes: [{ entityRef: 'demo/app/api', type: 'rest-api', name: 'API' }],
        dependencies: [],
      }),
    ]);

    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.filesChecked).toBe(2);
  });

  it('reports cycles and invalid connections', () => {
    const schema: SystemSchema = {
      name: 'Broken',
      version: '1',
      level: 'container',
      nodes: [
        { entityRef: 'demo/a', type: 'rest-api', name: 'A' },
        { entityRef: 'demo/b', type: 'rest-api', name: 'B' },
      ],
      dependencies: [
        { from: 'demo/a', to: 'demo/b', type: 'direct-call' },
        { from: 'demo/b', to: 'demo/a', type: 'direct-call' },
      ],
    };

    const result = validateBlueprintWorkspace([loaded('containers.yaml', schema)]);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(issue => issue.type === 'cycle')).toBe(true);
  });

  it('reports broken parentEntityRef links', () => {
    const result = validateBlueprintWorkspace([
      loaded('context.yaml', {
        name: 'Demo',
        version: '1',
        level: 'context',
        nodes: [
          {
            entityRef: 'demo/app',
            type: 'software-system',
            name: 'App',
            parentEntityRef: 'demo/missing-hub',
          },
        ],
        dependencies: [],
      }),
    ]);

    expect(result.isValid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'broken-entity-ref',
          message: expect.stringContaining('parentEntityRef'),
        }),
      ])
    );
  });

  it('reports broken child diagram linkage', () => {
    const result = validateBlueprintWorkspace([
      loaded('context.yaml', {
        name: 'Demo',
        version: '1',
        level: 'context',
        entityRef: 'demo',
        nodes: [{ entityRef: 'demo/other', type: 'software-system', name: 'Other' }],
        dependencies: [],
      }),
      loaded('app/containers.yaml', {
        name: 'App',
        version: '1',
        level: 'container',
        entityRef: 'demo/app',
        nodes: [{ entityRef: 'demo/app/api', type: 'rest-api', name: 'API' }],
        dependencies: [],
      }),
    ]);

    expect(result.isValid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'broken-entity-ref',
          message: expect.stringContaining('not represented as a node on parent diagram'),
        }),
      ])
    );
  });
});
