import React from 'react';

type WorkspaceStorageBadgeProps = {
  isWorkspaceOpen: boolean;
  className?: string;
};

/** Distinguishes demo sandbox (IndexedDB drafts) from on-disk folder workspaces. */
export const WorkspaceStorageBadge: React.FC<WorkspaceStorageBadgeProps> = ({
  isWorkspaceOpen,
  className = '',
}) => {
  if (isWorkspaceOpen) {
    return (
      <span
        className={`inline-flex items-center rounded-md border border-emerald-500/25 bg-emerald-950/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 ${className}`}
        data-testid="workspace-storage-badge"
        title="Changes commit to YAML files in your open folder"
      >
        Folder workspace
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border border-amber-500/25 bg-amber-950/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200 ${className}`}
      data-testid="workspace-storage-badge"
      title="Demo workspace — drafts live in browser storage, not on disk"
    >
      Demo (not on disk)
    </span>
  );
};
