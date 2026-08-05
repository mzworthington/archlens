import type { Node as RFNode } from '@xyflow/react';
import {
  blastHeatMinimapColor,
  integrityHeatMinimapColor,
} from '../../../../../application/resilience/blastHeatmap';
import { hotspotHeatmapMinimapColor } from '../../../../../application/forensics/hotspotHeatmap';

export function getCanvasMiniMapNodeColor(
  node: RFNode,
  showHotspotHeatmap: boolean,
  isResilienceMode: boolean
): string {
  if (node.type !== 'blueprintNode') return '#1e293b';

  const hotspotHeat = typeof node.data?.hotspotHeat === 'number' ? node.data.hotspotHeat : 0;
  const blastHeat = typeof node.data?.blastHeat === 'number' ? node.data.blastHeat : 0;
  const integrityHeat = typeof node.data?.integrityHeat === 'number' ? node.data.integrityHeat : 0;

  if (showHotspotHeatmap && hotspotHeat > 0) {
    const heatColor = hotspotHeatmapMinimapColor(hotspotHeat);
    if (heatColor) return heatColor;
  }
  if (isResilienceMode) {
    if (blastHeat > 0) return blastHeatMinimapColor(blastHeat);
    if (integrityHeat > 0) return integrityHeatMinimapColor(integrityHeat);
  }
  if (node.data?.type === 'relational-database') return '#06b6d4';
  if (node.data?.type === 'event-broker') return '#a855f7';
  if (node.data?.type === 'grpc-service') return '#3b82f6';
  if (node.data?.type === 'serverless-function') return '#eab308';
  if (node.data?.type === 'rest-api') return '#10b981';
  if (node.data?.type === 'cache-store') return '#f97316';
  return '#1e293b';
}
