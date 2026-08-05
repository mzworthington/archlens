import { describe, expect, it, vi } from 'vitest';
import {
  loadBundledChaosSpecCatalog,
  loadBundledChaosSpecYaml,
  loadWorkspaceChaosSpecs,
  mergeChaosSpecCatalogSources,
} from './bundledChaosSpecCatalog';

describe('bundledChaosSpecCatalog', () => {
  it('loads catalog entries from catalog.json', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        entries: [
          {
            id: 'payment-outage.yaml',
            name: 'Payment outage',
            diagramRef: 'chaoslens-stress/ecommerce',
            faultCount: 2,
          },
        ],
      })
    );
    const entries = await loadBundledChaosSpecCatalog(fetchImpl);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe('payment-outage.yaml');
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('bundled-chaos-specs/catalog.json')
    );
  });

  it('loads a YAML body by id', async () => {
    const fetchImpl = vi.fn(async () => new Response('name: x\n'));
    const yaml = await loadBundledChaosSpecYaml('payment-outage.yaml', fetchImpl);
    expect(yaml).toContain('name: x');
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('bundled-chaos-specs/payment-outage.yaml')
    );
  });

  it('parses workspace chaos-specs paths into catalog entries', async () => {
    const { entries, yamlById } = await loadWorkspaceChaosSpecs({
      selectDirectory: async () => true,
      readFile: async () => '',
      writeFile: async () => true,
      getDirectoryName: () => 'repo',
      hasPermission: async () => true,
      readDirectoryFiles: async () => [
        {
          name: 'chaos-specs/local-outage.yaml',
          content: `
version: https://archlens.dev/schemas/v1/chaos.schema.json
metadata:
  name: Local outage
  diagramRef: shop
faults:
  - nodeId: shop/api
    faultType: region-outage
`,
        },
        {
          name: 'blueprints/shop.yaml',
          content: 'not a chaos spec',
        },
      ],
    });
    expect(entries).toEqual([
      expect.objectContaining({
        id: 'local-outage.yaml',
        name: 'Local outage',
        diagramRef: 'shop',
      }),
    ]);
    expect(yamlById.get('local-outage.yaml')).toContain('Local outage');
  });

  it('lets workspace entries override bundled ids', () => {
    const merged = mergeChaosSpecCatalogSources(
      [
        {
          id: 'a.yaml',
          name: 'Bundled',
          diagramRef: 'shop',
          faultCount: 1,
        },
      ],
      [
        {
          id: 'a.yaml',
          name: 'Workspace',
          diagramRef: 'shop',
          faultCount: 3,
        },
      ]
    );
    expect(merged).toEqual([
      {
        id: 'a.yaml',
        name: 'Workspace',
        diagramRef: 'shop',
        faultCount: 3,
      },
    ]);
  });
});
