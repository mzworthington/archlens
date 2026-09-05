import React from 'react';
import { FilePlus, GitMerge, Lightbulb } from 'lucide-react';
import {
  intentCardClass,
  intentHeadingIconClass,
  intentHeadingRowClass,
  intentHeadingTitleClass,
  optionClass,
} from './workspaceEntryStyles';

export type WorkspaceEntryBlankChooserProps = {
  onStartBlankCanvas?: () => void;
  onImportMermaid?: () => void;
  actionsDisabled: boolean;
};

export const WorkspaceEntryBlankChooser: React.FC<WorkspaceEntryBlankChooserProps> = ({
  onStartBlankCanvas,
  onImportMermaid,
  actionsDisabled,
}) => {
  if (!onStartBlankCanvas && !onImportMermaid) return null;

  return (
    <section
      className={intentCardClass}
      data-testid="workspace-intent-ideate"
      aria-labelledby="workspace-intent-ideate-title"
    >
      <div className={intentHeadingRowClass}>
        <Lightbulb className={intentHeadingIconClass} aria-hidden />
        <div>
          <h3 id="workspace-intent-ideate-title" className={intentHeadingTitleClass}>
            Ideate
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Sketch from scratch - solo; share later</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {onStartBlankCanvas ? (
          <button
            type="button"
            data-testid="workspace-start-blank"
            onClick={onStartBlankCanvas}
            disabled={actionsDisabled}
            className={optionClass}
          >
            <FilePlus className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-semibold text-slate-100">
                Start a blank canvas
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Draw or import when you are ready
              </span>
            </span>
          </button>
        ) : null}
        {onImportMermaid ? (
          <button
            type="button"
            data-testid="workspace-import-mermaid"
            onClick={onImportMermaid}
            disabled={actionsDisabled}
            className={optionClass}
          >
            <GitMerge className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-semibold text-slate-100">
                Import from Mermaid
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Paste or upload a Mermaid diagram
              </span>
            </span>
          </button>
        ) : null}
      </div>
    </section>
  );
};
