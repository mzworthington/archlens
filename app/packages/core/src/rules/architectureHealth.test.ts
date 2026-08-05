import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import {
  assessArchitectureHealth,
  compareArchitectureHealth,
  type ArchitectureHealthReport,
} from './architectureHealth';

function componentSchema(
  entityRef: string,
  nodes: SystemSchema['nodes'],
  dependencies: SystemSchema['dependencies'] = []
): SystemSchema {
  return {
    entityRef,
    name: entityRef,
    version: '1.0.0',
    level: 'component',
    metadata: { description: 'test' },
    nodes,
    dependencies,
  };
}

describe('assessArchitectureHealth', () => {
  it('reports actionable direct-call cycles and ignores wiring-only broken refs', () => {
    const schema = componentSchema(
      'acme/app/billing',
      [
        { entityRef: 'acme/app/billing/a', name: 'A', type: 'component' },
        { entityRef: 'acme/app/billing/b', name: 'B', type: 'component' },
      ],
      [
        { from: 'acme/app/billing/a', to: 'acme/app/billing/b', type: 'direct-call' },
        { from: 'acme/app/billing/b', to: 'acme/app/billing/a', type: 'direct-call' },
        {
          from: 'acme/app/billing/a',
          to: 'acme/app/billing/missing-leaf',
          type: 'direct-call',
        },
      ]
    );

    const report = assessArchitectureHealth([{ path: 'billing-components.yaml', schema }]);

    expect(report.findings.some(f => f.kind === 'cycle' && f.severity === 'actionable')).toBe(true);
    expect(report.findings.find(f => f.kind === 'cycle')?.action).toMatch(/break/i);
    expect(report.isHealthy).toBe(false);
  });

  it('does not fail health for cycles that only close via external proxies', () => {
    const schema = componentSchema(
      'acme/app/analysis',
      [
        { entityRef: 'acme/app/analysis/domain', name: 'Domain', type: 'component' },
        {
          entityRef: 'acme/app/writers/writer',
          name: 'Writer',
          type: 'component',
          external: true,
        },
      ],
      [
        {
          from: 'acme/app/analysis/domain',
          to: 'acme/app/writers/writer',
          type: 'direct-call',
        },
        {
          from: 'acme/app/writers/writer',
          to: 'acme/app/analysis/domain',
          type: 'read-write',
        },
      ]
    );

    const report = assessArchitectureHealth([{ path: 'analysis-components.yaml', schema }]);

    expect(report.isHealthy).toBe(true);
    expect(report.findings).toEqual([]);
    expect(report.informationalFindings).toHaveLength(1);
    expect(report.informationalFindings[0]?.evidence?.cycleReason).toBe('includes-external-proxy');
  });

  it('treats inter-container mutual edges as informational', () => {
    const schema: SystemSchema = {
      entityRef: 'acme/app',
      name: 'App',
      version: '1.0.0',
      level: 'container',
      metadata: { description: 'test' },
      nodes: [
        { entityRef: 'acme/app/analysis', name: 'Analysis', type: 'container' },
        { entityRef: 'acme/app/writers', name: 'Writers', type: 'container' },
      ],
      dependencies: [
        { from: 'acme/app/analysis', to: 'acme/app/writers', type: 'inter-container' },
        { from: 'acme/app/writers', to: 'acme/app/analysis', type: 'inter-container' },
      ],
    };

    const report = assessArchitectureHealth([{ path: 'containers.yaml', schema }]);
    expect(report.isHealthy).toBe(true);
    expect(report.summary.cycles).toBe(0);
    expect(report.summary.informationalCycles).toBe(1);
  });

  it('reports hotspot and knowledge-silo findings with remediation', () => {
    const schema = componentSchema('acme/app/checkout', [
      {
        entityRef: 'acme/app/checkout/cart',
        name: 'Cart',
        type: 'component',
        forensics: {
          hotspotScore: 0.9,
          complexity: 40,
          authorCount: 1,
          topAuthorPercent: 1,
          classifications: ['hotspot', 'knowledge-silo'],
        },
      },
    ]);

    const report = assessArchitectureHealth([{ path: 'checkout-components.yaml', schema }]);
    const kinds = report.findings.map(f => f.kind).sort();

    expect(kinds).toEqual(['hotspot', 'knowledge-silo']);
    expect(report.findings.find(f => f.kind === 'hotspot')?.action).toMatch(/split|reduce/i);
    expect(report.findings.find(f => f.kind === 'knowledge-silo')?.action).toMatch(
      /ownership|share|pair/i
    );
  });

  it('reports heating when short-window churn accelerates', () => {
    const schema = componentSchema('acme/app/payments', [
      {
        entityRef: 'acme/app/payments/gateway',
        name: 'Gateway',
        type: 'component',
        forensics: {
          churn30: 12,
          churn365: 12,
          hotspotScore: 0.1,
          classifications: [],
        },
      },
    ]);

    const report = assessArchitectureHealth([{ path: 'payments-components.yaml', schema }]);
    const heating = report.findings.find(f => f.kind === 'heating');

    expect(heating).toBeDefined();
    expect(heating?.action).toMatch(/stabilize|churn|change/i);
    expect(heating?.evidence?.accelerationRatio).toBeGreaterThanOrEqual(2);
  });

  it('is healthy when there are no actionable cycles or forensics concerns', () => {
    const schema = componentSchema('acme/app/ok', [
      {
        entityRef: 'acme/app/ok/svc',
        name: 'Svc',
        type: 'component',
        forensics: {
          hotspotScore: 0.1,
          complexity: 2,
          authorCount: 3,
          topAuthorPercent: 0.4,
          classifications: [],
        },
      },
    ]);

    const report = assessArchitectureHealth([{ path: 'ok-components.yaml', schema }]);
    expect(report.isHealthy).toBe(true);
    expect(report.findings).toEqual([]);
  });
});

describe('compareArchitectureHealth', () => {
  it('detects deterioration when new actionable cycles and hotspots appear', () => {
    const baseline: ArchitectureHealthReport = {
      isHealthy: true,
      findings: [],
      informationalFindings: [],
      summary: { cycles: 0, informationalCycles: 0, hotspots: 0, knowledgeSilos: 0, heating: 0 },
      filesChecked: 1,
    };
    const current: ArchitectureHealthReport = {
      isHealthy: false,
      findings: [
        {
          kind: 'cycle',
          severity: 'actionable',
          file: 'a.yaml',
          title: 'Circular module dependency',
          action: 'Break the cycle',
          path: ['a', 'b', 'a'],
          evidence: { cycleKey: 'a>b' },
        },
        {
          kind: 'hotspot',
          file: 'a.yaml',
          entityRef: 'acme/a',
          title: 'Hotspot',
          action: 'Split the module',
        },
      ],
      informationalFindings: [],
      summary: { cycles: 1, informationalCycles: 0, hotspots: 1, knowledgeSilos: 0, heating: 0 },
      filesChecked: 1,
    };

    const regression = compareArchitectureHealth(baseline, current);

    expect(regression.deteriorated).toBe(true);
    expect(regression.deltas.cycles).toBe(1);
    expect(regression.deltas.hotspots).toBe(1);
    expect(regression.newFindings).toHaveLength(2);
  });

  it('does not treat new informational cycles as deterioration', () => {
    const baseline: ArchitectureHealthReport = {
      isHealthy: true,
      findings: [],
      informationalFindings: [],
      summary: { cycles: 0, informationalCycles: 0, hotspots: 0, knowledgeSilos: 0, heating: 0 },
      filesChecked: 1,
    };
    const current: ArchitectureHealthReport = {
      isHealthy: true,
      findings: [],
      informationalFindings: [
        {
          kind: 'cycle',
          severity: 'informational',
          title: 'Circular dependency (informational)',
          action: 'Informational',
          path: ['x', 'y', 'x'],
          evidence: { cycleKey: 'x>y', cycleReason: 'non-direct-call-edges' },
        },
      ],
      summary: { cycles: 0, informationalCycles: 1, hotspots: 0, knowledgeSilos: 0, heating: 0 },
      filesChecked: 1,
    };

    const regression = compareArchitectureHealth(baseline, current);
    expect(regression.deteriorated).toBe(false);
    expect(regression.deltas.informationalCycles).toBe(1);
  });

  it('is not deteriorated when debt is unchanged or improved', () => {
    const baseline: ArchitectureHealthReport = {
      isHealthy: false,
      findings: [
        {
          kind: 'hotspot',
          file: 'a.yaml',
          entityRef: 'acme/a',
          title: 'Hotspot',
          action: 'Split',
        },
      ],
      informationalFindings: [],
      summary: { cycles: 0, informationalCycles: 0, hotspots: 1, knowledgeSilos: 0, heating: 0 },
      filesChecked: 1,
    };
    const current: ArchitectureHealthReport = {
      isHealthy: true,
      findings: [],
      informationalFindings: [],
      summary: { cycles: 0, informationalCycles: 0, hotspots: 0, knowledgeSilos: 0, heating: 0 },
      filesChecked: 1,
    };

    const regression = compareArchitectureHealth(baseline, current);
    expect(regression.deteriorated).toBe(false);
    expect(regression.deltas.hotspots).toBe(-1);
    expect(regression.resolvedFindings).toHaveLength(1);
  });
});
