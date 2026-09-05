import React from 'react';
import { FolderOpen, Share2, Upload, Users } from 'lucide-react';
import { WorkspaceEntryOption } from './WorkspaceEntryOption';
import { WorkspaceIntentCard } from './WorkspaceIntentCard';
import { intentHeadingIconClass } from './workspaceEntryChrome';

export type WorkspaceCollaborateChoicesProps = {
  actionsDisabled: boolean;
  onShareBlankCanvas?: () => void;
  onShareDirectory?: () => void;
  onShareFile?: () => void;
};

export const WorkspaceCollaborateChoices: React.FC<WorkspaceCollaborateChoicesProps> = ({
  actionsDisabled,
  onShareBlankCanvas,
  onShareDirectory,
  onShareFile,
}) => {
  if (!onShareBlankCanvas && !onShareDirectory && !onShareFile) return null;

  return (
    <WorkspaceIntentCard
      testId="workspace-intent-collaborate"
      titleId="workspace-intent-collaborate-title"
      title="Collaborate"
      subtitle="Share a canvas with others"
      icon={<Users className={intentHeadingIconClass} aria-hidden />}
    >
      {onShareBlankCanvas ? (
        <WorkspaceEntryOption
          testId="workspace-share-blank"
          onClick={onShareBlankCanvas}
          disabled={actionsDisabled}
          icon={<Share2 className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />}
          title="Share blank room"
          description="Empty canvas with a live editing link"
        />
      ) : null}
      {onShareDirectory ? (
        <WorkspaceEntryOption
          testId="workspace-share-directory"
          onClick={onShareDirectory}
          disabled={actionsDisabled}
          icon={<FolderOpen className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />}
          title="Open folder then share"
          description="Load blueprints locally, then create a share link"
        />
      ) : null}
      {onShareFile ? (
        <WorkspaceEntryOption
          testId="workspace-share-file"
          onClick={onShareFile}
          disabled={actionsDisabled}
          icon={<Upload className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />}
          title="Open file then share"
          description="Load a YAML blueprint, then create a share link"
        />
      ) : null}
    </WorkspaceIntentCard>
  );
};
