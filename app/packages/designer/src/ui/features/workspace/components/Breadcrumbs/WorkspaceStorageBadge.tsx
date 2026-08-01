import React from 'react';

type WorkspaceStorageBadgeProps = {
  isWorkspaceOpen: boolean;
  isSampleWorkspace: boolean;
  className?: string;
};

/** Distinguishes folder workspaces from the bundled Golden Paths sample. */
export const WorkspaceStorageBadge: React.FC<WorkspaceStorageBadgeProps> = ({
  isWorkspaceOpen,
  isSampleWorkspace,
  className = '',
}) => {
  if (!isWorkspaceOpen) return null;

  if (isSampleWorkspace) {
    return (
      <span
        className={`inline-flex items-center rounded-md border border-amber-500/25 bg-amber-950/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200 ${className}`}
        data-testid="workspace-storage-badge"
        title="Bundled sample — save downloads YAML; drafts live in browser storage"
      >
        Sample
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border border-emerald-500/25 bg-emerald-950/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 ${className}`}
      data-testid="workspace-storage-badge"
      title="Changes commit to YAML files in your open folder"
    >
      Folder
    </span>
  );
};
