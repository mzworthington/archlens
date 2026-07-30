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
const ECOMMERCE_BLUEPRINT = path.join(
  REPO_ROOT,
  'blueprints/chaoslens-stress/ecommerce-containers.yaml'
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
        'Game-day scenario with two simultaneous faults — payment region outage plus database error rate — to exercise merged blast radius through the API gateway safeguards.',
      diagramRef: 'blueprint/chaoslens-stress/ecommerce',
    });
    expect(doc.faults).toEqual([
      {
        nodeId: 'blueprint/chaoslens-stress/ecommerce/payment',
        faultType: 'region-outage',
      },
      {
        nodeId: 'blueprint/chaoslens-stress/ecommerce/db',
        faultType: 'error-rate',
        severity: 0.6,
      },
    ]);
    expect(doc.safeguards).toEqual({
      'blueprint/chaoslens-stress/ecommerce/api': {
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
    expect(result.entryPointSlas['blueprint/chaoslens-stress/ecommerce/web']).toBe(100);
    expect(result.heat.get('blueprint/chaoslens-stress/ecommerce/payment')).toBeGreaterThan(0);
    expect(result.heat.get('blueprint/chaoslens-stress/ecommerce/db')).toBeGreaterThan(0);
    expect(result.propagationStoppedAt).toContain('blueprint/chaoslens-stress/ecommerce/api');
  });

  it('rejects invalid fault types', () => {
    expect(() =>
      parseChaosSpecFromYaml(`
version: https://archlens.dev/schemas/v1/chaos.schema.json
metadata:
  name: Bad fault
  diagramRef: blueprint/shop
faults:
  - nodeId: blueprint/shop/api
    faultType: database-fire
`)
    ).toThrow(/region-outage/i);
  });

  it('validates diagramRef against the active diagram', () => {
    const yaml = fs.readFileSync(PAYMENT_OUTAGE_SPEC, 'utf8');
    const doc = parseChaosSpecFromYaml(yaml);
    const blueprintYaml = fs.readFileSync(ECOMMERCE_BLUEPRINT, 'utf8');
    const schema = parseSchemaFromYaml(blueprintYaml);

    expect(
      validateChaosSpecForDiagram(doc, schema, 'blueprint/chaoslens-stress/wrong-diagram')
    ).toMatch(/active diagram/i);
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
      diagramRef: 'blueprint/shop',
      name: 'Shop outage',
      faults: [
        { nodeId: 'blueprint/shop/payment', faultType: 'region-outage', severity: 1 },
        { nodeId: 'blueprint/shop/db', faultType: 'error-rate', severity: 0.6 },
      ],
      safeguards: {
        'blueprint/shop/api': { circuitBreaker: true, localCache: true },
      },
      monteCarlo: { iterations: 1000, seed: 42, severityJitter: 0.15 },
    });

    const yaml = serializeChaosSpecToYaml(doc);
    const parsed = parseChaosSpecFromYaml(yaml);

    expect(parsed.metadata.name).toBe('Shop outage');
    expect(parsed.faults).toEqual([
      { nodeId: 'blueprint/shop/payment', faultType: 'region-outage' },
      { nodeId: 'blueprint/shop/db', faultType: 'error-rate', severity: 0.6 },
    ]);
    expect(parsed.safeguards).toEqual({
      'blueprint/shop/api': { circuitBreaker: true, localCache: true },
    });
  });

  it('rejects building a document with no faults', () => {
    expect(() =>
      buildChaosSpecDocument({
        diagramRef: 'blueprint/shop',
        name: 'Empty',
        faults: [],
      })
    ).toThrow(/no faults/i);
  });
});
