import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseSchemaFromYaml } from '../rules/graph';
import {
  chaosSpecDocumentToRuntime,
  parseChaosSpecFromYaml,
  validateChaosSpecForDiagram,
} from './chaosSpecDocument';
import { runResilienceSimulation } from './simulation';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const CHAOS_SPECS_DIR = path.join(REPO_ROOT, 'chaos-specs');
const STRESS_DIR = path.join(REPO_ROOT, 'blueprints/chaoslens-stress');
const GOLDEN_JOURNEY_DIR = path.join(REPO_ROOT, 'blueprints/golden-journey');

function loadStressDiagram(diagramRef: string) {
  const searchDirs = [STRESS_DIR, GOLDEN_JOURNEY_DIR];
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs
      .readdirSync(dir)
      .filter(name => name.endsWith('.yaml'))
      .sort();
    for (const file of files) {
      const schema = parseSchemaFromYaml(fs.readFileSync(path.join(dir, file), 'utf8'));
      const ref = schema.entityRef?.trim() || schema.name;
      if (ref === diagramRef) {
        return { file, schema };
      }
    }
  }
  throw new Error(`No stress fixture found for diagramRef ${diagramRef}`);
}

describe('chaos-specs fixtures', () => {
  const specFiles = fs
    .readdirSync(CHAOS_SPECS_DIR)
    .filter(name => name.endsWith('.yaml') || name.endsWith('.yml'))
    .sort();

  it('loads every ChaosSpec YAML in chaos-specs/', () => {
    expect(specFiles.length).toBeGreaterThanOrEqual(10);
    for (const file of specFiles) {
      const raw = fs.readFileSync(path.join(CHAOS_SPECS_DIR, file), 'utf8');
      expect(() => parseChaosSpecFromYaml(raw)).not.toThrow();
    }
  });

  it.each(specFiles)('%s validates and simulates against its target diagram', file => {
    const document = parseChaosSpecFromYaml(
      fs.readFileSync(path.join(CHAOS_SPECS_DIR, file), 'utf8')
    );
    const { schema } = loadStressDiagram(document.metadata.diagramRef);
    const validationError = validateChaosSpecForDiagram(
      document,
      schema,
      document.metadata.diagramRef
    );
    expect(validationError).toBeNull();

    const { spec } = chaosSpecDocumentToRuntime(document);
    const result = runResilienceSimulation(schema, spec);
    expect(result.faultNodeIds.length).toBeGreaterThan(0);
    expect(Number.isFinite(result.overallSla)).toBe(true);
  });
});
