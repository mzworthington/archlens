import { isDesktopViewport } from '../layoutUtils';
import type { UiState } from './uiState';

export interface TraceLensState {
  isTraceLensMode: boolean;
  isTraceLensPanelOpen: boolean;
  setTraceLensMode: (enabled: boolean) => void;
  setTraceLensPanelOpen: (open: boolean) => void;
  toggleTraceLensPanelOpen: () => void;
  toggleTraceLensMode: () => void;
}

type TraceLensStoreSlice = TraceLensState &
  Pick<UiState, 'leftCollapsed' | 'rightCollapsed' | 'activeLeftPanel'> & {
    isResilienceMode?: boolean;
  };

function traceLensModePanelPatch(): Partial<TraceLensStoreSlice> {
  return {
    leftCollapsed: true,
    isTraceLensPanelOpen: false,
    ...(isDesktopViewport() ? { rightCollapsed: true } : {}),
  };
}

export const createTraceLensState = (
  set: {
    bivarianceHack(
      partial:
        | Partial<TraceLensStoreSlice>
        | ((state: TraceLensStoreSlice) => Partial<TraceLensStoreSlice>)
    ): void;
  }['bivarianceHack'],
  get: () => TraceLensStoreSlice
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
