import React from 'react';
import { WorkspaceEntryPanel } from '../../../../components/WorkspaceEntryPanel';

interface StartupWorkspaceDialogProps {
  isOpen: boolean;
  onOpenSample: () => void;
  onOpenDirectory: () => void;
  onBrowserLiteScan?: () => void;
  onImportMermaid?: () => void;
  onImportIac?: () => void;
  onStartBlankCanvas?: () => void;
  onShareBlankCanvas?: () => void;
  onShareDirectory?: () => void;
  onShareFile?: () => void;
  loadingMessage?: string | false | null;
}

/** First-run gate for bare `/workspace` - intent buckets then leaf actions. */
export const StartupWorkspaceDialog: React.FC<StartupWorkspaceDialogProps> = ({
  isOpen,
  onOpenSample,
  onOpenDirectory,
  onBrowserLiteScan,
  onImportMermaid,
  onImportIac,
  onStartBlankCanvas,
  onShareBlankCanvas,
  onShareDirectory,
  onShareFile,
  loadingMessage = null,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="startup-workspace-title"
      data-testid="startup-workspace-dialog"
    >
      <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
        <div className="pointer-events-auto w-full max-w-6xl my-auto bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl p-5">
          <WorkspaceEntryPanel
            layout="grid"
            onOpenSample={onOpenSample}
            onOpenDirectory={onOpenDirectory}
            onBrowserLiteScan={onBrowserLiteScan}
            onImportMermaid={onImportMermaid}
            onImportIac={onImportIac}
            onStartBlankCanvas={onStartBlankCanvas}
            onShareBlankCanvas={onShareBlankCanvas}
            onShareDirectory={onShareDirectory}
            onShareFile={onShareFile}
            loadingMessage={loadingMessage}
            showCliPanel
            titleId="startup-workspace-title"
          />
        </div>
      </div>
    </div>
  );
};
