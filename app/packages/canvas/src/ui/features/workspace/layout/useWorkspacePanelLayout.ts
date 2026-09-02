import { useMemo } from 'react';
import { useBlueprintStore } from '../../../../application/store/store';
import {
  resolveActivePanelInSlot,
  type LeftSlotPanelId,
  type WorkspacePanelId,
} from './workspacePanelLayout';

export interface WorkspacePanelLayoutState {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  activeLeftPanel: LeftSlotPanelId;
  isTraceLensPanelOpen: boolean;
  isTraceLensMode: boolean;
  showLeftSlot: boolean;
  showRightSlot: boolean;
  activeLeftPanelId: WorkspacePanelId | null;
  leftRailTitle: { expand: string; collapse: string };
  toggleLeftSlot: () => void;
  toggleRightSlot: () => void;
}

export function useWorkspacePanelLayout(): WorkspacePanelLayoutState {
  const leftCollapsed = useBlueprintStore(s => s.leftCollapsed);
  const rightCollapsed = useBlueprintStore(s => s.rightCollapsed);
  const activeLeftPanel = useBlueprintStore(s => s.activeLeftPanel);
  const isTraceLensPanelOpen = useBlueprintStore(s => s.isTraceLensPanelOpen);
  const isTraceLensMode = useBlueprintStore(s => s.isTraceLensMode);
  const toggleLeftCollapsed = useBlueprintStore(s => s.toggleLeftCollapsed);
  const toggleRightCollapsed = useBlueprintStore(s => s.toggleRightCollapsed);

  const activeLeftPanelId = useMemo(
    () => resolveActivePanelInSlot('left', { left: activeLeftPanel }),
    [activeLeftPanel]
  );

  const showLeftSlot = !leftCollapsed && !isTraceLensMode;
  const showRightSlot = !rightCollapsed && !isTraceLensMode;

  const leftRailTitle = useMemo(
    () => ({
      expand: 'Show explorer',
      collapse: 'Hide explorer',
    }),
    []
  );

  return {
    leftCollapsed,
    rightCollapsed,
    activeLeftPanel,
    isTraceLensPanelOpen,
    isTraceLensMode,
    showLeftSlot,
    showRightSlot,
    activeLeftPanelId,
    leftRailTitle,
    toggleLeftSlot: toggleLeftCollapsed,
    toggleRightSlot: toggleRightCollapsed,
  };
}
