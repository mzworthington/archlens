import React from 'react';
import { WorkspaceEntryPanel } from '../../../../components/WorkspaceEntryPanel';
import type { SandboxContextPath } from '../../../../../application/store/defaultData';

interface StartupWorkspaceDialogProps {
  isOpen: boolean;
  onLoadSandbox: (contextPath: SandboxContextPath) => void;
  onOpenDirectory: () => void;
}

/** First-run gate for bare `/workspace` — demo sandbox or a local folder. */
export const StartupWorkspaceDialog: React.FC<StartupWorkspaceDialogProps> = ({
  isOpen,
  onLoadSandbox,
  onOpenDirectory,
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
            onLoadSandbox={onLoadSandbox}
            onOpenDirectory={onOpenDirectory}
            showCliPanel
            titleId="startup-workspace-title"
          />
        </div>
      </div>
    </div>
  );
};
