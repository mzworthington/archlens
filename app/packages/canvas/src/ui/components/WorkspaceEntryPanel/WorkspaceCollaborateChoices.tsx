import React from 'react';
import { FolderOpen, Share2, Upload, Users } from 'lucide-react';
import { WorkspaceEntryOption } from './WorkspaceEntryOption';
import { WorkspaceIntentCard } from './WorkspaceIntentCard';
import {
  intentHeadingIconClass,
  splitOptionHalfClass,
  splitOptionShellClass,
} from './workspaceEntryChrome';

export type WorkspaceCollaborateChoicesProps = {
  actionsDisabled: boolean;
  onShareBlankCanvas?: () => void;
  onShareDirectory?: () => void;
  onShareFile?: () => void;
};

const ShareSplitHalf: React.FC<{
  testId: string;
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  ariaLabel: string;
}> = ({ testId, onClick, disabled, icon, title, description, ariaLabel }) => (
  <button
    type="button"
    data-testid={testId}
    onClick={onClick}
    disabled={disabled}
    className={splitOptionHalfClass}
    aria-label={ariaLabel}
  >
    {icon}
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-slate-100">{title}</span>
      <span className="block text-xs text-slate-500 mt-0.5">{description}</span>
    </span>
  </button>
);

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
      {onShareDirectory && onShareFile ? (
        <div
          className={splitOptionShellClass}
          role="group"
          aria-label="Open then share"
          data-testid="workspace-share-open"
        >
          <ShareSplitHalf
            testId="workspace-share-directory"
            onClick={onShareDirectory}
            disabled={actionsDisabled}
            icon={<FolderOpen className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" aria-hidden />}
            title="Folder"
            description="Blueprints directory"
            ariaLabel="Open folder then share"
          />
          <div className="w-px shrink-0 bg-slate-800" aria-hidden />
          <ShareSplitHalf
            testId="workspace-share-file"
            onClick={onShareFile}
            disabled={actionsDisabled}
            icon={<Upload className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" aria-hidden />}
            title="File"
            description="YAML blueprint"
            ariaLabel="Open file then share"
          />
        </div>
      ) : (
        <>
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
        </>
      )}
    </WorkspaceIntentCard>
  );
};
