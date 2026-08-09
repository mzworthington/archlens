import { DiffMenu } from '../components/DiffMenu/DiffMenu';
import { ImportMermaidDialog } from '../components/ImportMermaidDialog/ImportMermaidDialog';
import { ChaosSpecDialog } from '../components/ChaosSpecDialog/ChaosSpecDialog';
import { ChaosSpecPickerDialog } from '../components/ChaosSpecPickerDialog/ChaosSpecPickerDialog';
import { ImportIacDialog } from '../components/ImportIacDialog/ImportIacDialog';
import { StartupWorkspaceDialog } from '../components/StartupWorkspaceDialog/StartupWorkspaceDialog';
import { CompareDialog } from '../components/CompareDialog/CompareDialog';
import { KeyboardShortcutsDialog } from '../components/KeyboardShortcutsDialog/KeyboardShortcutsDialog';
import { ChildLevelExternalsDialog } from '../components/ChildLevelExternalsDialog/ChildLevelExternalsDialog';
import { WorkspaceSourceCodeDialog } from '../components/SourceCodeDialog/WorkspaceSourceCodeDialog';
import { GOLDEN_JOURNEY_ENTITY_REF } from '../../../../application/store/samplesWorkspace';
import { buildChaosLensUrl } from '../../../../application/resilience/chaosLensUrl';
import { navigateToActiveWorkspaceEntity } from './navigateToActiveWorkspaceEntity';
import { useBlueprintStore } from '../../../../application/store/store';
import { LazyMountOnOpen } from '../components/LazyMountOnOpen';
import React, { useCallback } from 'react';
import { useLocation } from 'wouter';

export function useWorkspaceDialogs(): React.ReactNode {
  const [, setLocation] = useLocation();
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
    childExternalsParentRef,
    isSourceCodeOpen,
    isLoading,
    openWorkspaceDirectory,
    openBundledSample,
    openBrowserLiteScan,
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
          loadingMessage={
            typeof isLoading === 'string' ? isLoading : isLoading ? 'Loading...' : null
          }
        />
      ) : null}
      <LazyMountOnOpen isOpen={isCompareOpen}>
        <CompareDialog isOpen={isCompareOpen} onClose={() => setIsCompareOpen(false)} />
      </LazyMountOnOpen>
      <LazyMountOnOpen isOpen={isShortcutsOpen}>
        <KeyboardShortcutsDialog
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />
      </LazyMountOnOpen>
      <LazyMountOnOpen isOpen={childExternalsParentRef != null}>
        <ChildLevelExternalsDialog />
      </LazyMountOnOpen>
      <LazyMountOnOpen isOpen={isSourceCodeOpen}>
        <WorkspaceSourceCodeDialog />
      </LazyMountOnOpen>
    </>
  );
}
