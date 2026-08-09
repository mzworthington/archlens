import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';
import {
  buildExternalSummaryHubNodes,
  resolveOverviewExternalBands,
  resolveVisibleExternalEntityRefs,
  shouldUseExternalSummaryMode,
  type ExternalSummaryDisplayInput,
} from './externalSummaryDisplay';

function node(
  id: string,
  opts: { external?: boolean; type?: BlueprintRFNode['data']['type'] } = {}
): BlueprintRFNode {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {
      id,
      type: opts.type ?? 'component',
      name: id,
      entityRef: id,
      properties: {},
      ...(opts.external ? { external: true } : {}),
    },
    type: 'blueprintNode',
  };
}

function edge(source: string, target: string): BlueprintRFEdge {
  return {
    id: `edge-${source}-${target}`,
    source,
    target,
    data: { type: 'direct-call', description: '' },
  };
}

function contextSchema(): SystemSchema {
  return {
    name: 'Golden Journey',
    version: '1.0.0',
    level: 'context',
    nodes: [
      { entityRef: 'journey/shopper', type: 'person', name: 'Shopper' },
      { entityRef: 'journey', type: 'software-system', name: 'Golden Journey' },
      {
        entityRef: 'journey/payment',
        type: 'gateway-api',
        name: 'Payment Gateway',
        external: true,
      },
    ],
    dependencies: [
      { from: 'journey/shopper', to: 'journey', type: 'direct-call' },
      { from: 'journey', to: 'journey/payment', type: 'direct-call' },
    ],
  };
}

function summaryInput(partial: Partial<ExternalSummaryDisplayInput>): ExternalSummaryDisplayInput {
  const schema = partial.schema ?? contextSchema();
  const nodes = partial.nodes ?? [
    node('journey/shopper', { type: 'person' }),
    node('journey', { type: 'software-system' }),
    node('journey/payment', { external: true, type: 'gateway-api' }),
  ];
  const edges = partial.edges ?? [
    edge('journey/shopper', 'journey'),
    edge('journey', 'journey/payment'),
  ];
  return {
    nodes,
    edges,
    schema,
    loadedSystems: [{ path: 'context.yaml', name: schema.name, schema }],
    selectedNodeId: null,
    showCallers: true,
    showTargets: true,
    expandedBand: null,
    showCoupling: false,
    isResilienceMode: false,
    ...partial,
  };
}

describe('externalSummaryDisplay - C4 context level', () => {
  it('does not use external summary collapse on context diagrams', () => {
    expect(
      shouldUseExternalSummaryMode({
        selectedNodeId: null,
        expandedBand: null,
        showCoupling: false,
        isResilienceMode: false,
        level: 'context',
      })
    ).toBe(false);

    expect(
      shouldUseExternalSummaryMode({
        selectedNodeId: null,
        expandedBand: null,
        showCoupling: false,
        isResilienceMode: false,
        level: 'container',
      })
    ).toBe(true);
  });

  it('keeps on-diagram external dependencies visible at context (no whitelist)', () => {
    const visible = resolveVisibleExternalEntityRefs(summaryInput({}));
    expect(visible).toBeNull();
  });

  it('keeps context externals visible even when caller/target toggles are off', () => {
    const visible = resolveVisibleExternalEntityRefs(
      summaryInput({ showCallers: false, showTargets: false })
    );
    expect(visible).toBeNull();
  });

  it('does not build summary hubs on context diagrams', () => {
    const input = summaryInput({});
    const bands = resolveOverviewExternalBands(input.schema, input.loadedSystems);
    expect(buildExternalSummaryHubNodes(input, bands)).toEqual([]);
  });
});

describe('externalSummaryDisplay - external-only container diagrams', () => {
  function cloudflareOnlySchema(): SystemSchema {
    return {
      name: 'Cloudflare Infrastructure',
      version: '1.0.0',
      level: 'container',
      entityRef: 'archlens/cloudflare',
      nodes: [
        {
          entityRef: 'archlens/cloudflare/cloudflare-pages',
          type: 'gateway-api',
          name: 'Cloudflare Pages',
          external: true,
          parentEntityRef: 'archlens/cloudflare',
        },
        {
          entityRef: 'archlens/cloudflare/cloudflare-r2',
          type: 'rest-api',
          name: 'Cloudflare R2',
          external: true,
          parentEntityRef: 'archlens/cloudflare',
        },
      ],
      dependencies: [],
    };
  }

  it('does not collapse externals when the diagram has no internal nodes', () => {
    const schema = cloudflareOnlySchema();
    const nodes = [
      node('archlens/cloudflare/cloudflare-pages', { external: true, type: 'gateway-api' }),
      node('archlens/cloudflare/cloudflare-r2', { external: true, type: 'rest-api' }),
    ];

    expect(
      shouldUseExternalSummaryMode({
        selectedNodeId: null,
        expandedBand: null,
        showCoupling: false,
        isResilienceMode: false,
        level: 'container',
        schema,
        nodes,
      })
    ).toBe(false);

    expect(
      resolveVisibleExternalEntityRefs(
        summaryInput({
          schema,
          nodes,
          edges: [],
          loadedSystems: [{ path: 'cloudflare/containers.yaml', name: schema.name, schema }],
        })
      )
    ).toBeNull();
  });

  it('does not build empty summary hubs for external-only diagrams', () => {
    const schema = cloudflareOnlySchema();
    const input = summaryInput({
      schema,
      nodes: [
        node('archlens/cloudflare/cloudflare-pages', { external: true, type: 'gateway-api' }),
        node('archlens/cloudflare/cloudflare-r2', { external: true, type: 'rest-api' }),
      ],
      edges: [],
      loadedSystems: [{ path: 'cloudflare/containers.yaml', name: schema.name, schema }],
    });
    const bands = resolveOverviewExternalBands(input.schema, input.loadedSystems);
    expect(buildExternalSummaryHubNodes(input, bands)).toEqual([]);
  });
});
