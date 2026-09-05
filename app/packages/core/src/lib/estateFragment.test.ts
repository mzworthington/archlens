import { describe, expect, it } from 'vitest';
import { parseSchemaFromYaml } from '../rules/graph';
import {
  composeEstateFragments,
  defaultFragmentKey,
  estateFragmentManifestKey,
  estateFragmentObjectKey,
  isContextYamlPath,
  parseEstateFragmentManifest,
  sanitizeFragmentKeySegment,
  selectLatestFragmentManifestsByKey,
  selectLatestFragmentsByKey,
  serializeEstateFragmentManifest,
  type EstateFragment,
} from './estateFragment';

function fragment(
  partial: Omit<EstateFragment, 'version' | 'objectPaths'> & { objectPaths?: string[] }
): EstateFragment {
  const objects = partial.objects;
  return {
    version: 1,
    estateId: partial.estateId,
    productId: partial.productId,
    ...(partial.systemId ? { systemId: partial.systemId } : {}),
    fragmentKey: partial.fragmentKey,
    sourceRef: partial.sourceRef,
    runId: partial.runId,
    publishedAt: partial.publishedAt,
    objectPaths: partial.objectPaths ?? objects.map(o => o.path),
    objects,
  };
}

const CONTEXT_A = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: estate
  name: Estate
nodes:
  - entityRef: estate/payments
    type: software-system
    name: Payments
dependencies: []
`;

const CONTEXT_B = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: estate
  name: Estate
nodes:
  - entityRef: estate/checkout
    type: software-system
    name: Checkout
  - entityRef: estate/payments
    type: software-system
    name: Payments Platform
dependencies:
  - from: estate/checkout
    to: estate/payments
    type: direct-call
`;

describe('Feature: estate fragment keys and paths', () => {
  it('sanitizes fragment key segments and builds storage keys', () => {
    expect(sanitizeFragmentKeySegment('Acme Payments!')).toBe('Acme-Payments');
    expect(defaultFragmentKey('payments', 'api')).toBe('payments--api');
    expect(estateFragmentManifestKey('payments', 'run-1')).toBe(
      'fragments/payments/run-1/manifest.json'
    );
    expect(estateFragmentObjectKey('payments', 'run-1', 'systems/api.yaml')).toBe(
      'fragments/payments/run-1/files/systems/api.yaml'
    );
  });

  it('detects context.yaml paths for entityRef merge', () => {
    expect(isContextYamlPath('context.yaml')).toBe(true);
    expect(isContextYamlPath('product/context.yaml')).toBe(true);
    expect(isContextYamlPath('systems/api.yaml')).toBe(false);
  });

  it('round-trips fragment manifests', () => {
    const manifest = parseEstateFragmentManifest(
      JSON.parse(
        serializeEstateFragmentManifest({
          version: 1,
          estateId: 'archlens',
          productId: 'cli',
          fragmentKey: 'cli',
          sourceRef: 'github.com/org/repo@abc',
          runId: '2026-08-04T12-00-00Z',
          publishedAt: '2026-08-04T12:00:00.000Z',
          objectPaths: ['context.yaml', 'systems/cli.yaml'],
        })
      )
    );
    expect(manifest.productId).toBe('cli');
    expect(manifest.objectPaths).toEqual(['context.yaml', 'systems/cli.yaml']);
  });
});

describe('Feature: compose estate fragments into one YAML tree', () => {
  it('Scenario: keeps the freshest run per fragmentKey', () => {
    const selected = selectLatestFragmentsByKey([
      fragment({
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'old',
        runId: 'run-a',
        publishedAt: '2026-01-01T00:00:00.000Z',
        objects: [{ path: 'systems/payments.yaml', content: 'old' }],
      }),
      fragment({
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'new',
        runId: 'run-b',
        publishedAt: '2026-02-01T00:00:00.000Z',
        objects: [{ path: 'systems/payments.yaml', content: 'new' }],
      }),
    ]);

    expect(selected).toHaveLength(1);
    expect(selected[0]?.runId).toBe('run-b');
    expect(selected[0]?.objects[0]?.content).toBe('new');
  });

  it('Scenario: selects freshest manifests without needing object bodies', () => {
    const selected = selectLatestFragmentManifestsByKey([
      {
        version: 1,
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'old',
        runId: 'run-a',
        publishedAt: '2026-01-01T00:00:00.000Z',
        objectPaths: ['systems/payments.yaml'],
      },
      {
        version: 1,
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'new',
        runId: 'run-b',
        publishedAt: '2026-02-01T00:00:00.000Z',
        objectPaths: ['systems/payments.yaml'],
      },
    ]);

    expect(selected).toHaveLength(1);
    expect(selected[0]?.runId).toBe('run-b');
  });

  it('Scenario: later fragment wins for non-context paths', () => {
    const composed = composeEstateFragments([
      fragment({
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'a',
        runId: 'r1',
        publishedAt: '2026-01-01T00:00:00.000Z',
        objects: [{ path: 'systems/shared.yaml', content: 'from-payments' }],
      }),
      fragment({
        estateId: 'acme',
        productId: 'checkout',
        fragmentKey: 'checkout',
        sourceRef: 'b',
        runId: 'r1',
        publishedAt: '2026-02-01T00:00:00.000Z',
        objects: [{ path: 'systems/shared.yaml', content: 'from-checkout' }],
      }),
    ]);

    expect(composed.yamlObjects).toEqual([
      { path: 'systems/shared.yaml', content: 'from-checkout' },
    ]);
    expect(composed.contributors.map(c => c.fragmentKey)).toEqual(['payments', 'checkout']);
  });

  it('Scenario: merges context.yaml by entityRef preferring explicit display names', () => {
    const composed = composeEstateFragments([
      fragment({
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'a',
        runId: 'r1',
        publishedAt: '2026-01-01T00:00:00.000Z',
        objects: [{ path: 'context.yaml', content: CONTEXT_A }],
      }),
      fragment({
        estateId: 'acme',
        productId: 'checkout',
        fragmentKey: 'checkout',
        sourceRef: 'b',
        runId: 'r1',
        publishedAt: '2026-02-01T00:00:00.000Z',
        objects: [{ path: 'context.yaml', content: CONTEXT_B }],
      }),
    ]);

    const context = composed.yamlObjects.find(o => o.path === 'context.yaml');
    expect(context).toBeDefined();
    const schema = parseSchemaFromYaml(context!.content);
    expect(schema.nodes.map(n => n.entityRef).sort()).toEqual([
      'estate/checkout',
      'estate/payments',
    ]);
    // Derived "Payments" yields to explicit "Payments Platform".
    expect(schema.nodes.find(n => n.entityRef === 'estate/payments')?.name).toBe(
      'Payments Platform'
    );
    expect(schema.dependencies).toHaveLength(1);
  });

  it('Scenario: keeps the first explicit name when two fragments disagree', () => {
    const first = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: estate
  name: Estate
nodes:
  - entityRef: estate/checkout
    type: software-system
    name: Checkout Service
dependencies: []
`;
    const second = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: estate
  name: Estate
nodes:
  - entityRef: estate/checkout
    type: software-system
    name: Checkout API
dependencies: []
`;
    const composed = composeEstateFragments([
      fragment({
        estateId: 'acme',
        productId: 'a',
        fragmentKey: 'a',
        sourceRef: 'a',
        runId: 'r1',
        publishedAt: '2026-01-01T00:00:00.000Z',
        objects: [{ path: 'context.yaml', content: first }],
      }),
      fragment({
        estateId: 'acme',
        productId: 'b',
        fragmentKey: 'b',
        sourceRef: 'b',
        runId: 'r1',
        publishedAt: '2026-02-01T00:00:00.000Z',
        objects: [{ path: 'context.yaml', content: second }],
      }),
    ]);
    const schema = parseSchemaFromYaml(
      composed.yamlObjects.find(o => o.path === 'context.yaml')!.content
    );
    expect(schema.nodes.find(n => n.entityRef === 'estate/checkout')?.name).toBe(
      'Checkout Service'
    );
  });

  it('rejects empty input and mixed estates', () => {
    expect(() => composeEstateFragments([])).toThrow(/no fragments/);
    expect(() =>
      composeEstateFragments([
        fragment({
          estateId: 'a',
          productId: 'p',
          fragmentKey: 'p',
          sourceRef: 's',
          runId: 'r',
          publishedAt: '2026-01-01T00:00:00.000Z',
          objects: [{ path: 'a.yaml', content: 'x' }],
        }),
        fragment({
          estateId: 'b',
          productId: 'p',
          fragmentKey: 'q',
          sourceRef: 's',
          runId: 'r',
          publishedAt: '2026-01-01T00:00:00.000Z',
          objects: [{ path: 'b.yaml', content: 'y' }],
        }),
      ])
    ).toThrow(/mixed estateId/);
  });
});
