import type { EstateRecommendationsReport } from './buildEstateRecommendations';
import {
  estateRecommendationsToAdviceLensArtifact,
  formatEstateAdviceLensArtifactJson,
} from './buildEstateRecommendations';

export const ADVICELENS_EXPORT_FILENAME = 'advicelens-report.json';

export function buildAdviceLensExportJson(report: EstateRecommendationsReport): string {
  return formatEstateAdviceLensArtifactJson(report);
}

export function buildAdviceLensExportArtifact(report: EstateRecommendationsReport) {
  return estateRecommendationsToAdviceLensArtifact(report);
}
