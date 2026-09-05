import React from 'react';
import { FilePlus, GitMerge, Lightbulb } from 'lucide-react';
import { WorkspaceEntryOption } from './WorkspaceEntryOption';
import { WorkspaceIntentCard } from './WorkspaceIntentCard';
import { intentHeadingIconClass } from './workspaceEntryChrome';

export type WorkspaceIdeateChoicesProps = {
  actionsDisabled: boolean;
  onStartBlankCanvas?: () => void;
  onImportMermaid?: () => void;
};

export const WorkspaceIdeateChoices: React.FC<WorkspaceIdeateChoicesProps> = ({
  actionsDisabled,
  onStartBlankCanvas,
  onImportMermaid,
}) => {
  if (!onStartBlankCanvas && !onImportMermaid) return null;

  return (
    <WorkspaceIntentCard
      testId="workspace-intent-ideate"
      titleId="workspace-intent-ideate-title"
      title="Ideate"
      subtitle="Sketch from scratch - solo; share later"
      icon={<Lightbulb className={intentHeadingIconClass} aria-hidden />}
    >
      {onStartBlankCanvas ? (
        <WorkspaceEntryOption
          testId="workspace-start-blank"
          onClick={onStartBlankCanvas}
          disabled={actionsDisabled}
          icon={<FilePlus className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
          title="Start a blank canvas"
          description="Draw or import when you are ready"
        />
      ) : null}
      {onImportMermaid ? (
        <WorkspaceEntryOption
          testId="workspace-import-mermaid"
          onClick={onImportMermaid}
          disabled={actionsDisabled}
          icon={<GitMerge className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />}
          title="Import from Mermaid"
          description="Paste or upload a Mermaid diagram"
        />
      ) : null}
    </WorkspaceIntentCard>
  );
};
