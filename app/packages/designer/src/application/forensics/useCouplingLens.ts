import { useCallback, useMemo } from 'react';
import { buildWorkspaceFilepathIndex, type WorkspaceFilepathIndex } from '@archlens/core';
import type { BlueprintRFNode } from '../store/layoutUtils';
import type { LoadedSystemRef } from './rankOffenders';
import {
  resolveAllCanvasCouplingEdges,
  resolveCouplingEdges,
  findNodeIdByFilepath,
  type CouplingEdgeRef,
} from './resolveCouplingEdges';
import { buildCouplingGhostNodes } from './buildCouplingOverlayEdges';

const EMPTY_FILEPATH_INDEX: WorkspaceFilepathIndex = {
  byPath: new Map(),
};

export type CouplingLensState = {
  workspaceFilepathIndex: WorkspaceFilepathIndex;
  couplingFocusMode: boolean;
  couplingRefs: CouplingEdgeRef[];
  couplingGhostNodes: BlueprintRFNode[];
  linkedCouplingPaths: ReadonlySet<string>;
  linkedCouplingCount: number;
  focusCouplingCount: number;
};

type UseCouplingLensInput = {
  showCoupling: boolean;
  selectedNodeId: string | null;
  nodes: BlueprintRFNode[];
  loadedSystems: readonly LoadedSystemRef[];
};

/**
 * Shared coupling-lens view state for canvas and property panel.
 */
export function useCouplingLens({
  showCoupling,
  selectedNodeId,
  nodes,
  loadedSystems,
}: UseCouplingLensInput): CouplingLensState {
  const workspaceFilepathIndex = useMemo(
    () => (showCoupling ? buildWorkspaceFilepathIndex([...loadedSystems]) : EMPTY_FILEPATH_INDEX),
    [showCoupling, loadedSystems]
  );

  const couplingFocusMode = showCoupling && !!selectedNodeId;

  const MAX_COUPLING_FOCUS_PEERS = 8;

  const couplingRefs = useMemo(() => {
    if (!showCoupling) return [];
    if (selectedNodeId) {
      return resolveCouplingEdges(selectedNodeId, nodes, workspaceFilepathIndex)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_COUPLING_FOCUS_PEERS);
    }
    return resolveAllCanvasCouplingEdges(nodes, workspaceFilepathIndex);
  }, [showCoupling, selectedNodeId, nodes, workspaceFilepathIndex]);

  const couplingGhostNodes = useMemo(
    () => buildCouplingGhostNodes(selectedNodeId, nodes, couplingRefs, couplingFocusMode),
    [selectedNodeId, nodes, couplingRefs, couplingFocusMode]
  );

  const linkedCouplingPaths = useMemo(
    () => new Set(couplingRefs.filter(edge => edge.resolution === 'canvas').map(edge => edge.path)),
    [couplingRefs]
  );

  const linkedCouplingCount = couplingRefs.filter(edge => edge.resolution === 'canvas').length;

  return {
    workspaceFilepathIndex,
    couplingFocusMode,
    couplingRefs,
    couplingGhostNodes,
    linkedCouplingPaths,
    linkedCouplingCount,
    focusCouplingCount: couplingRefs.length,
  };
}

export function useSelectCoupledPeer(
  nodes: BlueprintRFNode[],
  workspaceFilepathIndex: WorkspaceFilepathIndex,
  selectNode: (id: string | null) => void
) {
  return useCallback(
    (path: string) => {
      const nodeId = findNodeIdByFilepath(path, nodes, workspaceFilepathIndex);
      if (nodeId) selectNode(nodeId);
    },
    [nodes, workspaceFilepathIndex, selectNode]
  );
}
