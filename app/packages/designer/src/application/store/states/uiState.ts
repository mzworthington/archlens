import type { LayoutEngineId } from '../../../core';
import type { SourceProvenance } from '@archlens/core';

export interface ToastNotification {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title?: string;
}

export interface UiState {
  showTests: boolean;
  showUpstreamExternals: boolean;
  showDownstreamExternals: boolean;
  showSelectedDependenciesOnly: boolean;
  showCoupling: boolean;
  showCouplingSchemaDeps: boolean;
  guidedRefactorEntityRefs: string[] | null;
  showHotspotHeatmap: boolean;
  liteCanvas: boolean;
  layoutEngine: LayoutEngineId | null;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  showDesignSystem: boolean;
  isDiffOpen: boolean;
  isImportMermaidOpen: boolean;
  isImportIacOpen: boolean;
  isStartupOpen: boolean;
  isCompareOpen: boolean;
  isShortcutsOpen: boolean;
  isDisplaySettingsOpen: boolean;
  childExternalsParentRef: string | null;
  isSourceCodeOpen: boolean;
  sourceCodeFilepath: string | null;
  sourceCodeProvenance: SourceProvenance | null;
  notification: ToastNotification | null;
  focusedCyclePath: string[] | null;
  isLoading: boolean | string;
  diagramLoadCount: number;
  toggleShowTests: () => void;
  toggleShowUpstreamExternals: () => void;
  toggleShowDownstreamExternals: () => void;
  setShowUpstreamExternals: (show: boolean) => void;
  setShowDownstreamExternals: (show: boolean) => void;
  toggleShowSelectedDependenciesOnly: () => void;
  toggleShowCoupling: () => void;
  setShowCoupling: (show: boolean) => void;
  toggleShowCouplingSchemaDeps: () => void;
  setShowCouplingSchemaDeps: (show: boolean) => void;
  setGuidedRefactorEntityRefs: (entityRefs: string[] | null) => void;
  toggleShowHotspotHeatmap: () => void;
  toggleLiteCanvas: () => void;
  toggleLeftCollapsed: () => void;
  toggleRightCollapsed: () => void;
  setShowDesignSystem: (show: boolean) => void;
  setIsDiffOpen: (open: boolean) => void;
  setIsImportMermaidOpen: (open: boolean) => void;
  setIsImportIacOpen: (open: boolean) => void;
  setIsStartupOpen: (open: boolean) => void;
  setIsCompareOpen: (open: boolean) => void;
  setIsShortcutsOpen: (open: boolean) => void;
  setIsDisplaySettingsOpen: (open: boolean) => void;
  openChildLevelExternals: (parentEntityRef: string) => void;
  closeChildLevelExternals: () => void;
  openSourceCodeDialog: (filepath: string, source?: SourceProvenance) => void;
  closeSourceCodeDialog: () => void;
  setNotification: (notification: ToastNotification | null) => void;
  setLayoutEngine: (engine: LayoutEngineId | null) => void;
  setFocusedCyclePath: (path: string[] | null) => void;
  setIsLoading: (loading: boolean | string) => void;
}

export const createUiState = (
  set: (partial: Partial<UiState> | ((state: UiState) => Partial<UiState>)) => void
): UiState => ({
  showTests: false,
  showUpstreamExternals: true,
  showDownstreamExternals: true,
  showSelectedDependenciesOnly: true,
  showCoupling: false,
  showCouplingSchemaDeps: false,
  guidedRefactorEntityRefs: null,
  showHotspotHeatmap: true,
  liteCanvas: false,
  layoutEngine: null,
  leftCollapsed: true,
  rightCollapsed: true,
  showDesignSystem: false,
  isDiffOpen: false,
  isImportMermaidOpen: false,
  isImportIacOpen: false,
  isStartupOpen: true,
  isCompareOpen: false,
  isShortcutsOpen: false,
  isDisplaySettingsOpen: false,
  childExternalsParentRef: null,
  isSourceCodeOpen: false,
  sourceCodeFilepath: null,
  sourceCodeProvenance: null,
  notification: null,
  focusedCyclePath: null,
  isLoading: false,
  diagramLoadCount: 0,
  toggleShowTests: () => set(state => ({ showTests: !state.showTests })),
  toggleShowUpstreamExternals: () =>
    set(state => ({ showUpstreamExternals: !state.showUpstreamExternals })),
  toggleShowDownstreamExternals: () =>
    set(state => ({ showDownstreamExternals: !state.showDownstreamExternals })),
  setShowUpstreamExternals: show => set({ showUpstreamExternals: show }),
  setShowDownstreamExternals: show => set({ showDownstreamExternals: show }),
  toggleShowSelectedDependenciesOnly: () =>
    set(state => ({ showSelectedDependenciesOnly: !state.showSelectedDependenciesOnly })),
  toggleShowCoupling: () => set(state => ({ showCoupling: !state.showCoupling })),
  setShowCoupling: show => set({ showCoupling: show }),
  toggleShowCouplingSchemaDeps: () =>
    set(state => ({ showCouplingSchemaDeps: !state.showCouplingSchemaDeps })),
  setShowCouplingSchemaDeps: show => set({ showCouplingSchemaDeps: show }),
  setGuidedRefactorEntityRefs: entityRefs => set({ guidedRefactorEntityRefs: entityRefs }),
  toggleShowHotspotHeatmap: () => set(state => ({ showHotspotHeatmap: !state.showHotspotHeatmap })),
  toggleLiteCanvas: () => set(state => ({ liteCanvas: !state.liteCanvas })),
  toggleLeftCollapsed: () => set(state => ({ leftCollapsed: !state.leftCollapsed })),
  toggleRightCollapsed: () => set(state => ({ rightCollapsed: !state.rightCollapsed })),
  setShowDesignSystem: show => set({ showDesignSystem: show }),
  setIsDiffOpen: open => set({ isDiffOpen: open }),
  setIsImportMermaidOpen: open => set({ isImportMermaidOpen: open }),
  setIsImportIacOpen: open => set({ isImportIacOpen: open }),
  setIsStartupOpen: open => set({ isStartupOpen: open }),
  setIsCompareOpen: open => set({ isCompareOpen: open }),
  setIsShortcutsOpen: open => set({ isShortcutsOpen: open }),
  setIsDisplaySettingsOpen: open => set({ isDisplaySettingsOpen: open }),
  openChildLevelExternals: parentEntityRef => set({ childExternalsParentRef: parentEntityRef }),
  closeChildLevelExternals: () => set({ childExternalsParentRef: null }),
  openSourceCodeDialog: (filepath, source) =>
    set({
      isSourceCodeOpen: true,
      sourceCodeFilepath: filepath,
      sourceCodeProvenance: source ?? null,
    }),
  closeSourceCodeDialog: () =>
    set({ isSourceCodeOpen: false, sourceCodeFilepath: null, sourceCodeProvenance: null }),
  setNotification: notification => set({ notification }),
  setLayoutEngine: engine => set({ layoutEngine: engine }),
  setFocusedCyclePath: path => set({ focusedCyclePath: path }),
  setIsLoading: loading => set({ isLoading: loading }),
});
