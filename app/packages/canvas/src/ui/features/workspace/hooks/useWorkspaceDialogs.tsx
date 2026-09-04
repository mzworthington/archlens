import { DiffMenu } from '../components/DiffMenu/DiffMenu';
import { ImportMermaidDialog } from '../components/ImportMermaidDialog/ImportMermaidDialog';
import { ChaosSpecDialog } from '../components/ChaosSpecDialog/ChaosSpecDialog';
import { ChaosSpecPickerDialog } from '../components/ChaosSpecPickerDialog/ChaosSpecPickerDialog';
import { ImportIacDialog } from '../components/ImportIacDialog/ImportIacDialog';
import { StartupWorkspaceDialog } from '../components/StartupWorkspaceDialog/StartupWorkspaceDialog';
import { CompareDialog } from '../components/CompareDialog/CompareDialog';
import { KeyboardShortcutsDialog } from '../components/KeyboardShortcutsDialog/KeyboardShortcutsDialog';
import { FeatureFlagsDialog } from '../components/FeatureFlagsDialog/FeatureFlagsDialog';
import { ChildLevelExternalsDialog } from '../components/ChildLevelExternalsDialog/ChildLevelExternalsDialog';
import { WorkspaceSourceCodeDialog } from '../components/SourceCodeDialog/WorkspaceSourceCodeDialog';
import { ValidationDialog } from '../components/ValidationDialog/ValidationDialog';
import { CollabShareDialog } from '../components/CollabShareDialog/CollabShareDialog';
import { GOLDEN_JOURNEY_ENTITY_REF } from '../../../../application/store/samplesWorkspace';
import { buildChaosLensUrl } from '../../../../application/resilience/chaosLensUrl';
import { navigateToActiveWorkspaceEntity } from './navigateToActiveWorkspaceEntity';
import { useBlueprintStore } from '../../../../application/store/store';
import { markFolderWorkspacePreferred } from '../../../../application/store/workspaceOpenSession';
import { EMPTY_WORKSPACE_ENTITY_REF } from '../../../../application/store/states/diagramState/resetToEmptyWorkspace';
import { buildWorkspaceEntityHref } from '../../../../application/store/sandboxWorkspace';
import { LazyMountOnOpen } from '../components/LazyMountOnOpen';
import { useCollabShareSession } from './useCollabShareSession';
import React, { useCallback } from 'react';
import { useLocation } from 'wouter';

export function useWorkspaceDialogs(): React.ReactNode {
  const [, setLocation] = useLocation();
  const collabShare = useCollabShareSession();
  const {
    isDiffOpen,
    setIsDiffOpen,
    isImportMermaidOpen,
    setIsImportMermaidOpen,
    isImportIacOpen,
    setIsImportIacOpen,
    chaosSpecDialogMode,
    openChaosSpecDialog,
    closeChaosSpecDialog,
    isChaosSpecPickerOpen,
    closeChaosSpecPicker,
    isStartupOpen,
    setIsStartupOpen,
    isCompareOpen,
    setIsCompareOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    isFeatureFlagsOpen,
    setIsFeatureFlagsOpen,
    childExternalsParentRef,
    isSourceCodeOpen,
    isLoading,
    liteScanProgress,
    openWorkspaceDirectory,
    openBundledSample,
    openBrowserLiteScan,
    cancelBrowserLiteScan,
    resetToEmptyWorkspace,
    loadSchema,
  } = useBlueprintStore();

  const handleOpenSample = useCallback(async () => {
    const opened = await openBundledSample();
    if (!opened) return;

    setIsStartupOpen(false);
    // Insight path: ChaosLens on the golden journey estate.
    setLocation(buildChaosLensUrl(GOLDEN_JOURNEY_ENTITY_REF), { replace: true });
  }, [openBundledSample, setIsStartupOpen, setLocation]);

  const handleOpenDirectory = useCallback(async () => {
    try {
      const opened = await openWorkspaceDirectory();
      if (!opened) return;
      setIsStartupOpen(false);
      navigateToActiveWorkspaceEntity(setLocation);
    } catch (err) {
      console.error('Failed to open workspace directory:', err);
    }
  }, [openWorkspaceDirectory, setIsStartupOpen, setLocation]);

  const handleBrowserLiteScan = useCallback(async () => {
    try {
      const opened = await openBrowserLiteScan();
      if (!opened) return;
      setIsStartupOpen(false);
      navigateToActiveWorkspaceEntity(setLocation);
    } catch (err) {
      console.error('Failed to run browser lite scan:', err);
    }
  }, [openBrowserLiteScan, setIsStartupOpen, setLocation]);

  const handleImportMermaid = useCallback(() => {
    markFolderWorkspacePreferred();
    resetToEmptyWorkspace();
    setIsStartupOpen(false);
    setLocation(buildWorkspaceEntityHref(EMPTY_WORKSPACE_ENTITY_REF), { replace: true });
    setIsImportMermaidOpen(true);
  }, [resetToEmptyWorkspace, setIsStartupOpen, setIsImportMermaidOpen, setLocation]);

  const handleImportIac = useCallback(() => {
    markFolderWorkspacePreferred();
    resetToEmptyWorkspace();
    setIsStartupOpen(false);
    setLocation(buildWorkspaceEntityHref(EMPTY_WORKSPACE_ENTITY_REF), { replace: true });
    setIsImportIacOpen(true);
  }, [resetToEmptyWorkspace, setIsStartupOpen, setIsImportIacOpen, setLocation]);

  const handleStartBlankCanvas = useCallback(() => {
    // Treat as an explicit non-demo choice so deep-link bootstrap does not force the sample.
    markFolderWorkspacePreferred();
    resetToEmptyWorkspace();
    setIsStartupOpen(false);
    setLocation(buildWorkspaceEntityHref(EMPTY_WORKSPACE_ENTITY_REF), { replace: true });
  }, [resetToEmptyWorkspace, setIsStartupOpen, setLocation]);

  const handleShareBlankCanvas = useCallback(() => {
    markFolderWorkspacePreferred();
    resetToEmptyWorkspace();
    setIsStartupOpen(false);
    setLocation(buildWorkspaceEntityHref(EMPTY_WORKSPACE_ENTITY_REF), { replace: true });
    collabShare.openShareDialog();
  }, [collabShare, resetToEmptyWorkspace, setIsStartupOpen, setLocation]);

  const handleShareDirectory = useCallback(async () => {
    try {
      const opened = await openWorkspaceDirectory();
      if (!opened) return;
      setIsStartupOpen(false);
      navigateToActiveWorkspaceEntity(setLocation);
      collabShare.openShareDialog();
    } catch (err) {
      console.error('Failed to open workspace directory for share:', err);
    }
  }, [collabShare, openWorkspaceDirectory, setIsStartupOpen, setLocation]);

  const handleShareFile = useCallback(async () => {
    try {
      const opened = await loadSchema();
      if (!opened) return;
      setIsStartupOpen(false);
      collabShare.openShareDialog();
    } catch (err) {
      console.error('Failed to open file for share:', err);
    }
  }, [collabShare, loadSchema, setIsStartupOpen]);

  return (
    <>
      <LazyMountOnOpen isOpen={isDiffOpen}>
        <DiffMenu isOpen={isDiffOpen} onClose={() => setIsDiffOpen(false)} />
      </LazyMountOnOpen>
      <LazyMountOnOpen isOpen={isImportMermaidOpen}>
        <ImportMermaidDialog
          isOpen={isImportMermaidOpen}
          onClose={() => setIsImportMermaidOpen(false)}
        />
      </LazyMountOnOpen>
      <LazyMountOnOpen isOpen={isImportIacOpen}>
        <ImportIacDialog isOpen={isImportIacOpen} onClose={() => setIsImportIacOpen(false)} />
      </LazyMountOnOpen>
      <LazyMountOnOpen isOpen={chaosSpecDialogMode != null}>
        <ChaosSpecDialog
          isOpen={chaosSpecDialogMode != null}
          mode={chaosSpecDialogMode ?? 'import'}
          onModeChange={openChaosSpecDialog}
          onClose={closeChaosSpecDialog}
        />
      </LazyMountOnOpen>
      <LazyMountOnOpen isOpen={isChaosSpecPickerOpen}>
        <ChaosSpecPickerDialog isOpen={isChaosSpecPickerOpen} onClose={closeChaosSpecPicker} />
      </LazyMountOnOpen>
      {isStartupOpen ? (
        <StartupWorkspaceDialog
          isOpen={isStartupOpen}
          onOpenSample={() => void handleOpenSample()}
          onOpenDirectory={() => void handleOpenDirectory()}
          onBrowserLiteScan={() => void handleBrowserLiteScan()}
          onImportMermaid={handleImportMermaid}
          onImportIac={handleImportIac}
          onStartBlankCanvas={handleStartBlankCanvas}
          onShareBlankCanvas={handleShareBlankCanvas}
          onShareDirectory={() => void handleShareDirectory()}
          onShareFile={() => void handleShareFile()}
          loadingMessage={
            typeof isLoading === 'string' ? isLoading : isLoading ? 'Loading...' : null
          }
          scanProgress={liteScanProgress}
          onCancelScan={cancelBrowserLiteScan}
        />
      ) : null}
      <CollabShareDialog
        isOpen={collabShare.shareOpen}
        initialName={collabShare.initialName}
        participants={collabShare.participants}
        onCopyLink={collabShare.handleCopyLink}
        onSaveName={collabShare.onSaveName}
        onCancel={collabShare.onCancelShare}
      />
      <LazyMountOnOpen isOpen={isCompareOpen}>
        <CompareDialog isOpen={isCompareOpen} onClose={() => setIsCompareOpen(false)} />
      </LazyMountOnOpen>
      <LazyMountOnOpen isOpen={isShortcutsOpen}>
        <KeyboardShortcutsDialog
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />
      </LazyMountOnOpen>
      <LazyMountOnOpen isOpen={isFeatureFlagsOpen}>
        <FeatureFlagsDialog
          isOpen={isFeatureFlagsOpen}
          onClose={() => setIsFeatureFlagsOpen(false)}
        />
      </LazyMountOnOpen>
      <LazyMountOnOpen isOpen={childExternalsParentRef != null}>
        <ChildLevelExternalsDialog />
      </LazyMountOnOpen>
      <LazyMountOnOpen isOpen={isSourceCodeOpen}>
        <WorkspaceSourceCodeDialog />
      </LazyMountOnOpen>
      <LazyMountOnOpen isOpen={useBlueprintStore(s => s.isValidationOpen)}>
        <ValidationDialog />
      </LazyMountOnOpen>
    </>
  );
}
