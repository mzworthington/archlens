import { describe, expect, it } from 'vitest';
import { buildChildZoomDiagram } from './childZoom';

describe('buildChildZoomDiagram', () => {
  it('builds an empty child diagram whose identity matches the node', () => {
    const zoom = buildChildZoomDiagram({
      nodeEntityRef: 'billing/api',
      nodeName: 'API',
      parentLevel: 'container',
      version: 'https://archlens.dev/schemas/v4/blueprint.schema.json',
      parentPath: 'blueprints/billing/containers.yaml',
      existingPaths: ['blueprints/billing/containers.yaml'],
    });

    expect(zoom).toEqual({
      path: 'blueprints/billing/api-components.yaml',
      schema: {
        entityRef: 'billing/api',
        name: 'API Components',
        version: 'https://archlens.dev/schemas/v4/blueprint.schema.json',
        level: 'component',
        nodes: [],
        dependencies: [],
      },
    });
  });
});
