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

type FormatArchitectureHealthInput = {
  report: ArchitectureHealthReport;
  format: OutputFormat;
  baselineLabel?: string;
  regression?: ArchitectureHealthRegression;
  contract?: BlueprintValidationResult & { parseErrors: Array<{ path: string; message: string }> };
};

type HealthFinding = ArchitectureHealthReport['findings'][number];

export function formatArchitectureHealthResult(input: FormatArchitectureHealthInput): string {
  const payload = buildArchitectureValidatePayload(input);

  if (input.format === 'json') {
    return `${JSON.stringify(payload, null, 2)}\n`;
  }

  const lines: string[] = [
    formatHealthStatusHeader(input, payload),
    ...formatRegressionSection(payload),
    ...formatFindingsSection(input.report.findings),
    ...formatInformationalSection(input.report.informationalFindings),
    ...formatContractSection(payload.contract),
  ];

  return `${lines.join('\n')}\n`;
}

function buildArchitectureValidatePayload(
  input: FormatArchitectureHealthInput
): ArchitectureValidatePayload {
  const contractIssues = collectContractIssues(input.contract);

  return {
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
}

function collectContractIssues(
  contract: FormatArchitectureHealthInput['contract']
): BlueprintValidationIssue[] {
  if (!contract) return [];
  return [
    ...contract.parseErrors.map(error => ({
      file: error.path,
      type: 'schema-error' as const,
      message: error.message,
    })),
    ...contract.issues,
  ];
}

function formatHealthStatusHeader(
  input: FormatArchitectureHealthInput,
  payload: ArchitectureValidatePayload
): string {
  if (payload.isHealthy && !payload.deteriorated) {
    return formatOkHeader(payload, input.report.informationalFindings.length);
  }
  return formatFailureHeader(input, payload);
}

function formatOkHeader(payload: ArchitectureValidatePayload, informationalCount: number): string {
  const infoNote = informationalCount > 0 ? `; ${informationalCount} informational cycle(s)` : '';
  return pc.green(
    `✔ Architecture health OK (${payload.filesChecked} blueprint file(s)` +
      (payload.baseline ? `; no deterioration vs ${payload.baseline}` : '') +
      infoNote +
      `).`
  );
}

function formatFailureHeader(
  input: FormatArchitectureHealthInput,
  payload: ArchitectureValidatePayload
): string {
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
  return pc.red(`✖ Architecture validation failed (${parts.join(', ')}):`);
}

function formatRegressionSection(payload: ArchitectureValidatePayload): string[] {
  if (!payload.regression || !payload.baseline) return [];

  const d = payload.regression.deltas;
  const lines: string[] = [
    '',
    pc.bold(`Regression vs ${payload.baseline}`),
    `  deltas: cycles ${fmtDelta(d.cycles)}, hotspots ${fmtDelta(d.hotspots)}, ` +
      `silos ${fmtDelta(d.knowledgeSilos)}, heating ${fmtDelta(d.heating)}`,
  ];

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
  return lines;
}

function formatFindingsSection(findings: ArchitectureHealthReport['findings']): string[] {
  if (findings.length === 0) return [];

  const lines: string[] = ['', pc.bold('Fix in the codebase')];
  for (const finding of findings) {
    lines.push(formatFindingLine(finding));
  }
  return lines;
}

function formatInformationalSection(
  informationalFindings: ArchitectureHealthReport['informationalFindings']
): string[] {
  if (informationalFindings.length === 0) return [];

  const lines: string[] = ['', pc.bold(`Informational coupling (${informationalFindings.length})`)];

  const byReason = countInformationalByReason(informationalFindings);
  for (const [reason, count] of [...byReason.entries()].sort()) {
    lines.push(`  ${pc.dim(reason)}: ${count}`);
  }

  const preview = informationalFindings.slice(0, 5);
  for (const finding of preview) {
    lines.push(formatFindingLine(finding));
  }
  if (informationalFindings.length > preview.length) {
    lines.push(
      pc.dim(
        `  … and ${informationalFindings.length - preview.length} more (use --format=json for the full list)`
      )
    );
  }
  return lines;
}

function countInformationalByReason(
  informationalFindings: ArchitectureHealthReport['informationalFindings']
): Map<string, number> {
  const byReason = new Map<string, number>();
  for (const finding of informationalFindings) {
    const reason = finding.evidence?.cycleReason ?? 'unknown';
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  }
  return byReason;
}

function formatContractSection(contract: ArchitectureValidatePayload['contract']): string[] {
  if (!contract || contract.issues.length === 0) return [];

  const lines: string[] = ['', pc.bold('Contract (BlueprintSpec wiring)')];
  for (const issue of contract.issues) {
    lines.push(`  ${pc.dim(issue.file)}\n    ${pc.yellow(issue.type)}: ${issue.message}`);
  }
  return lines;
}

function fmtDelta(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

function formatFindingLine(finding: HealthFinding, resolved = false): string {
  const where = [finding.file, finding.entityRef].filter(Boolean).join(' · ');
  const prefix = resolved ? pc.dim('✓') : pc.yellow(finding.kind);
  const path =
    finding.path && finding.path.length > 0 ? `\n      path: ${finding.path.join(' ➔ ')}` : '';
  return `  ${where ? pc.dim(where) + '\n    ' : ''}${prefix}: ${finding.title}\n      → ${finding.action}${path}`;
}
