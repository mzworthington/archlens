import pc from 'picocolors';
import type { BlueprintValidationIssue, BlueprintValidationResult } from '@archlens/core';

export type OutputFormat = 'text' | 'json';

export function formatValidationResult(
  result: BlueprintValidationResult,
  parseErrors: Array<{ path: string; message: string }>,
  format: OutputFormat
): string {
  const payload = {
    isValid: result.isValid && parseErrors.length === 0,
    filesChecked: result.filesChecked,
    issues: [
      ...parseErrors.map(error => ({
        file: error.path,
        type: 'schema-error' as const,
        message: error.message,
      })),
      ...result.issues,
    ],
  };

  if (format === 'json') {
    return `${JSON.stringify(payload, null, 2)}\n`;
  }

  if (payload.isValid) {
    return pc.green(`✔ ${result.filesChecked} blueprint file(s) passed validation.\n`);
  }

  const lines = [pc.red(`✖ Blueprint validation failed (${payload.issues.length} issue(s)):\n`)];
  for (const issue of payload.issues) {
    lines.push(formatIssueLine(issue));
  }
  return `${lines.join('\n')}\n`;
}

function formatIssueLine(issue: BlueprintValidationIssue): string {
  const location = pc.dim(issue.file);
  const kind = pc.yellow(issue.type);
  return `  ${location}\n    ${kind}: ${issue.message}`;
}
