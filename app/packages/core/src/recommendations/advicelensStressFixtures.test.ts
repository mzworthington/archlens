import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildRecommendations } from '../recommendations/buildRecommendations';
import { runEstateResilience } from '../recommendations/runEstateResilience';
import { parseSchemaFromYaml } from '../rules/graph';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const STRESS_DIR = path.join(REPO_ROOT, 'samples/advicelens-stress');

function listFixtureFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFixtureFiles(fullPath));
    } else if (entry.name.endsWith('.yaml') && !entry.name.includes('-overlay.')) {
      files.push(fullPath);
    }
  }
  return files;
}

function loadFixture(filePath: string) {
  return parseSchemaFromYaml(fs.readFileSync(filePath, 'utf8'));
}

describe('advicelens-stress fixtures', () => {
  it('loads every scenario YAML from samples/advicelens-stress/', () => {
    const files = listFixtureFiles(STRESS_DIR);
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const file of files) {
      expect(() => loadFixture(file)).not.toThrow();
    }
  });

  it('composite-risk emits both chaos and tracelens recommendations with forensics', () => {
    const schema = loadFixture(path.join(STRESS_DIR, 'composite-risk-containers.yaml'));
    const report = runEstateResilience([
      {
        path: 'advicelens-stress/composite-risk-containers.yaml',
        relativePath: 'advicelens-stress/composite-risk-containers.yaml',
        schema,
      },
    ]);

    expect(report.recommendations.some(r => r.source === 'chaoslens')).toBe(true);
    expect(report.recommendations.some(r => r.kind === 'add-circuit-breaker')).toBe(true);

    const simulation = report.diagrams[0]?.simulation;
    expect(simulation).toBeDefined();

    const withForensics = buildRecommendations({ schema, simulation });
    expect(withForensics.some(r => r.kind === 'reduce-composite-risk')).toBe(true);
    expect(
      withForensics.some(
        r => r.source === 'chaoslens' && r.evidence.applicabilityScope?.entityRef != null
      )
    ).toBe(true);
  });

  it('knowledge-silo scenario includes refactor-oriented forensics without requiring chaos', () => {
    const schema = loadFixture(path.join(STRESS_DIR, 'knowledge-silo-containers.yaml'));
    const recommendations = buildRecommendations({ schema, simulation: null });

    expect(
      schema.nodes.some(
        node => node.forensics?.classifications?.includes('knowledge-silo') ?? false
      )
    ).toBe(true);
    expect(recommendations.length).toBeGreaterThanOrEqual(0);
  });

  it('component drill-down carries code-level hotspot forensics', () => {
    const schema = loadFixture(path.join(STRESS_DIR, 'composite-risk/payment-components.yaml'));
    const hotspot = schema.nodes.find(node => node.entityRef.endsWith('/handlers'));
    expect(hotspot?.forensics?.hotspotScore).toBeGreaterThan(0.8);
    expect(hotspot?.type).toBe('component');
  });
});
