import React from 'react';
import { WorkspaceEntryPanel } from '../../../../components/WorkspaceEntryPanel';

interface StartupWorkspaceDialogProps {
  isOpen: boolean;
  onOpenSample: () => void;
  onOpenDirectory: () => void;
  onBrowserLiteScan?: () => void;
  onImportMermaid?: () => void;
  onStartBlankCanvas?: () => void;
  loadingMessage?: string | false | null;
}

/** First-run gate for bare `/workspace` - demo, scan, folder, or blank canvas. */
export const StartupWorkspaceDialog: React.FC<StartupWorkspaceDialogProps> = ({
  isOpen,
  onOpenSample,
  onOpenDirectory,
  onBrowserLiteScan,
  onImportMermaid,
  onStartBlankCanvas,
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
        <div className="pointer-events-auto w-full max-w-lg my-auto bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl p-5">
          <WorkspaceEntryPanel
            onOpenSample={onOpenSample}
            onOpenDirectory={onOpenDirectory}
            onBrowserLiteScan={onBrowserLiteScan}
            onImportMermaid={onImportMermaid}
            onStartBlankCanvas={onStartBlankCanvas}
            loadingMessage={loadingMessage}
            showCliPanel
            titleId="startup-workspace-title"
          />
        </div>
      </div>
    </div>
  );
};
