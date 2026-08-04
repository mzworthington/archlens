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
  entityRef: samples
  name: Samples
nodes:
  - entityRef: samples/golden-journey
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
  entityRef: samples/golden-journey
  name: Golden Journey Estate
nodes:
  - entityRef: samples/golden-journey/web
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
    expect(containers?.entityRef).toBe('samples/golden-journey');
    expect(containers?.parentEntityRef).toBe('samples');
    expect(containers?.nodeEntityRefs).toContain('samples/golden-journey/web');
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
