import React, { useCallback } from 'react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import { LazyMountOnOpen } from '../components/LazyMountOnOpen';
import { GOLDEN_JOURNEY_ENTITY_REF } from '../../../../application/store/goldenPathsSample';
import { buildWorkspaceEntityHref } from '../../../../application/store/sandboxWorkspace';
import { DiffMenu } from '../components/DiffMenu/DiffMenu';
import { ImportMermaidDialog } from '../components/ImportMermaidDialog/ImportMermaidDialog';
import { ChaosSpecDialog } from '../components/ChaosSpecDialog/ChaosSpecDialog';
import { ImportIacDialog } from '../components/ImportIacDialog/ImportIacDialog';
import { StartupWorkspaceDialog } from '../components/StartupWorkspaceDialog/StartupWorkspaceDialog';
import { CompareDialog } from '../components/CompareDialog/CompareDialog';
import { KeyboardShortcutsDialog } from '../components/KeyboardShortcutsDialog/KeyboardShortcutsDialog';
import { WorkspaceDisplayDialog } from '../components/WorkspaceDisplayDialog/WorkspaceDisplayDialog';
import { ChildLevelExternalsDialog } from '../components/ChildLevelExternalsDialog/ChildLevelExternalsDialog';
import { WorkspaceSourceCodeDialog } from '../components/SourceCodeDialog/WorkspaceSourceCodeDialog';

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
    isStartupOpen,
    setIsStartupOpen,
    isCompareOpen,
    setIsCompareOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    isDisplaySettingsOpen,
    setIsDisplaySettingsOpen,
    childExternalsParentRef,
    isSourceCodeOpen,
    openWorkspaceDirectory,
    openBundledSample,
  } = useBlueprintStore();

  const handleOpenSample = useCallback(async () => {
    const opened = await openBundledSample();
    if (!opened) return;

    setIsStartupOpen(false);
    setLocation(buildWorkspaceEntityHref(GOLDEN_JOURNEY_ENTITY_REF), { replace: true });
  }, [openBundledSample, setIsStartupOpen, setLocation]);

  const handleOpenDirectory = useCallback(async () => {
    try {
      const opened = await openWorkspaceDirectory();
      if (opened) setIsStartupOpen(false);
    } catch (err) {
      console.error('Failed to open workspace directory:', err);
    }
  }, [openWorkspaceDirectory, setIsStartupOpen]);

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
      {isStartupOpen ? (
        <StartupWorkspaceDialog
          isOpen={isStartupOpen}
          onOpenSample={() => void handleOpenSample()}
          onOpenDirectory={() => void handleOpenDirectory()}
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
      <LazyMountOnOpen isOpen={isDisplaySettingsOpen}>
        <WorkspaceDisplayDialog
          isOpen={isDisplaySettingsOpen}
          onClose={() => setIsDisplaySettingsOpen(false)}
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
