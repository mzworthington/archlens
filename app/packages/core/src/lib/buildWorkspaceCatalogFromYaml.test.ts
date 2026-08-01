import { describe, expect, it, vi } from 'vitest';
import {
  buildWorkspaceCatalogFromYamlFiles,
  parseWorkspaceCatalogJson,
} from './buildWorkspaceCatalogFromYaml';

const v4 = 'https://archlens.dev/schemas/v4/blueprint.schema.json';

describe('buildWorkspaceCatalogFromYamlFiles', () => {
  it('parses YAML, resolves refs, and emits navigation catalog entries', () => {
    const catalog = buildWorkspaceCatalogFromYamlFiles(
      [
        {
          path: 'golden-journey/context.yaml',
          content: `
version: ${v4}
level: context
metadata:
  entityRef: golden-paths
  name: Golden Paths
nodes:
  - entityRef: golden-paths/golden-journey
    type: software-system
    name: Golden Journey
dependencies: []
`,
        },
        {
          path: 'golden-journey/containers.yaml',
          content: `
version: ${v4}
level: container
metadata:
  entityRef: golden-paths/golden-journey
  name: Golden Journey Estate
nodes:
  - entityRef: golden-paths/golden-journey/web
    type: web-app
    name: Web
dependencies: []
`,
        },
        {
          path: 'broken.yaml',
          content: 'not: valid: yaml: [',
        },
      ],
      'blueprints'
    );

    expect(catalog.map(e => e.path).sort()).toEqual([
      'golden-journey/containers.yaml',
      'golden-journey/context.yaml',
    ]);
    const containers = catalog.find(e => e.path === 'golden-journey/containers.yaml');
    expect(containers?.entityRef).toBe('golden-paths/golden-journey');
    expect(containers?.parentEntityRef).toBe('golden-paths');
    expect(containers?.nodeEntityRefs).toContain('golden-paths/golden-journey/web');
  });

  it('reports skipped invalid files via onInvalid', () => {
    const onInvalid = vi.fn();
    buildWorkspaceCatalogFromYamlFiles(
      [
        {
          path: 'ok.yaml',
          content: `
version: ${v4}
level: context
metadata:
  entityRef: root
  name: Root
nodes: []
dependencies: []
`,
        },
        { path: 'bad.yaml', content: '???\n' },
      ],
      'blueprints',
      { onInvalid }
    );
    expect(onInvalid).toHaveBeenCalledWith('bad.yaml', expect.anything());
  });

  it('throws when no valid schemas remain', () => {
    expect(() =>
      buildWorkspaceCatalogFromYamlFiles([{ path: 'bad.yaml', content: 'not yaml {' }])
    ).toThrow(/no valid blueprint/i);
  });
});

describe('parseWorkspaceCatalogJson', () => {
  it('accepts a valid catalog payload', () => {
    const catalog = parseWorkspaceCatalogJson([
      {
        path: 'a.yaml',
        name: 'A',
        level: 'context',
        entityRef: 'a',
        nodeEntityRefs: ['a/b'],
      },
    ]);
    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.parentEntityRef).toBeUndefined();
  });

  it('rejects empty or malformed payloads', () => {
    expect(() => parseWorkspaceCatalogJson([])).toThrow(/empty or invalid/i);
    expect(() => parseWorkspaceCatalogJson({ path: 'x' })).toThrow(/empty or invalid/i);
    expect(() =>
      parseWorkspaceCatalogJson([{ path: 'a.yaml', name: 'A', level: 'context' }])
    ).toThrow(/invalid catalog entry/i);
  });
});
