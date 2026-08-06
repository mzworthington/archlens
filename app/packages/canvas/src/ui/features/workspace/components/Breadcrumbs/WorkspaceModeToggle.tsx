import React from 'react';

type WorkspaceModeToggleProps = {
  isWorkspaceOpen: boolean;
  isSampleWorkspace: boolean;
  onEnableDemo: () => void;
  onEnableFolder: () => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Explicit Demo vs Folder workspace mode control for the breadcrumb trail.
 * Makes sample/demo mode visible and switchable without relying on the startup dialog.
 */
export const WorkspaceModeToggle: React.FC<WorkspaceModeToggleProps> = ({
  isWorkspaceOpen,
  isSampleWorkspace,
  onEnableDemo,
  onEnableFolder,
  disabled = false,
  className = '',
}) => {
  if (!isWorkspaceOpen) return null;

  return (
    <div
      role="group"
      aria-label="Workspace mode"
      data-testid="workspace-mode-toggle"
      className={`inline-flex items-stretch overflow-hidden rounded-md border border-slate-800 bg-slate-950/80 ${className}`}
    >
      <button
        type="button"
        data-testid="workspace-mode-demo"
        aria-pressed={isSampleWorkspace}
        disabled={disabled || isSampleWorkspace}
        onClick={onEnableDemo}
        title="Bundled demo blueprints — save downloads YAML; drafts live in browser storage"
        className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/50 disabled:cursor-default ${
          isSampleWorkspace
            ? 'bg-amber-950/50 text-amber-200'
            : 'text-slate-500 hover:bg-slate-900 hover:text-slate-200 cursor-pointer'
        }`}
      >
        Demo
      </button>
      <button
        type="button"
        data-testid="workspace-mode-folder"
        aria-pressed={!isSampleWorkspace}
        disabled={disabled}
        onClick={onEnableFolder}
        title={
          isSampleWorkspace
            ? 'Open a local blueprint folder (writable YAML)'
            : 'Open a different local blueprint folder'
        }
        className={`border-l border-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/50 disabled:opacity-50 ${
          !isSampleWorkspace
            ? 'bg-emerald-950/45 text-emerald-300'
            : 'text-slate-500 hover:bg-slate-900 hover:text-slate-200 cursor-pointer'
        }`}
      >
        Folder
      </button>
    </div>
  );
};
