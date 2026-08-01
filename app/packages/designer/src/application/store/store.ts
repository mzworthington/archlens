import { create } from 'zustand';
import { createUiState, type UiState } from './states/uiState';
import { createDiagramState, type DiagramState } from './states/diagramState';
import { createIoState, type IoState } from './states/ioState';
import { createResilienceState, type ResilienceState } from './states/resilienceState';

export type {
  BlueprintRFNode,
  BlueprintRFEdge,
  ComponentNodeData,
  ComponentEdgeData,
} from './layoutUtils';

export { resolveRelativePath, getFileName } from '@archlens/core';

export { defaultInitialSchema, SANDBOX_DEFINITIONS } from './defaultData';

export interface BlueprintState extends UiState, DiagramState, IoState, ResilienceState {}

export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  ...createUiState(set),
  ...createDiagramState(set, get),
  ...createIoState(set, get),
  ...createResilienceState(set, get),
}));
