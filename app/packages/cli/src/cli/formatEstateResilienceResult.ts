import pc from 'picocolors';
import {
  formatAdviceLensArtifactJson,
  serializeEstateResilienceReport,
  type EstateResilienceReport,
} from '@archlens/core/recommendations';
import type { OutputFormat } from './formatValidationResult.ts';

function formatRecommendationLine(
  recommendation: EstateResilienceReport['recommendations'][number],
  index: number
): string {
  const priority = pc.dim(`[${recommendation.priority}]`);
  const target = pc.white(recommendation.targetName);
  const source = pc.dim(`(${recommendation.source})`);
  return `  ${pc.yellow(String(index + 1).padStart(2, ' '))}. ${priority} ${pc.bold(recommendation.title)} ${pc.dim('—')} ${target} ${source}\n     ${pc.dim(recommendation.detail)}`;
}

export function formatEstateResilienceResult(
  report: EstateResilienceReport,
  format: OutputFormat
): string {
  if (format === 'json') {
    return formatAdviceLensArtifactJson(serializeEstateResilienceReport(report));
  }

  const lines: string[] = [];
  lines.push(
    pc.cyan(
      `AdviceLens estate report: ${report.summary.diagramCount} diagram(s), ${report.summary.totalScenarios} scenario(s)`
    )
  );
  lines.push(
    `  Worst SLA: ${report.summary.worstOverallSla}% · SPOFs: ${report.summary.totalSpofs} · Recommendations: ${report.summary.recommendationCount}`
  );
  lines.push('');

  if (report.recommendations.length === 0) {
    lines.push(pc.green('✔ No high-priority recommendations.'));
    return `${lines.join('\n')}\n`;
  }

  lines.push(pc.bold('Top recommendations'));
  const top = report.recommendations.slice(0, 15);
  for (const [index, recommendation] of top.entries()) {
    lines.push(formatRecommendationLine(recommendation, index));
  }

  if (report.recommendations.length > top.length) {
    lines.push(
      pc.dim(
        `  … and ${report.recommendations.length - top.length} more (use --format=json for full output)`
      )
    );
  }

  lines.push('');
  lines.push(pc.bold('Diagrams'));
  for (const diagram of report.diagrams) {
    lines.push(
      `  ${pc.white(diagram.diagramRef)} ${pc.dim('—')} SLA ${diagram.worstOverallSla}% · ${diagram.scenarioCount} scenarios · ${diagram.recommendations.length} recs ${pc.dim(`(${diagram.diagramPath})`)}`
    );
  }

  return `${lines.join('\n')}\n`;
}
