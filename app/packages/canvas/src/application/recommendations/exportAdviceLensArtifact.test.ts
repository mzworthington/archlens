import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import { ADVICELENS_ARTIFACT_KIND } from '@archlens/core/recommendations';
import { buildEstateRecommendations } from './buildEstateRecommendations';
import {
  ADVICELENS_EXPORT_FILENAME,
  ADVICELENS_EXPORT_JSON_FILENAME,
  adviceLensExportFilename,
  buildAdviceLensExportArtifact,
  buildAdviceLensExportText,
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
  it('defaults studio export to YAML with the shared artifact shape', () => {
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

    const yamlText = buildAdviceLensExportText(report);
    expect(yamlText).toContain('kind: advicelens-estate-report');
    expect(yamlText).toContain('version: 1');
    expect(adviceLensExportFilename()).toBe(ADVICELENS_EXPORT_FILENAME);
    expect(adviceLensExportFilename('json')).toBe(ADVICELENS_EXPORT_JSON_FILENAME);

    const jsonText = buildAdviceLensExportText(report, 'json');
    expect(JSON.parse(jsonText).kind).toBe(ADVICELENS_ARTIFACT_KIND);
  });
});
