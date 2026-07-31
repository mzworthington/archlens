import { describe, expect, it } from 'vitest';
import {
  buildBundledPathCatalog,
  guessBundledPathForEntityRef,
  inferEntityRefFromBundledPath,
} from './bundledBlueprintLoader';

describe('inferEntityRefFromBundledPath', () => {
  it('maps context and system container diagrams', () => {
    expect(inferEntityRefFromBundledPath('context.yaml')).toBe('blueprint');
    expect(inferEntityRefFromBundledPath('app/containers.yaml')).toBe('blueprint/app');
    expect(inferEntityRefFromBundledPath('chaoslens-stress/containers.yaml')).toBe(
      'blueprint/chaoslens-stress'
    );
  });

  it('maps nested scenario container diagrams', () => {
    expect(inferEntityRefFromBundledPath('chaoslens-stress/ecommerce-containers.yaml')).toBe(
      'blueprint/chaoslens-stress/ecommerce'
    );
    expect(inferEntityRefFromBundledPath('chaoslens-stress/large-graph-containers.yaml')).toBe(
      'blueprint/chaoslens-stress/large-graph'
    );
    expect(inferEntityRefFromBundledPath('chaoslens-stress/external-scope-containers.yaml')).toBe(
      'blueprint/chaoslens-stress/external-scope'
    );
  });

  it('maps nested advicelens-stress scenario paths', () => {
    expect(
      inferEntityRefFromBundledPath('advicelens-stress/composite-risk/payment-components.yaml')
    ).toBe('blueprint/advicelens-stress/composite-risk/payment');
    expect(inferEntityRefFromBundledPath('advicelens-stress/composite-risk-containers.yaml')).toBe(
      'blueprint/advicelens-stress/composite-risk'
    );
  });

  it('maps infrastructure sandbox paths to the same entity refs', () => {
    expect(inferEntityRefFromBundledPath('infrastructure/context.yaml')).toBe('blueprint');
    expect(inferEntityRefFromBundledPath('infrastructure/gcp-py-gke/containers.yaml')).toBe(
      'blueprint/gcp-py-gke'
    );
    expect(inferEntityRefFromBundledPath('infrastructure/terraform-examples/containers.yaml')).toBe(
      'blueprint/terraform-examples'
    );
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
      'context.yaml',
      'chaoslens-stress/containers.yaml',
      'chaoslens-stress/ecommerce-containers.yaml',
      'chaoslens-stress/large-graph-containers.yaml',
    ]);

    expect(catalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'chaoslens-stress/containers.yaml',
          entityRef: 'blueprint/chaoslens-stress',
          level: 'container',
        }),
        expect.objectContaining({
          path: 'chaoslens-stress/ecommerce-containers.yaml',
          entityRef: 'blueprint/chaoslens-stress/ecommerce',
          level: 'container',
        }),
      ])
    );
  });
});

describe('guessBundledPathForEntityRef', () => {
  it('resolves nested chaoslens-stress scenario paths', () => {
    const paths = [
      'context.yaml',
      'chaoslens-stress/containers.yaml',
      'chaoslens-stress/ecommerce-containers.yaml',
    ];

    expect(guessBundledPathForEntityRef('blueprint/chaoslens-stress/ecommerce')).toBe(
      'chaoslens-stress/ecommerce-containers.yaml'
    );
    expect(
      paths.find(
        path => inferEntityRefFromBundledPath(path) === 'blueprint/chaoslens-stress/ecommerce'
      )
    ).toBe('chaoslens-stress/ecommerce-containers.yaml');
  });
});
