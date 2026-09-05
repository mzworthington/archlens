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
import { NameBlankWorkspaceDialog } from '../components/NameBlankWorkspaceDialog/NameBlankWorkspaceDialog';
import { GOLDEN_JOURNEY_ENTITY_REF } from '../../../../application/store/samplesWorkspace';
import { buildChaosLensUrl } from '../../../../application/resilience/chaosLensUrl';
import { navigateToActiveWorkspaceEntity } from './navigateToActiveWorkspaceEntity';
import { useBlueprintStore } from '../../../../application/store/store';
import { markFolderWorkspacePreferred } from '../../../../application/store/workspaceOpenSession';
import {
  EMPTY_WORKSPACE_ENTITY_REF,
  EMPTY_WORKSPACE_PATH,
} from '../../../../application/store/states/diagramState/resetToEmptyWorkspace';
import { buildWorkspaceEntityHref } from '../../../../application/store/sandboxWorkspace';
import { persistBlankCanvasSessionFromSchema } from '../../../../application/store/states/ioState/blankCanvasSession';
import { shouldPromptSaveBeforeShare } from '../../../../application/store/states/ioState/blankWorkspacePlacement';
import { collabShareAudience } from '../../../../application/collab/collabShareAudience';
import { LazyMountOnOpen } from '../components/LazyMountOnOpen';
import { useCollabShareSession } from './useCollabShareSession';
import React, { useCallback, useState } from 'react';
import { useLocation } from 'wouter';

function folderPickerAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

export function useWorkspaceDialogs(): React.ReactNode {
  const [, setLocation] = useLocation();
  const collabShare = useCollabShareSession();
  const [nameBlankOpen, setNameBlankOpen] = useState(false);
  const [shareAfterNamed, setShareAfterNamed] = useState(false);
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
    updateSchemaName,
    saveSchema,
    saveBlankCanvasToFolder,
    setNotification,
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

  const openNamedBlankCanvas = useCallback(
    async (name: string, placement: 'file' | 'folder' | 'unsaved') => {
      markFolderWorkspacePreferred();
      resetToEmptyWorkspace();
      updateSchemaName(name);
      setLocation(buildWorkspaceEntityHref(EMPTY_WORKSPACE_ENTITY_REF), { replace: true });

      if (placement === 'file') {
        const saved = await saveSchema();
        if (!saved) return false;
      } else if (placement === 'folder') {
        const saved = await saveBlankCanvasToFolder();
        if (!saved) return false;
      } else {
        persistBlankCanvasSessionFromSchema(
          EMPTY_WORKSPACE_PATH,
          useBlueprintStore.getState().schema,
          'unsaved'
        );
      }

      setNameBlankOpen(false);
      setIsStartupOpen(false);
      if (shareAfterNamed) {
        setShareAfterNamed(false);
        if (shouldPromptSaveBeforeShare(placement)) {
          setNotification({
            type: 'warning',
            title: 'Save before you share',
            message: 'Download or save the diagram first so you have a copy you can keep.',
          });
        } else {
          collabShare.openShareDialog();
        }
      }
      return true;
    },
    [
      collabShare,
      resetToEmptyWorkspace,
      saveBlankCanvasToFolder,
      saveSchema,
      setIsStartupOpen,
      setLocation,
      setNotification,
      shareAfterNamed,
      updateSchemaName,
    ]
  );

  const handleStartBlankCanvas = useCallback(() => {
    setShareAfterNamed(false);
    setNameBlankOpen(true);
  }, []);

  const handleShareBlankCanvas = useCallback(() => {
    setShareAfterNamed(true);
    setNameBlankOpen(true);
  }, []);

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
      <NameBlankWorkspaceDialog
        isOpen={nameBlankOpen}
        folderSaveAvailable={folderPickerAvailable()}
        busy={Boolean(isLoading)}
        onSaveFile={name => {
          void openNamedBlankCanvas(name, 'file');
        }}
        onSaveFolder={name => {
          void openNamedBlankCanvas(name, 'folder');
        }}
        onContinueUnsaved={name => {
          void openNamedBlankCanvas(name, 'unsaved');
        }}
        onCancel={() => {
          setNameBlankOpen(false);
          setShareAfterNamed(false);
        }}
      />
      <CollabShareDialog
        isOpen={collabShare.shareOpen}
        initialName={collabShare.initialName}
        participants={collabShare.participants}
        canEndRoom={collabShare.canEndRoom}
        audience={collabShareAudience(import.meta.env.VITE_COLLAB_WS_URL)}
        onCopyLink={collabShare.handleCopyLink}
        onSaveName={collabShare.onSaveName}
        onEndRoom={collabShare.handleEndRoom}
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
