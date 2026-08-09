import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { chaosSchemaPublicUrl } from '../models/chaosVersion';
import { parseSchemaFromYaml } from '../rules/graph';
import { runResilienceSimulation } from './simulation';
import {
  buildChaosSpecDocument,
  chaosSpecDocumentToRuntime,
  parseChaosSpecFromYaml,
  serializeChaosSpecToYaml,
  toChaosSpecJsonSchema,
  validateChaosSpecForDiagram,
} from './chaosSpecDocument';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const PAYMENT_OUTAGE_SPEC = path.join(REPO_ROOT, 'chaos-specs/payment-outage.yaml');
const EXTERNAL_SCOPE_AUTH_OUTAGE_SPEC = path.join(
  REPO_ROOT,
  'chaos-specs/external-scope-auth-outage.yaml'
);
const ECOMMERCE_BLUEPRINT = path.join(
  REPO_ROOT,
  'samples/chaoslens-stress/ecommerce-containers.yaml'
);
const EXTERNAL_SCOPE_BLUEPRINT = path.join(
  REPO_ROOT,
  'samples/chaoslens-stress/external-scope-containers.yaml'
);

describe('ChaosSpec document', () => {
  it('publishes JSON Schema with a versioned $id', () => {
    const schema = toChaosSpecJsonSchema();
    expect(schema.$id).toBe(chaosSchemaPublicUrl('v1'));
    expect(schema.properties).toMatchObject({
      version: expect.any(Object),
      metadata: expect.any(Object),
      faults: expect.any(Object),
    });
  });

  it('parses the payment-outage example spec', () => {
    const yaml = fs.readFileSync(PAYMENT_OUTAGE_SPEC, 'utf8');
    const doc = parseChaosSpecFromYaml(yaml);

    expect(doc.metadata).toEqual({
      name: 'Payment and database compound outage',
      description:
        'Game-day scenario with two simultaneous faults - payment region outage plus database error rate - to exercise merged blast radius through the API gateway safeguards.',
      diagramRef: 'chaoslens-stress/ecommerce',
    });
    expect(doc.faults).toEqual([
      {
        nodeId: 'chaoslens-stress/ecommerce/payment',
        faultType: 'region-outage',
      },
      {
        nodeId: 'chaoslens-stress/ecommerce/db',
        faultType: 'error-rate',
        severity: 0.6,
      },
    ]);
    expect(doc.safeguards).toEqual({
      'chaoslens-stress/ecommerce/api': {
        circuitBreaker: true,
        localCache: true,
      },
    });
    expect(doc.monteCarlo).toEqual({
      iterations: 1000,
      severityJitter: 0.15,
      seed: 42,
    });
  });

  it('maps a document to runtime ChaosSpec and Monte Carlo config', () => {
    const yaml = fs.readFileSync(PAYMENT_OUTAGE_SPEC, 'utf8');
    const doc = parseChaosSpecFromYaml(yaml);
    const runtime = chaosSpecDocumentToRuntime(doc);

    expect(runtime.spec).toEqual({
      faults: doc.faults,
      safeguards: doc.safeguards,
    });
    expect(runtime.monteCarlo).toEqual(doc.monteCarlo);
  });

  it('runs simulation against the referenced ecommerce blueprint', () => {
    const specYaml = fs.readFileSync(PAYMENT_OUTAGE_SPEC, 'utf8');
    const blueprintYaml = fs.readFileSync(ECOMMERCE_BLUEPRINT, 'utf8');
    const doc = parseChaosSpecFromYaml(specYaml);
    const schema = parseSchemaFromYaml(blueprintYaml);
    const { spec } = chaosSpecDocumentToRuntime(doc);

    expect(schema.entityRef).toBe(doc.metadata.diagramRef);

    const result = runResilienceSimulation(schema, spec);
    expect(result.overallSla).toBe(100);
    expect(result.entryPointSlas['chaoslens-stress/ecommerce/web']).toBe(100);
    expect(result.heat.get('chaoslens-stress/ecommerce/payment')).toBeGreaterThan(0);
    expect(result.heat.get('chaoslens-stress/ecommerce/db')).toBeGreaterThan(0);
    expect(result.propagationStoppedAt).toContain('chaoslens-stress/ecommerce/api');
  });

  it('rejects invalid fault types', () => {
    expect(() =>
      parseChaosSpecFromYaml(`
version: https://archlens.dev/schemas/v1/chaos.schema.json
metadata:
  name: Bad fault
  diagramRef: application/shop
faults:
  - nodeId: application/shop/api
    faultType: database-fire
`)
    ).toThrow(/region-outage/i);
  });

  it('validates diagramRef against the active diagram', () => {
    const yaml = fs.readFileSync(PAYMENT_OUTAGE_SPEC, 'utf8');
    const doc = parseChaosSpecFromYaml(yaml);
    const blueprintYaml = fs.readFileSync(ECOMMERCE_BLUEPRINT, 'utf8');
    const schema = parseSchemaFromYaml(blueprintYaml);

    expect(validateChaosSpecForDiagram(doc, schema, 'chaoslens-stress/wrong-diagram')).toMatch(
      /active diagram/i
    );
    expect(validateChaosSpecForDiagram(doc, schema, doc.metadata.diagramRef)).toBeNull();
  });

  it('accepts fault targets on dependency endpoints not yet materialized as nodes', () => {
    const doc = parseChaosSpecFromYaml(fs.readFileSync(EXTERNAL_SCOPE_AUTH_OUTAGE_SPEC, 'utf8'));
    const schema = parseSchemaFromYaml(fs.readFileSync(EXTERNAL_SCOPE_BLUEPRINT, 'utf8'));

    expect(validateChaosSpecForDiagram(doc, schema, doc.metadata.diagramRef)).toBeNull();
  });

  it('round-trips the payment-outage example through serialize', () => {
    const yaml = fs.readFileSync(PAYMENT_OUTAGE_SPEC, 'utf8');
    const doc = parseChaosSpecFromYaml(yaml);
    const serialized = serializeChaosSpecToYaml(doc);
    const roundTrip = parseChaosSpecFromYaml(serialized);

    expect(roundTrip).toEqual(doc);
  });

  it('builds and serializes a scenario document', () => {
    const doc = buildChaosSpecDocument({
      diagramRef: 'application/shop',
      name: 'Shop outage',
      faults: [
        { nodeId: 'application/shop/payment', faultType: 'region-outage', severity: 1 },
        { nodeId: 'application/shop/db', faultType: 'error-rate', severity: 0.6 },
      ],
      safeguards: {
        'application/shop/api': { circuitBreaker: true, localCache: true },
      },
      monteCarlo: { iterations: 1000, seed: 42, severityJitter: 0.15 },
    });

    const yaml = serializeChaosSpecToYaml(doc);
    const parsed = parseChaosSpecFromYaml(yaml);

    expect(parsed.metadata.name).toBe('Shop outage');
    expect(parsed.faults).toEqual([
      { nodeId: 'application/shop/payment', faultType: 'region-outage' },
      { nodeId: 'application/shop/db', faultType: 'error-rate', severity: 0.6 },
    ]);
    expect(parsed.safeguards).toEqual({
      'application/shop/api': { circuitBreaker: true, localCache: true },
    });
  });

  it('rejects building a document with no faults', () => {
    expect(() =>
      buildChaosSpecDocument({
        diagramRef: 'application/shop',
        name: 'Empty',
        faults: [],
      })
    ).toThrow(/no faults/i);
  });
});
