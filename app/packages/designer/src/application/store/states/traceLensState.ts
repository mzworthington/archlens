import type { BlueprintState } from '../store';
import { isDesktopViewport } from '../layoutUtils';

export interface TraceLensState {
  isTraceLensMode: boolean;
  isTraceLensPanelOpen: boolean;
  setTraceLensMode: (enabled: boolean) => void;
  setTraceLensPanelOpen: (open: boolean) => void;
  toggleTraceLensPanelOpen: () => void;
  toggleTraceLensMode: () => void;
}

function traceLensModePanelPatch(): Partial<BlueprintState> {
  return {
    leftCollapsed: true,
    isTraceLensPanelOpen: false,
    ...(isDesktopViewport() ? { rightCollapsed: true } : {}),
  };
}

export const createTraceLensState = (
  set: (
    partial: Partial<BlueprintState> | ((state: BlueprintState) => Partial<BlueprintState>)
  ) => void,
  get: () => BlueprintState
): TraceLensState => ({
  isTraceLensMode: false,
  isTraceLensPanelOpen: false,
  setTraceLensMode: enabled => {
    set({
      isTraceLensMode: enabled,
      ...(enabled
        ? {
            isResilienceMode: false,
            isTraceLensPanelOpen: false,
            ...traceLensModePanelPatch(),
          }
        : {}),
    });
  },
  setTraceLensPanelOpen: open => {
    set({
      isTraceLensPanelOpen: open,
      leftCollapsed: !open,
      ...(open ? { activeLeftPanel: 'traceLens' as const } : {}),
    });
  },
  toggleTraceLensPanelOpen: () => {
    const state = get();
    if (state.leftCollapsed) {
      set({ leftCollapsed: false, activeLeftPanel: 'traceLens', isTraceLensPanelOpen: true });
      return;
    }
    if (state.activeLeftPanel === 'traceLens') {
      set({ leftCollapsed: true, isTraceLensPanelOpen: false });
      return;
    }
    set({ activeLeftPanel: 'traceLens', isTraceLensPanelOpen: true });
  },
  toggleTraceLensMode: () => {
    get().setTraceLensMode(!get().isTraceLensMode);
  },
});
