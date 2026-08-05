import { useMemo } from 'react';
import type { LoadedSystemInput, SystemSchema } from '@archlens/core';
import type { ExternalSummaryBand } from '@archlens/core';
import type {
  BlueprintRFEdge,
  BlueprintRFNode,
} from '../../../../../application/store/layoutUtils';
import type { DependencyViewMode } from '../../../../../application/forensics/dependencyViewMode';
import type { CanvasExternalSummaryContext } from './canvasDisplayTypes';

export type UseCanvasExternalSummaryInput = {
  schema: SystemSchema;
  loadedSystems: readonly LoadedSystemInput[];
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  showUpstreamExternals: boolean;
  showDownstreamExternals: boolean;
  expandedExternalHub: ExternalSummaryBand | null;
  dependencyViewMode: DependencyViewMode;
};

export function useCanvasExternalSummary(
  input: UseCanvasExternalSummaryInput
): CanvasExternalSummaryContext {
  const {
    schema,
    loadedSystems,
    nodes,
    edges,
    showUpstreamExternals,
    showDownstreamExternals,
    expandedExternalHub,
    dependencyViewMode,
  } = input;

  return useMemo(
    () => ({
      schema,
      loadedSystems,
      allNodes: nodes,
      allEdges: edges,
      showUpstreamExternals,
      showDownstreamExternals,
      expandedExternalHub,
      dependencyViewMode,
    }),
    [
      schema,
      loadedSystems,
      nodes,
      edges,
      showUpstreamExternals,
      showDownstreamExternals,
      expandedExternalHub,
      dependencyViewMode,
    ]
  );
}
