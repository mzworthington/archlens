import type { AdviceLensArtifactFormat } from '@archlens/core/recommendations';
import type { EstateRecommendationsReport } from './buildEstateRecommendations';
import {
  estateRecommendationsToAdviceLensArtifact,
  formatEstateAdviceLensArtifact,
  formatEstateAdviceLensArtifactJson,
} from './buildEstateRecommendations';

/** Studio default — matches BlueprintSpec / ChaosSpec human-readable exports. */
export const ADVICELENS_EXPORT_FILENAME = 'advicelens-report.yaml';
export const ADVICELENS_EXPORT_JSON_FILENAME = 'advicelens-report.json';
export const ADVICELENS_DEFAULT_EXPORT_FORMAT: AdviceLensArtifactFormat = 'yaml';

export function adviceLensExportFilename(
  format: AdviceLensArtifactFormat = ADVICELENS_DEFAULT_EXPORT_FORMAT
): string {
  return format === 'json' ? ADVICELENS_EXPORT_JSON_FILENAME : ADVICELENS_EXPORT_FILENAME;
}

/** @deprecated Prefer {@link buildAdviceLensExportText} with yaml default. */
export function buildAdviceLensExportJson(report: EstateRecommendationsReport): string {
  return formatEstateAdviceLensArtifactJson(report);
}

export function buildAdviceLensExportText(
  report: EstateRecommendationsReport,
  format: AdviceLensArtifactFormat = ADVICELENS_DEFAULT_EXPORT_FORMAT
): string {
  return formatEstateAdviceLensArtifact(report, format);
}

export function buildAdviceLensExportArtifact(report: EstateRecommendationsReport) {
  return estateRecommendationsToAdviceLensArtifact(report);
}
