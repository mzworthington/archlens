import React, { useCallback } from 'react';
import {
  Download,
  RefreshCcw,
  GitCompare,
  Undo,
  Redo,
  MoreHorizontal,
  HelpCircle,
  Flag,
} from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';
import { FEATURE_FLAGS } from '../../../../../application/navigation/featureGate';
import { useToolbarMenu } from '../WorkspaceToolbar/useToolbarMenu';
import { ToolbarMenuPortal } from '../WorkspaceToolbar/ToolbarMenuPortal';
import { DiagramExportMenuItems } from '../WorkspaceToolbar/DiagramExportMenuItems';
import { ToolbarOpenMenuItems } from './toolbarMenuItems';

const iconBtnClass =
  'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 disabled:hover:text-slate-400 transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center';

const menuPanelClass =
  'min-w-[220px] rounded-xl border border-slate-900 bg-slate-950/95 py-1.5 shadow-2xl backdrop-blur-lg';

const menuItemClass =
  'w-full flex items-center gap-2 px-3 py-2.5 sm:py-2 text-xs font-semibold text-left text-slate-300 hover:bg-slate-900/60 hover:text-slate-100 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

function useControlsDisabled(): boolean {
  return Boolean(useBlueprintStore(s => s.isLoading));
}

function useSaveAction() {
  const isWorkspaceOpen = useBlueprintStore(s => s.isWorkspaceOpen);
  const saveSchema = useBlueprintStore(s => s.saveSchema);
  const saveActiveDiagram = useBlueprintStore(s => s.saveActiveDiagram);
  const controlsDisabled = useControlsDisabled();

  const handleSave = useCallback(async () => {
    if (isWorkspaceOpen) {
      await saveActiveDiagram();
    } else {
      await saveSchema();
    }
  }, [isWorkspaceOpen, saveActiveDiagram, saveSchema]);

  return { controlsDisabled, handleSave, isWorkspaceOpen };
}

function useClearAction() {
  const initSchema = useBlueprintStore(s => s.initSchema);
  const setIsLoading = useBlueprintStore(s => s.setIsLoading);
  const clearWorkspaceDrafts = useBlueprintStore(s => s.clearWorkspaceDrafts);
  const controlsDisabled = useControlsDisabled();

  const handleClear = useCallback(async () => {
    if (confirm('Clear the workspace, purge all IndexedDB drafts, and create a blank canvas?')) {
      setIsLoading('Cleaning workspace...');
      try {
        await clearWorkspaceDrafts();
      } finally {
        setIsLoading(false);
      }
      initSchema({
        name: 'Empty Workspace',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      });
    }
  }, [clearWorkspaceDrafts, initSchema, setIsLoading]);

  return { controlsDisabled, handleClear };
}

export const ToolbarShortcutsButton: React.FC = () => {
  const controlsDisabled = useControlsDisabled();
  const setIsShortcutsOpen = useBlueprintStore(s => s.setIsShortcutsOpen);

  return (
    <button
      type="button"
      onClick={() => setIsShortcutsOpen(true)}
      disabled={controlsDisabled}
      className={iconBtnClass}
      title="Keyboard shortcuts (?)"
      aria-label="Keyboard shortcuts"
      data-testid="toolbar-shortcuts"
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </button>
  );
};

export const ToolbarPendingChangesButton: React.FC = () => {
  const controlsDisabled = useControlsDisabled();
  const setIsDiffOpen = useBlueprintStore(s => s.setIsDiffOpen);
  const hasPendingChanges = useBlueprintStore(s => s.hasPendingChanges);

  if (!hasPendingChanges) return null;

  return (
    <button
      type="button"
      onClick={() => setIsDiffOpen(true)}
      disabled={controlsDisabled}
      className={`${iconBtnClass} text-amber-400 hover:text-amber-300 border-amber-900/40`}
      title="View pending local changes / diff"
      aria-label="Pending changes"
      id="view-pending-changes"
      data-testid="toolbar-pending-changes"
    >
      <GitCompare className="w-3.5 h-3.5" />
    </button>
  );
};

export const ToolbarEditActions: React.FC = () => {
  const controlsDisabled = useControlsDisabled();
  const undo = useBlueprintStore(s => s.undo);
  const redo = useBlueprintStore(s => s.redo);
  const past = useBlueprintStore(s => s.past);
  const future = useBlueprintStore(s => s.future);
  const collabActive = useBlueprintStore(s => s.collabSessionPort.isActive());
  const undoDisabled = past.length === 0 || controlsDisabled || collabActive;
  const redoDisabled = future.length === 0 || controlsDisabled || collabActive;

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={undo}
        disabled={undoDisabled}
        className={iconBtnClass}
        title={collabActive ? 'Undo is unavailable while sharing' : 'Undo (Cmd+Z / Ctrl+Z)'}
        id="undo-action"
      >
        <Undo className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={redo}
        disabled={redoDisabled}
        className={iconBtnClass}
        title={
          collabActive
            ? 'Redo is unavailable while sharing'
            : 'Redo (Cmd+Shift+Z / Ctrl+Shift+Z / Cmd+Y)'
        }
        id="redo-action"
      >
        <Redo className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToolbarOverflowMenu: React.FC = () => {
  const { controlsDisabled, handleClear } = useClearAction();
  const { controlsDisabled: saveDisabled, handleSave, isWorkspaceOpen } = useSaveAction();
  const setIsCompareOpen = useBlueprintStore(s => s.setIsCompareOpen);
  const setIsFeatureFlagsOpen = useBlueprintStore(s => s.setIsFeatureFlagsOpen);
  const loadedSystems = useBlueprintStore(s => s.loadedSystems);
  const { open, toggle, close, anchorRef, menuRef } = useToolbarMenu();

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        disabled={controlsDisabled}
        className={iconBtnClass}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="More actions"
        title="More actions"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      <ToolbarMenuPortal
        open={open}
        anchorRef={anchorRef}
        menuRef={menuRef}
        menuClassName={menuPanelClass}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            void handleSave();
          }}
          disabled={saveDisabled}
          className={menuItemClass}
          title={isWorkspaceOpen ? 'Save diagram directly in folder' : 'Save YAML to disk'}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          Save
        </button>

        <DiagramExportMenuItems menuItemClass={menuItemClass} onClose={close} />

        <ToolbarOpenMenuItems
          menuItemClass={menuItemClass}
          onClose={close}
          disabled={controlsDisabled}
          idSuffix="-overflow"
          browseTestId="browse-chaos-spec-action-overflow"
        />

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            setIsCompareOpen(true);
          }}
          disabled={controlsDisabled || loadedSystems.length < 2}
          className={menuItemClass}
          title="Compare two loaded systems"
          data-testid="toolbar-compare"
        >
          <GitCompare className="w-3.5 h-3.5 shrink-0" />
          Compare Systems
        </button>

        {FEATURE_FLAGS.length > 0 ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              setIsFeatureFlagsOpen(true);
            }}
            disabled={controlsDisabled}
            className={menuItemClass}
            title="Turn preview features on or off"
            data-testid="toolbar-feature-flags"
          >
            <Flag className="w-3.5 h-3.5 shrink-0" />
            Feature flags
          </button>
        ) : null}

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            void handleClear();
          }}
          disabled={controlsDisabled}
          className={`${menuItemClass} text-red-400 hover:text-red-300 hover:bg-red-950/20`}
          title="Clear canvas"
        >
          <RefreshCcw className="w-3.5 h-3.5 shrink-0" />
          Clear Canvas
        </button>
      </ToolbarMenuPortal>
    </div>
  );
};
