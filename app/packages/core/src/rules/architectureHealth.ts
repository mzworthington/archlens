import type { ForensicClassification } from '../models/schema';
import { churnAccelerationRatio, churnAccelerationTone } from '../forensics/churnAcceleration';
import { collectDependencyCycles, type DependencyCycleReason } from './dependencyCycles';
import type { LoadedBlueprintSchema } from './validateBlueprintWorkspace';

export type ArchitectureHealthFindingKind = 'cycle' | 'hotspot' | 'knowledge-silo' | 'heating';

export type ArchitectureHealthFindingSeverity = 'actionable' | 'informational';

export type ArchitectureHealthFinding = {
  kind: ArchitectureHealthFindingKind;
  title: string;
  /** What the practitioner should do in the codebase (actionable) or how to read the signal. */
  action: string;
  severity?: ArchitectureHealthFindingSeverity;
  file?: string;
  entityRef?: string;
  path?: string[];
  evidence?: {
    hotspotScore?: number;
    complexity?: number;
    accelerationRatio?: number;
    churn30?: number;
    churn365?: number;
    cycleReason?: DependencyCycleReason;
    cycleKey?: string;
  };
};

export type ArchitectureHealthSummary = {
  /** Actionable module direct-call cycles only. */
  cycles: number;
  informationalCycles: number;
  hotspots: number;
  knowledgeSilos: number;
  heating: number;
};

export type ArchitectureHealthReport = {
  /** True when there are no actionable findings (informational cycles do not fail health). */
  isHealthy: boolean;
  findings: ArchitectureHealthFinding[];
  informationalFindings: ArchitectureHealthFinding[];
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
    finding.severity ?? 'actionable',
    finding.entityRef ?? '',
    finding.evidence?.cycleKey ?? '',
    finding.file ?? '',
    (finding.path ?? []).join('>'),
    finding.title,
  ].join('|');
}

function summarize(
  findings: ArchitectureHealthFinding[],
  informationalFindings: ArchitectureHealthFinding[]
): ArchitectureHealthSummary {
  return {
    cycles: findings.filter(f => f.kind === 'cycle').length,
    informationalCycles: informationalFindings.filter(f => f.kind === 'cycle').length,
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

function cycleAction(
  reason: DependencyCycleReason,
  severity: ArchitectureHealthFindingSeverity
): string {
  if (severity === 'informational') {
    if (reason === 'includes-external-proxy') {
      return 'Informational - cycle closes via an external proxy on this diagram; confirm the real module import cycle before refactoring.';
    }
    return 'Informational - cycle uses non-direct-call edges (e.g. inter-container or read-write); treat as coupling context, not a mandatory break.';
  }
  return 'Break the cycle - extract a shared module or invert one dependency direction.';
}

/**
 * Architecture health for practitioners: actionable cycles + forensics risk with fix actions.
 * Does not emit BlueprintSpec wiring noise (invalid-connection / broken-entity-ref).
 */
export function assessArchitectureHealth(
  files: LoadedBlueprintSchema[],
  options: AssessArchitectureHealthOptions = {}
): ArchitectureHealthReport {
  const heatingThreshold = options.heatingRatioThreshold ?? 2;
  const findings: ArchitectureHealthFinding[] = [];
  const informationalFindings: ArchitectureHealthFinding[] = [];

  const cycles = collectDependencyCycles(files);
  for (const cycle of cycles.actionable) {
    findings.push({
      kind: 'cycle',
      severity: 'actionable',
      file: cycle.file,
      title: 'Circular module dependency',
      action: cycleAction(cycle.reason, 'actionable'),
      path: cycle.path,
      evidence: { cycleReason: cycle.reason, cycleKey: cycle.key },
    });
  }
  for (const cycle of cycles.informational) {
    informationalFindings.push({
      kind: 'cycle',
      severity: 'informational',
      file: cycle.file,
      title: 'Circular dependency (informational)',
      action: cycleAction(cycle.reason, 'informational'),
      path: cycle.path,
      evidence: { cycleReason: cycle.reason, cycleKey: cycle.key },
    });
  }

  for (const file of files) {
    for (const node of file.schema.nodes) {
      const forensics = node.forensics;
      if (!forensics) continue;

      if (hasClassification(forensics.classifications, 'hotspot')) {
        findings.push({
          kind: 'hotspot',
          severity: 'actionable',
          file: file.path,
          entityRef: node.entityRef,
          title: `Hotspot: ${node.name}`,
          action: 'Split or simplify this module - high complexity combined with frequent change.',
          evidence: {
            hotspotScore: forensics.hotspotScore,
            complexity: forensics.complexity,
          },
        });
      }

      if (hasClassification(forensics.classifications, 'knowledge-silo')) {
        findings.push({
          kind: 'knowledge-silo',
          severity: 'actionable',
          file: file.path,
          entityRef: node.entityRef,
          title: `Knowledge silo: ${node.name}`,
          action:
            'Share ownership - pair, document boundaries or reduce complexity so more people can change it safely.',
          evidence: {
            complexity: forensics.complexity,
          },
        });
      }

      const ratio = churnAccelerationRatio(forensics.churn30 ?? 0, forensics.churn365 ?? 0);
      if (ratio != null && ratio >= heatingThreshold && churnAccelerationTone(ratio) !== 'none') {
        findings.push({
          kind: 'heating',
          severity: 'actionable',
          file: file.path,
          entityRef: node.entityRef,
          title: `Heating: ${node.name}`,
          action:
            'Stabilize change rate - batch related edits, finish the refactor or pause drive-by churn in this module.',
          evidence: {
            accelerationRatio: ratio,
            churn30: forensics.churn30,
            churn365: forensics.churn365,
          },
        });
      }
    }
  }

  const summary = summarize(findings, informationalFindings);
  return {
    isHealthy: findings.length === 0,
    findings,
    informationalFindings,
    summary,
    filesChecked: files.length,
  };
}

/** Compare two health reports - used for last-commit / particular-commit baselines. */
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
    informationalCycles: current.summary.informationalCycles - baseline.summary.informationalCycles,
    hotspots: current.summary.hotspots - baseline.summary.hotspots,
    knowledgeSilos: current.summary.knowledgeSilos - baseline.summary.knowledgeSilos,
    heating: current.summary.heating - baseline.summary.heating,
  };

  // Deterioration is driven by actionable debt only (not informational cycles).
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
