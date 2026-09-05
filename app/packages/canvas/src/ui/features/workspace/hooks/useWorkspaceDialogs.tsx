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
import { useBlueprintStore } from '../../../../application/store/store';
import { LazyMountOnOpen } from '../components/LazyMountOnOpen';
import { useWorkspaceBlankEntry } from './useWorkspaceBlankEntry';
import { useWorkspaceCopyEntry } from './useWorkspaceCopyEntry';
import { useWorkspacePersistEntry } from './useWorkspacePersistEntry';
import React from 'react';

export function useWorkspaceDialogs(): React.ReactNode {
  const blankEntry = useWorkspaceBlankEntry();
  const persistEntry = useWorkspacePersistEntry({ startBlankCanvas: blankEntry.startBlankCanvas });
  const copyEntry = useWorkspaceCopyEntry({ startBlankCanvas: blankEntry.startBlankCanvas });
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
    cancelBrowserLiteScan,
  } = useBlueprintStore();

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
          onOpenSample={() => void persistEntry.openSample()}
          onOpenDirectory={() => void persistEntry.openDirectory()}
          onBrowserLiteScan={() => void persistEntry.openBrowserScan()}
          onImportMermaid={blankEntry.importMermaid}
          onImportIac={persistEntry.importIac}
          onStartBlankCanvas={blankEntry.startBlankCanvas}
          onShareBlankCanvas={copyEntry.shareBlankCanvas}
          onShareDirectory={() => void copyEntry.shareDirectory()}
          onShareFile={() => void copyEntry.shareFile()}
          loadingMessage={
            typeof isLoading === 'string' ? isLoading : isLoading ? 'Loading...' : null
          }
          scanProgress={liteScanProgress}
          onCancelScan={cancelBrowserLiteScan}
        />
      ) : null}
      <CollabShareDialog
        isOpen={copyEntry.collabShare.shareOpen}
        initialName={copyEntry.collabShare.initialName}
        participants={copyEntry.collabShare.participants}
        canEndRoom={copyEntry.collabShare.canEndRoom}
        onCopyLink={copyEntry.collabShare.handleCopyLink}
        onSaveName={copyEntry.collabShare.onSaveName}
        onEndRoom={copyEntry.collabShare.handleEndRoom}
        onCancel={copyEntry.collabShare.onCancelShare}
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
