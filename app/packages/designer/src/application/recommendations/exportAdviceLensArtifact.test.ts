import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import { ADVICELENS_ARTIFACT_KIND } from '@archlens/core/recommendations';
import { buildEstateRecommendations } from './buildEstateRecommendations';
import {
  ADVICELENS_EXPORT_FILENAME,
  buildAdviceLensExportArtifact,
  buildAdviceLensExportJson,
} from './exportAdviceLensArtifact';

function stressSchema(): SystemSchema {
  return {
    name: 'Shop containers',
    version: '1.0.0',
    level: 'container',
    entityRef: 'shop',
    nodes: [
      { entityRef: 'shop/api', name: 'API', type: 'rest-api' },
      { entityRef: 'shop/orders', name: 'Orders', type: 'background-worker' },
      { entityRef: 'shop/payments', name: 'Payments', type: 'background-worker' },
      { entityRef: 'shop/inventory', name: 'Inventory', type: 'database' },
    ],
    dependencies: [
      { from: 'shop/api', to: 'shop/orders', type: 'direct-call' },
      { from: 'shop/api', to: 'shop/payments', type: 'direct-call' },
      { from: 'shop/orders', to: 'shop/inventory', type: 'direct-call' },
      { from: 'shop/payments', to: 'shop/inventory', type: 'direct-call' },
    ],
  };
}

describe('exportAdviceLensArtifact', () => {
  it('builds the same versioned JSON artifact shape as the CLI', () => {
    const report = buildEstateRecommendations([
      {
        path: 'shop-containers.yaml',
        name: 'Shop containers',
        schema: stressSchema(),
      },
    ]);

    const artifact = buildAdviceLensExportArtifact(report);
    expect(artifact.kind).toBe(ADVICELENS_ARTIFACT_KIND);
    expect(artifact.version).toBe(1);
    expect(artifact.diagrams.length).toBe(1);
    expect(artifact.recommendations.length).toBe(report.recommendations.length);
    expect(artifact.recommendations[0]).not.toHaveProperty('diagramPath');
    expect(artifact.recommendations[0]).not.toHaveProperty('diagramName');

    const parsed = JSON.parse(buildAdviceLensExportJson(report)) as typeof artifact;
    expect(parsed.kind).toBe(ADVICELENS_ARTIFACT_KIND);
    expect(Object.keys(parsed.diagrams[0]!.simulation.heat).length).toBeGreaterThan(0);
    expect(ADVICELENS_EXPORT_FILENAME).toBe('advicelens-report.json');
  });
});
