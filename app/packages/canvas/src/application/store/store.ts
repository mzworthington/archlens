import { create } from 'zustand';
import { createUiState, type UiState } from './states/uiState';
import { createDiagramState, type DiagramState } from './states/diagramState';
import { createIoState, type IoState } from './states/ioState';
import { createResilienceState, type ResilienceState } from './states/resilienceState';
import { createTraceLensState, type TraceLensState } from './states/traceLensState';

export type {
  BlueprintRFNode,
  BlueprintRFEdge,
  ComponentNodeData,
  ComponentEdgeData,
} from './layoutUtils';

export { resolveRelativePath } from '@archlens/core';

export interface BlueprintState
  extends UiState, DiagramState, IoState, ResilienceState, TraceLensState {}

export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  ...createUiState(set),
  ...createDiagramState(set, get),
  ...createIoState(set, get),
  ...createResilienceState(set, get),
  ...createTraceLensState(set, get),
}));
