import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseSchemaFromYaml } from '../rules/graph';
import {
  ADVICELENS_ARTIFACT_KIND,
  ADVICELENS_ARTIFACT_VERSION,
  buildAdviceLensArtifact,
  evaluateAdviceLensGate,
  formatAdviceLensArtifact,
  formatAdviceLensArtifactJson,
  formatAdviceLensArtifactYaml,
  serializeEstateResilienceReport,
} from './adviceLensArtifact';
import { runEstateResilience } from './runEstateResilience';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const ECOMMERCE_FIXTURE = path.join(
  REPO_ROOT,
  'blueprints/chaoslens-stress/ecommerce-containers.yaml'
);

function loadEcommerceReport() {
  const schema = parseSchemaFromYaml(fs.readFileSync(ECOMMERCE_FIXTURE, 'utf8'));
  return runEstateResilience([
    {
      path: ECOMMERCE_FIXTURE,
      relativePath: 'chaoslens-stress/ecommerce-containers.yaml',
      schema,
    },
  ]);
}

describe('serializeEstateResilienceReport', () => {
  it('emits a versioned AdviceLens artifact with JSON-safe heat maps', () => {
    const report = loadEcommerceReport();
    const artifact = serializeEstateResilienceReport(report);

    expect(artifact.kind).toBe(ADVICELENS_ARTIFACT_KIND);
    expect(artifact.version).toBe(ADVICELENS_ARTIFACT_VERSION);
    expect(artifact.summary).toEqual(report.summary);
    expect(artifact.recommendations).toEqual(report.recommendations);
    expect(artifact.diagrams).toHaveLength(1);

    const diagram = artifact.diagrams[0]!;
    expect(diagram.diagramRef).toBe('chaoslens-stress/ecommerce');
    expect(diagram.simulation.heat).not.toBeInstanceOf(Map);
    expect(Object.keys(diagram.simulation.heat).length).toBeGreaterThan(0);
    expect(diagram.simulation.heatHops).not.toBeInstanceOf(Map);
    expect(diagram.simulation.integrityHeat).not.toBeInstanceOf(Map);

    const parsed = JSON.parse(formatAdviceLensArtifactJson(artifact)) as typeof artifact;
    expect(parsed.kind).toBe(ADVICELENS_ARTIFACT_KIND);
    expect(parsed.diagrams[0]!.simulation.heat).toEqual(diagram.simulation.heat);
    expect(Object.keys(parsed.diagrams[0]!.simulation.heat).length).toBeGreaterThan(0);
  });

  it('buildAdviceLensArtifact accepts recommendation-only UI exports', () => {
    const report = loadEcommerceReport();
    const artifact = buildAdviceLensArtifact({
      summary: report.summary,
      recommendations: report.recommendations,
    });

    expect(artifact.diagrams).toEqual([]);
    expect(artifact.recommendations.length).toBe(report.recommendations.length);
  });

  it('formats the artifact as YAML for studio / human-readable export', () => {
    const report = loadEcommerceReport();
    const artifact = serializeEstateResilienceReport(report);
    const yamlText = formatAdviceLensArtifactYaml(artifact);

    expect(yamlText).toContain('kind: advicelens-estate-report');
    expect(yamlText).toContain('version: 1');
    expect(yamlText).toContain('summary:');
    expect(formatAdviceLensArtifact(artifact, 'yaml')).toBe(yamlText);
    expect(formatAdviceLensArtifact(artifact, 'json')).toBe(formatAdviceLensArtifactJson(artifact));
  });
});

describe('evaluateAdviceLensGate', () => {
  const summary = {
    diagramCount: 1,
    totalScenarios: 3,
    worstOverallSla: 94,
    totalSpofs: 2,
    recommendationCount: 4,
  };

  it('passes when worst SLA meets the threshold', () => {
    expect(evaluateAdviceLensGate(summary, { minSla: 90 })).toEqual({
      ok: true,
      belowSlaThreshold: false,
      hasRecommendations: true,
      reasons: [],
    });
  });

  it('fails when worst SLA is below the threshold', () => {
    const result = evaluateAdviceLensGate(summary, { minSla: 95 });
    expect(result.ok).toBe(false);
    expect(result.belowSlaThreshold).toBe(true);
    expect(result.reasons[0]).toContain('--min-sla=95');
  });

  it('fails on recommendations only when fail-on-recommendations is set', () => {
    const withoutFlag = evaluateAdviceLensGate(
      { ...summary, worstOverallSla: 100 },
      { minSla: 100 }
    );
    expect(withoutFlag.ok).toBe(true);

    const withFlag = evaluateAdviceLensGate(
      { ...summary, worstOverallSla: 100 },
      { minSla: 100, failOnRecommendations: true }
    );
    expect(withFlag.ok).toBe(false);
    expect(withFlag.hasRecommendations).toBe(true);
    expect(withFlag.reasons[0]).toContain('--fail-on-recommendations');
  });
});
