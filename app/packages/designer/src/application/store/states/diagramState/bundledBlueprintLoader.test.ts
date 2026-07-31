import { describe, expect, it } from 'vitest';
import {
  buildBundledPathCatalog,
  guessBundledPathForEntityRef,
  inferEntityRefFromBundledPath,
} from './bundledBlueprintLoader';

describe('inferEntityRefFromBundledPath', () => {
  it('maps context and system container diagrams', () => {
    expect(inferEntityRefFromBundledPath('application/context.yaml')).toBe('application');
    expect(inferEntityRefFromBundledPath('golden-journey/context.yaml')).toBe('golden-paths');
    expect(inferEntityRefFromBundledPath('app/containers.yaml')).toBe('blueprint/app');
    expect(inferEntityRefFromBundledPath('chaoslens-stress/containers.yaml')).toBe(
      'chaoslens-stress'
    );
  });

  it('maps nested scenario container diagrams', () => {
    expect(inferEntityRefFromBundledPath('chaoslens-stress/ecommerce-containers.yaml')).toBe(
      'chaoslens-stress/ecommerce'
    );
    expect(inferEntityRefFromBundledPath('chaoslens-stress/large-graph-containers.yaml')).toBe(
      'chaoslens-stress/large-graph'
    );
    expect(inferEntityRefFromBundledPath('chaoslens-stress/external-scope-containers.yaml')).toBe(
      'chaoslens-stress/external-scope'
    );
  });

  it('maps nested advicelens-stress scenario paths', () => {
    expect(
      inferEntityRefFromBundledPath('advicelens-stress/composite-risk/payment-components.yaml')
    ).toBe('advicelens-stress/composite-risk/payment');
    expect(inferEntityRefFromBundledPath('advicelens-stress/composite-risk-containers.yaml')).toBe(
      'advicelens-stress/composite-risk'
    );
  });

  it('maps infrastructure sandbox paths to the same entity refs', () => {
    expect(inferEntityRefFromBundledPath('infrastructure/context.yaml')).toBe('infrastructure');
    expect(inferEntityRefFromBundledPath('infrastructure/gcp-py-gke/containers.yaml')).toBe(
      'infrastructure/gcp-py-gke'
    );
    expect(inferEntityRefFromBundledPath('infrastructure/terraform-examples/containers.yaml')).toBe(
      'infrastructure/terraform-examples'
    );
  });

  it('maps golden journey estate and checkout component diagrams', () => {
    expect(inferEntityRefFromBundledPath('golden-journey/containers.yaml')).toBe(
      'golden-paths/golden-journey'
    );
    expect(inferEntityRefFromBundledPath('golden-journey/catalog-platform/containers.yaml')).toBe(
      'golden-paths/golden-journey/catalog-platform'
    );
    expect(
      inferEntityRefFromBundledPath('golden-journey/catalog-platform/catalog-api-components.yaml')
    ).toBe('golden-paths/golden-journey/catalog-platform/catalog-api');
    expect(
      inferEntityRefFromBundledPath('golden-journey/checkout-platform/checkout-api-components.yaml')
    ).toBe('golden-paths/golden-journey/checkout-platform/checkout-api');
    expect(
      inferEntityRefFromBundledPath(
        'golden-journey/billing-platform/billing-worker-components.yaml'
      )
    ).toBe('golden-paths/golden-journey/billing-platform/billing-worker');
    expect(inferEntityRefFromBundledPath('golden-journey/web-components.yaml')).toBe(
      'golden-paths/golden-journey/web'
    );
    expect(inferEntityRefFromBundledPath('golden-journey/mobile-components.yaml')).toBe(
      'golden-paths/golden-journey/mobile'
    );
    expect(
      inferEntityRefFromBundledPath('golden-journey/checkout-platform/order-events-components.yaml')
    ).toBe('golden-paths/golden-journey/checkout-platform/order-events');
  });

  it('maps component diagrams', () => {
    expect(inferEntityRefFromBundledPath('app/designer-components.yaml')).toBe(
      'blueprint/app/designer'
    );
  });
});

describe('buildBundledPathCatalog', () => {
  it('indexes chaoslens-stress scenarios before schemas are loaded', () => {
    const catalog = buildBundledPathCatalog([
      'application/context.yaml',
      'chaoslens-stress/containers.yaml',
      'chaoslens-stress/ecommerce-containers.yaml',
      'chaoslens-stress/large-graph-containers.yaml',
    ]);

    expect(catalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'chaoslens-stress/containers.yaml',
          entityRef: 'chaoslens-stress',
          level: 'container',
        }),
        expect.objectContaining({
          path: 'chaoslens-stress/ecommerce-containers.yaml',
          entityRef: 'chaoslens-stress/ecommerce',
          level: 'container',
        }),
      ])
    );
  });
});

describe('guessBundledPathForEntityRef', () => {
  it('resolves golden journey checkout-api component diagram', () => {
    expect(
      guessBundledPathForEntityRef('golden-paths/golden-journey/checkout-platform/checkout-api')
    ).toBe('golden-journey/checkout-platform/checkout-api-components.yaml');
  });

  it('resolves nested chaoslens-stress scenario paths', () => {
    const paths = [
      'application/context.yaml',
      'chaoslens-stress/containers.yaml',
      'chaoslens-stress/ecommerce-containers.yaml',
    ];

    expect(guessBundledPathForEntityRef('chaoslens-stress/ecommerce')).toBe(
      'chaoslens-stress/ecommerce-containers.yaml'
    );
    expect(
      paths.find(path => inferEntityRefFromBundledPath(path) === 'chaoslens-stress/ecommerce')
    ).toBe('chaoslens-stress/ecommerce-containers.yaml');
  });
});
