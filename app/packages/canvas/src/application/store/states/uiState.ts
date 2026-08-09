import type { BlueprintState } from '../store';
import type { LayoutEngineId } from '../../../core';
import type { ExternalSummaryBand, SourceProvenance } from '@archlens/core';
import type { DependencyViewMode } from '../../forensics/dependencyViewMode';
import type { LeftSlotPanelId } from '../../layout/workspacePanels';
import { toggleDependencyViewMode } from '../../forensics/dependencyViewMode';

export type { DependencyViewMode };

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastNotification {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title?: string;
  actions?: ToastAction[];
}

export interface UiState {
  showTests: boolean;
  showUpstreamExternals: boolean;
  showDownstreamExternals: boolean;
  dependencyViewMode: DependencyViewMode;
  showCoupling: boolean;
  showCouplingSchemaDeps: boolean;
  guidedRefactorEntityRefs: string[] | null;
  showHotspotHeatmap: boolean;
  liteCanvas: boolean;
  layoutEngine: LayoutEngineId | null;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  activeLeftPanel: LeftSlotPanelId;
  setActiveLeftPanel: (panel: LeftSlotPanelId) => void;
  showDesignSystem: boolean;
  isDiffOpen: boolean;
  isImportMermaidOpen: boolean;
  isImportIacOpen: boolean;
  isStartupOpen: boolean;
  isCompareOpen: boolean;
  isShortcutsOpen: boolean;
  childExternalsParentRef: string | null;
  expandedExternalHub: ExternalSummaryBand | null;
  isSourceCodeOpen: boolean;
  sourceCodeFilepath: string | null;
  sourceCodeProvenance: SourceProvenance | null;
  notification: ToastNotification | null;
  mermaidEnrichBannerOpen: boolean;
  /** Sticky reminder after a browser lite scan - graduate to CLI for forensics. */
  browserLiteBannerOpen: boolean;
  focusedCyclePath: string[] | null;
  isLoading: boolean | string;
  diagramLoadCount: number;
  toggleShowTests: () => void;
  toggleShowUpstreamExternals: () => void;
  toggleShowDownstreamExternals: () => void;
  setShowUpstreamExternals: (show: boolean) => void;
  setShowDownstreamExternals: (show: boolean) => void;
  setDependencyViewMode: (mode: DependencyViewMode) => void;
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
  openChildLevelExternals: (parentEntityRef: string) => void;
  closeChildLevelExternals: () => void;
  setExpandedExternalHub: (band: ExternalSummaryBand | null) => void;
  openSourceCodeDialog: (filepath: string, source?: SourceProvenance) => void;
  closeSourceCodeDialog: () => void;
  setNotification: (notification: ToastNotification | null) => void;
  setMermaidEnrichBannerOpen: (open: boolean) => void;
  setBrowserLiteBannerOpen: (open: boolean) => void;
  setLayoutEngine: (engine: LayoutEngineId | null) => void;
  setFocusedCyclePath: (path: string[] | null) => void;
  setIsLoading: (loading: boolean | string) => void;
}

export const createUiState = (
  set: (
    partial: Partial<BlueprintState> | ((state: BlueprintState) => Partial<BlueprintState>)
  ) => void
): UiState => ({
  showTests: false,
  showUpstreamExternals: true,
  showDownstreamExternals: true,
  dependencyViewMode: 'focus',
  showCoupling: false,
  showCouplingSchemaDeps: false,
  guidedRefactorEntityRefs: null,
  showHotspotHeatmap: true,
  liteCanvas: false,
  layoutEngine: null,
  leftCollapsed: true,
  rightCollapsed: true,
  activeLeftPanel: 'codeViewer',
  showDesignSystem: false,
  isDiffOpen: false,
  isImportMermaidOpen: false,
  isImportIacOpen: false,
  isStartupOpen: true,
  isCompareOpen: false,
  isShortcutsOpen: false,
  childExternalsParentRef: null,
  expandedExternalHub: null,
  isSourceCodeOpen: false,
  sourceCodeFilepath: null,
  sourceCodeProvenance: null,
  notification: null,
  mermaidEnrichBannerOpen: false,
  browserLiteBannerOpen: false,
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
  setDependencyViewMode: mode => set({ dependencyViewMode: mode }),
  toggleShowSelectedDependenciesOnly: () =>
    set(state => ({
      dependencyViewMode: toggleDependencyViewMode(state.dependencyViewMode),
    })),
  toggleShowCoupling: () => set(state => ({ showCoupling: !state.showCoupling })),
  setShowCoupling: show => set({ showCoupling: show }),
  toggleShowCouplingSchemaDeps: () =>
    set(state => ({ showCouplingSchemaDeps: !state.showCouplingSchemaDeps })),
  setShowCouplingSchemaDeps: show => set({ showCouplingSchemaDeps: show }),
  setGuidedRefactorEntityRefs: entityRefs => set({ guidedRefactorEntityRefs: entityRefs }),
  toggleShowHotspotHeatmap: () => set(state => ({ showHotspotHeatmap: !state.showHotspotHeatmap })),
  toggleLiteCanvas: () => set(state => ({ liteCanvas: !state.liteCanvas })),
  setActiveLeftPanel: panel =>
    set({
      activeLeftPanel: panel,
      leftCollapsed: false,
      isTraceLensPanelOpen: true,
    }),
  toggleLeftCollapsed: () =>
    set(state => ({
      leftCollapsed: !state.leftCollapsed,
      ...(!state.leftCollapsed ? { isTraceLensPanelOpen: false } : { isTraceLensPanelOpen: true }),
    })),
  toggleRightCollapsed: () => set(state => ({ rightCollapsed: !state.rightCollapsed })),
  setShowDesignSystem: show => set({ showDesignSystem: show }),
  setIsDiffOpen: open => set({ isDiffOpen: open }),
  setIsImportMermaidOpen: open => set({ isImportMermaidOpen: open }),
  setIsImportIacOpen: open => set({ isImportIacOpen: open }),
  setIsStartupOpen: open =>
    set(state => (state.isStartupOpen === open ? state : { isStartupOpen: open })),
  setIsCompareOpen: open => set({ isCompareOpen: open }),
  setIsShortcutsOpen: open => set({ isShortcutsOpen: open }),
  openChildLevelExternals: parentEntityRef => set({ childExternalsParentRef: parentEntityRef }),
  closeChildLevelExternals: () => set({ childExternalsParentRef: null }),
  setExpandedExternalHub: band => set({ expandedExternalHub: band }),
  openSourceCodeDialog: (filepath, source) =>
    set({
      isSourceCodeOpen: true,
      sourceCodeFilepath: filepath,
      sourceCodeProvenance: source ?? null,
    }),
  closeSourceCodeDialog: () =>
    set({ isSourceCodeOpen: false, sourceCodeFilepath: null, sourceCodeProvenance: null }),
  setNotification: notification => set({ notification }),
  setMermaidEnrichBannerOpen: open => set({ mermaidEnrichBannerOpen: open }),
  setBrowserLiteBannerOpen: open => set({ browserLiteBannerOpen: open }),
  setLayoutEngine: engine => set({ layoutEngine: engine }),
  setFocusedCyclePath: path => set({ focusedCyclePath: path }),
  setIsLoading: loading => set({ isLoading: loading }),
});
