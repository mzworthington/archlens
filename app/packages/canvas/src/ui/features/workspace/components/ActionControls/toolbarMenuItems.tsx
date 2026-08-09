import React from 'react';
import { Cloud, Download, Folder, GitMerge, ScanSearch, ShieldAlert, Upload } from 'lucide-react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../../application/store/store';
import { navigateToActiveWorkspaceEntity } from '../../hooks/navigateToActiveWorkspaceEntity';

export type ToolbarOpenMenuItemsProps = {
  menuItemClass: string;
  onClose: () => void;
  disabled: boolean;
  /** Suffix for ChaosSpec action ids (overflow menu uses `-overflow`). */
  idSuffix?: '' | '-overflow';
  /** data-testid for Browse ChaosSpecs (overflow uses a distinct id). */
  browseTestId?: string;
};

/**
 * Shared Open Folder / File / Import / ChaosSpec items used by
 * ToolbarOpenMenu and ToolbarOverflowMenu.
 */
export const ToolbarOpenMenuItems: React.FC<ToolbarOpenMenuItemsProps> = ({
  menuItemClass,
  onClose,
  disabled,
  idSuffix = '',
  browseTestId = 'browse-chaos-spec-action',
}) => {
  const [, setLocation] = useLocation();
  const isWorkspaceOpen = useBlueprintStore(s => s.isWorkspaceOpen);
  const schema = useBlueprintStore(s => s.schema);
  const setIsImportMermaidOpen = useBlueprintStore(s => s.setIsImportMermaidOpen);
  const setIsImportIacOpen = useBlueprintStore(s => s.setIsImportIacOpen);
  const openChaosSpecDialog = useBlueprintStore(s => s.openChaosSpecDialog);
  const openChaosSpecPicker = useBlueprintStore(s => s.openChaosSpecPicker);
  const resilienceFaults = useBlueprintStore(s => s.resilienceFaults);
  const isResilienceMode = useBlueprintStore(s => s.isResilienceMode);
  const openWorkspaceDirectory = useBlueprintStore(s => s.openWorkspaceDirectory);
  const openBrowserLiteScan = useBlueprintStore(s => s.openBrowserLiteScan);
  const loadSchema = useBlueprintStore(s => s.loadSchema);
  const setIsStartupOpen = useBlueprintStore(s => s.setIsStartupOpen);

  const folderTitle = isWorkspaceOpen
    ? 'Open another folder workspace'
    : 'Open a local directory workspace';

  const handleOpenFolder = async () => {
    try {
      const opened = await openWorkspaceDirectory();
      if (!opened) return;
      setIsStartupOpen(false);
      navigateToActiveWorkspaceEntity(setLocation);
    } catch (err) {
      console.error('Failed to open workspace directory:', err);
    }
  };

  const handleBrowserLiteScan = async () => {
    try {
      const opened = await openBrowserLiteScan();
      if (!opened) return;
      setIsStartupOpen(false);
      navigateToActiveWorkspaceEntity(setLocation);
    } catch (err) {
      console.error('Failed to run browser lite scan:', err);
    }
  };

  const handleLoad = async () => {
    try {
      await loadSchema();
    } catch (err) {
      console.error('Failed to load schema:', err);
    }
  };

  const ensureResilienceMode = () => {
    if (!isResilienceMode) {
      useBlueprintStore.getState().setResilienceMode(true);
    }
  };

  return (
    <>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          void handleBrowserLiteScan();
        }}
        disabled={disabled}
        className={menuItemClass}
        title="Scan a local source folder in the browser (structure only)"
        id={`browser-lite-scan-action${idSuffix}`}
        data-testid={`browser-lite-scan-action${idSuffix}`}
      >
        <ScanSearch className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
        Scan Repo in Browser
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          void handleOpenFolder();
        }}
        disabled={disabled}
        className={menuItemClass}
        title={folderTitle}
      >
        <Folder className="w-3.5 h-3.5 text-brand-500 shrink-0" />
        Open Folder
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          void handleLoad();
        }}
        disabled={disabled}
        className={menuItemClass}
        title="Open single YAML from disk"
      >
        <Upload className="w-3.5 h-3.5 shrink-0" />
        Open File
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          setIsImportMermaidOpen(true);
        }}
        disabled={disabled || !schema}
        className={menuItemClass}
        title="Import Mermaid diagram into the active schema"
        id="import-mermaid-action"
      >
        <GitMerge className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
        Import Mermaid
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          setIsImportIacOpen(true);
        }}
        disabled={disabled || !schema}
        className={menuItemClass}
        title="Import Terraform or Pulumi into the active schema"
        id="import-iac-action"
      >
        <Cloud className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
        Import Infrastructure
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          openChaosSpecPicker();
        }}
        disabled={disabled || !isWorkspaceOpen}
        className={menuItemClass}
        title="Browse bundled and workspace ChaosSpecs; opens the target diagram in ChaosLens"
        id={`browse-chaos-spec-action${idSuffix}`}
        data-testid={browseTestId}
      >
        <ShieldAlert className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
        Browse ChaosSpecs
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          ensureResilienceMode();
          openChaosSpecDialog('import');
        }}
        disabled={disabled || !schema}
        className={menuItemClass}
        title="Load a ChaosSpec YAML scenario for ChaosLens"
        id={`import-chaos-spec-action${idSuffix}`}
      >
        <ShieldAlert className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
        Load ChaosSpec
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          ensureResilienceMode();
          openChaosSpecDialog('export');
        }}
        disabled={disabled || !schema || resilienceFaults.length === 0}
        className={menuItemClass}
        title="Export the active ChaosLens scenario as ChaosSpec YAML"
        id={`export-chaos-spec-action${idSuffix}`}
      >
        <Download className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
        Export ChaosSpec
      </button>
    </>
  );
};
