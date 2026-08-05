import type { ForensicClassification } from '../models/schema';
import { churnAccelerationRatio, churnAccelerationTone } from '../forensics/churnAcceleration';
import { validateGraph } from './graph';
import type { LoadedBlueprintSchema } from './validateBlueprintWorkspace';

export type ArchitectureHealthFindingKind = 'cycle' | 'hotspot' | 'knowledge-silo' | 'heating';

export type ArchitectureHealthFinding = {
  kind: ArchitectureHealthFindingKind;
  title: string;
  /** What the practitioner should do in the codebase. */
  action: string;
  file?: string;
  entityRef?: string;
  path?: string[];
  evidence?: {
    hotspotScore?: number;
    complexity?: number;
    accelerationRatio?: number;
    churn30?: number;
    churn365?: number;
  };
};

export type ArchitectureHealthSummary = {
  cycles: number;
  hotspots: number;
  knowledgeSilos: number;
  heating: number;
};

export type ArchitectureHealthReport = {
  isHealthy: boolean;
  findings: ArchitectureHealthFinding[];
  summary: ArchitectureHealthSummary;
  filesChecked: number;
};

export type ArchitectureHealthRegression = {
  deteriorated: boolean;
  deltas: ArchitectureHealthSummary;
  newFindings: ArchitectureHealthFinding[];
  resolvedFindings: ArchitectureHealthFinding[];
};

export type AssessArchitectureHealthOptions = {
  /** Minimum churn-acceleration ratio to emit a heating finding (default 2). */
  heatingRatioThreshold?: number;
};

function findingKey(finding: ArchitectureHealthFinding): string {
  return [
    finding.kind,
    finding.entityRef ?? '',
    finding.file ?? '',
    (finding.path ?? []).join('>'),
    finding.title,
  ].join('|');
}

function summarize(findings: ArchitectureHealthFinding[]): ArchitectureHealthSummary {
  return {
    cycles: findings.filter(f => f.kind === 'cycle').length,
    hotspots: findings.filter(f => f.kind === 'hotspot').length,
    knowledgeSilos: findings.filter(f => f.kind === 'knowledge-silo').length,
    heating: findings.filter(f => f.kind === 'heating').length,
  };
}

function hasClassification(
  classifications: ForensicClassification[] | undefined,
  wanted: ForensicClassification
): boolean {
  return Boolean(classifications?.includes(wanted));
}

/**
 * Architecture health for practitioners: cycles + forensics risk with fix actions.
 * Does not emit BlueprintSpec wiring noise (invalid-connection / broken-entity-ref).
 */
export function assessArchitectureHealth(
  files: LoadedBlueprintSchema[],
  options: AssessArchitectureHealthOptions = {}
): ArchitectureHealthReport {
  const heatingThreshold = options.heatingRatioThreshold ?? 2;
  const findings: ArchitectureHealthFinding[] = [];

  for (const file of files) {
    const graph = validateGraph(file.schema);
    for (const issue of graph.issues) {
      if (issue.type !== 'cycle') continue;
      findings.push({
        kind: 'cycle',
        file: file.path,
        title: 'Circular dependency',
        action: 'Break the cycle — extract a shared module or invert one dependency direction.',
        path: issue.path,
      });
    }

    for (const node of file.schema.nodes) {
      const forensics = node.forensics;
      if (!forensics) continue;

      if (hasClassification(forensics.classifications, 'hotspot')) {
        findings.push({
          kind: 'hotspot',
          file: file.path,
          entityRef: node.entityRef,
          title: `Hotspot: ${node.name}`,
          action: 'Split or simplify this module — high complexity combined with frequent change.',
          evidence: {
            hotspotScore: forensics.hotspotScore,
            complexity: forensics.complexity,
          },
        });
      }

      if (hasClassification(forensics.classifications, 'knowledge-silo')) {
        findings.push({
          kind: 'knowledge-silo',
          file: file.path,
          entityRef: node.entityRef,
          title: `Knowledge silo: ${node.name}`,
          action:
            'Share ownership — pair, document boundaries, or reduce complexity so more people can change it safely.',
          evidence: {
            complexity: forensics.complexity,
          },
        });
      }

      const ratio = churnAccelerationRatio(forensics.churn30 ?? 0, forensics.churn365 ?? 0);
      if (ratio != null && ratio >= heatingThreshold && churnAccelerationTone(ratio) !== 'none') {
        findings.push({
          kind: 'heating',
          file: file.path,
          entityRef: node.entityRef,
          title: `Heating: ${node.name}`,
          action:
            'Stabilize change rate — batch related edits, finish the refactor, or pause drive-by churn in this module.',
          evidence: {
            accelerationRatio: ratio,
            churn30: forensics.churn30,
            churn365: forensics.churn365,
          },
        });
      }
    }
  }

  const summary = summarize(findings);
  return {
    isHealthy: findings.length === 0,
    findings,
    summary,
    filesChecked: files.length,
  };
}

/** Compare two health reports — used for last-commit / particular-commit baselines. */
export function compareArchitectureHealth(
  baseline: ArchitectureHealthReport,
  current: ArchitectureHealthReport
): ArchitectureHealthRegression {
  const baselineKeys = new Set(baseline.findings.map(findingKey));
  const currentKeys = new Set(current.findings.map(findingKey));

  const newFindings = current.findings.filter(f => !baselineKeys.has(findingKey(f)));
  const resolvedFindings = baseline.findings.filter(f => !currentKeys.has(findingKey(f)));

  const deltas: ArchitectureHealthSummary = {
    cycles: current.summary.cycles - baseline.summary.cycles,
    hotspots: current.summary.hotspots - baseline.summary.hotspots,
    knowledgeSilos: current.summary.knowledgeSilos - baseline.summary.knowledgeSilos,
    heating: current.summary.heating - baseline.summary.heating,
  };

  const deteriorated =
    deltas.cycles > 0 ||
    deltas.hotspots > 0 ||
    deltas.knowledgeSilos > 0 ||
    deltas.heating > 0 ||
    newFindings.length > 0;

  return {
    deteriorated,
    deltas,
    newFindings,
    resolvedFindings,
  };
}
