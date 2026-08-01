import type { BlueprintState } from '../store';
import { isDesktopViewport } from '../layoutUtils';

export interface TraceLensState {
  isTraceLensMode: boolean;
  setTraceLensMode: (enabled: boolean) => void;
  toggleTraceLensMode: () => void;
}

function traceLensModePanelPatch(): Partial<BlueprintState> {
  return {
    leftCollapsed: true,
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
  setTraceLensMode: enabled => {
    set({
      isTraceLensMode: enabled,
      ...(enabled
        ? {
            isResilienceMode: false,
            ...traceLensModePanelPatch(),
          }
        : {}),
    });
  },
  toggleTraceLensMode: () => {
    get().setTraceLensMode(!get().isTraceLensMode);
  },
});
