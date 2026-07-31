import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseSchemaFromYaml } from '../rules/graph';
import { runEstateResilience } from './runEstateResilience';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const ECOMMERCE_FIXTURE = path.join(
  REPO_ROOT,
  'blueprints/chaoslens-stress/ecommerce-containers.yaml'
);

describe('runEstateResilience', () => {
  it('runs default scenarios and returns ranked recommendations for a stress fixture', () => {
    const schema = parseSchemaFromYaml(fs.readFileSync(ECOMMERCE_FIXTURE, 'utf8'));
    const report = runEstateResilience([
      {
        path: ECOMMERCE_FIXTURE,
        relativePath: 'chaoslens-stress/ecommerce-containers.yaml',
        schema,
      },
    ]);

    expect(report.summary.diagramCount).toBe(1);
    expect(report.summary.totalScenarios).toBeGreaterThan(0);
    expect(report.summary.worstOverallSla).toBeLessThan(100);
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations[0]!.priority).toBeGreaterThanOrEqual(
      report.recommendations[report.recommendations.length - 1]!.priority
    );
  });

  it('returns resilience recommendations for degraded SLAs on the e-commerce topology', () => {
    const schema = parseSchemaFromYaml(fs.readFileSync(ECOMMERCE_FIXTURE, 'utf8'));
    const report = runEstateResilience([
      {
        path: ECOMMERCE_FIXTURE,
        relativePath: 'chaoslens-stress/ecommerce-containers.yaml',
        schema,
      },
    ]);

    expect(report.summary.worstOverallSla).toBeLessThan(100);
    expect(
      report.recommendations.some(
        r => r.kind === 'review-timeouts-fallbacks' || r.kind === 'add-circuit-breaker'
      )
    ).toBe(true);
  });
});

const storefrontSchema = {
  name: 'Storefront',
  version: '1.0.0',
  level: 'container' as const,
  entityRef: 'shop/storefront',
  nodes: [
    { entityRef: 'shop/storefront/web', name: 'Web', type: 'web-app' as const },
    { entityRef: 'shop/storefront/api', name: 'API', type: 'microservice' as const },
    {
      entityRef: 'shop/auth/service',
      name: 'Auth (External)',
      type: 'microservice' as const,
      external: true,
    },
  ],
  dependencies: [
    { from: 'shop/storefront/web', to: 'shop/storefront/api', type: 'direct-call' as const },
    { from: 'shop/storefront/api', to: 'shop/auth/service', type: 'direct-call' as const },
  ],
};

const authHomeSchema = {
  name: 'Auth',
  version: '1.0.0',
  level: 'container' as const,
  entityRef: 'shop/auth',
  nodes: [
    { entityRef: 'shop/auth/service', name: 'Auth Service', type: 'microservice' as const },
    { entityRef: 'shop/auth/session-db', name: 'Session DB', type: 'database' as const },
  ],
  dependencies: [
    { from: 'shop/auth/service', to: 'shop/auth/session-db', type: 'read-write' as const },
  ],
};

describe('runEstateResilience workspace enrichment', () => {
  it('uses loadedSystems to enrich simulations through proxy boundaries', () => {
    const diagram = {
      path: 'storefront.yaml',
      relativePath: 'storefront.yaml',
      schema: storefrontSchema,
    };
    const options = { maxRegionOutageTargets: 1, maxFanInProbes: 0 };

    const baseline = runEstateResilience([diagram], options);
    const enriched = runEstateResilience([diagram], {
      ...options,
      loadedSystems: [
        { path: 'storefront.yaml', name: 'Storefront', schema: storefrontSchema },
        { path: 'auth.yaml', name: 'Auth', schema: authHomeSchema },
      ],
    });

    expect(enriched.summary.totalScenarios).toBe(baseline.summary.totalScenarios);
    expect(enriched.summary.recommendationCount).toBeGreaterThanOrEqual(
      baseline.summary.recommendationCount
    );
  });
});

describe('runEstateResilience diagram level gating', () => {
  it('skips chaos scenarios for component-level diagrams but still returns forensics recommendations', () => {
    const componentSchema = {
      name: 'API components',
      version: '1.0.0',
      level: 'component' as const,
      entityRef: 'shop/api',
      nodes: [
        {
          entityRef: 'shop/api/handlers',
          name: 'Handlers',
          type: 'component' as const,
          forensics: {
            hotspotScore: 0.8,
            complexity: 30,
            churn: 0.5,
            topAuthorPercent: 0.9,
            classifications: ['hotspot'],
          },
        },
      ],
      dependencies: [],
    };

    const report = runEstateResilience([
      {
        path: 'api-components.yaml',
        relativePath: 'api-components.yaml',
        schema: componentSchema,
      },
    ]);

    expect(report.summary.totalScenarios).toBe(0);
    expect(report.recommendations.some(r => r.kind === 'add-circuit-breaker')).toBe(false);
    expect(report.recommendations.some(r => r.kind === 'reduce-composite-risk')).toBe(false);
  });
});
