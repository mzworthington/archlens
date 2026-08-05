import pc from 'picocolors';
import type {
  ArchitectureHealthRegression,
  ArchitectureHealthReport,
  BlueprintValidationIssue,
  BlueprintValidationResult,
} from '@archlens/core';
import type { OutputFormat } from './formatValidationResult.ts';

export type ArchitectureValidatePayload = {
  mode: 'health';
  isHealthy: boolean;
  deteriorated?: boolean;
  baseline?: string;
  filesChecked: number;
  summary: ArchitectureHealthReport['summary'];
  findings: ArchitectureHealthReport['findings'];
  informationalFindings: ArchitectureHealthReport['informationalFindings'];
  regression?: ArchitectureHealthRegression;
  contract?: {
    isValid: boolean;
    issues: BlueprintValidationIssue[];
  };
};

export function formatArchitectureHealthResult(input: {
  report: ArchitectureHealthReport;
  format: OutputFormat;
  baselineLabel?: string;
  regression?: ArchitectureHealthRegression;
  contract?: BlueprintValidationResult & { parseErrors: Array<{ path: string; message: string }> };
}): string {
  const contractIssues: BlueprintValidationIssue[] = input.contract
    ? [
        ...input.contract.parseErrors.map(error => ({
          file: error.path,
          type: 'schema-error' as const,
          message: error.message,
        })),
        ...input.contract.issues,
      ]
    : [];

  const payload: ArchitectureValidatePayload = {
    mode: 'health',
    isHealthy:
      input.report.isHealthy &&
      (!input.contract || (input.contract.isValid && contractIssues.length === 0)),
    deteriorated: input.regression?.deteriorated,
    baseline: input.baselineLabel,
    filesChecked: input.report.filesChecked,
    summary: input.report.summary,
    findings: input.report.findings,
    informationalFindings: input.report.informationalFindings,
    regression: input.regression,
    contract: input.contract
      ? {
          isValid: input.contract.isValid && contractIssues.length === 0,
          issues: contractIssues,
        }
      : undefined,
  };

  if (input.format === 'json') {
    return `${JSON.stringify(payload, null, 2)}\n`;
  }

  const lines: string[] = [];
  if (payload.isHealthy && !payload.deteriorated) {
    const infoNote =
      input.report.informationalFindings.length > 0
        ? `; ${input.report.informationalFindings.length} informational cycle(s)`
        : '';
    lines.push(
      pc.green(
        `✔ Architecture health OK (${payload.filesChecked} blueprint file(s)` +
          (payload.baseline ? `; no deterioration vs ${payload.baseline}` : '') +
          infoNote +
          `).`
      )
    );
  } else {
    const parts: string[] = [];
    if (!input.report.isHealthy) {
      parts.push(`${input.report.findings.length} actionable finding(s)`);
    }
    if (payload.deteriorated) {
      parts.push(`deteriorated vs ${payload.baseline ?? 'baseline'}`);
    }
    if (payload.contract && !payload.contract.isValid) {
      parts.push(`${payload.contract.issues.length} contract issue(s)`);
    }
    lines.push(pc.red(`✖ Architecture validation failed (${parts.join(', ')}):`));
  }

  if (payload.regression && payload.baseline) {
    const d = payload.regression.deltas;
    lines.push('');
    lines.push(pc.bold(`Regression vs ${payload.baseline}`));
    lines.push(
      `  deltas: cycles ${fmtDelta(d.cycles)}, hotspots ${fmtDelta(d.hotspots)}, ` +
        `silos ${fmtDelta(d.knowledgeSilos)}, heating ${fmtDelta(d.heating)}`
    );
    if (payload.regression.newFindings.length > 0) {
      lines.push(pc.yellow('  New / worsened:'));
      for (const finding of payload.regression.newFindings) {
        lines.push(formatFindingLine(finding));
      }
    }
    if (payload.regression.resolvedFindings.length > 0) {
      lines.push(pc.green('  Resolved:'));
      for (const finding of payload.regression.resolvedFindings) {
        lines.push(formatFindingLine(finding, true));
      }
    }
  }

  if (input.report.findings.length > 0) {
    lines.push('');
    lines.push(pc.bold('Fix in the codebase'));
    for (const finding of input.report.findings) {
      lines.push(formatFindingLine(finding));
    }
  }

  if (input.report.informationalFindings.length > 0) {
    lines.push('');
    lines.push(pc.bold(`Informational coupling (${input.report.informationalFindings.length})`));
    const byReason = new Map<string, number>();
    for (const finding of input.report.informationalFindings) {
      const reason = finding.evidence?.cycleReason ?? 'unknown';
      byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
    }
    for (const [reason, count] of [...byReason.entries()].sort()) {
      lines.push(`  ${pc.dim(reason)}: ${count}`);
    }
    const preview = input.report.informationalFindings.slice(0, 5);
    for (const finding of preview) {
      lines.push(formatFindingLine(finding));
    }
    if (input.report.informationalFindings.length > preview.length) {
      lines.push(
        pc.dim(
          `  … and ${input.report.informationalFindings.length - preview.length} more (use --format=json for the full list)`
        )
      );
    }
  }

  if (payload.contract && payload.contract.issues.length > 0) {
    lines.push('');
    lines.push(pc.bold('Contract (BlueprintSpec wiring)'));
    for (const issue of payload.contract.issues) {
      lines.push(`  ${pc.dim(issue.file)}\n    ${pc.yellow(issue.type)}: ${issue.message}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function fmtDelta(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

function formatFindingLine(
  finding: ArchitectureHealthReport['findings'][number],
  resolved = false
): string {
  const where = [finding.file, finding.entityRef].filter(Boolean).join(' · ');
  const prefix = resolved ? pc.dim('✓') : pc.yellow(finding.kind);
  const path =
    finding.path && finding.path.length > 0 ? `\n      path: ${finding.path.join(' ➔ ')}` : '';
  return `  ${where ? pc.dim(where) + '\n    ' : ''}${prefix}: ${finding.title}\n      → ${finding.action}${path}`;
}
