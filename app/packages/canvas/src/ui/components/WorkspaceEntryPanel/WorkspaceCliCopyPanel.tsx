import React from 'react';
import { ArrowRight, Terminal } from 'lucide-react';
import { Link } from 'wouter';
import { CLI_GETTING_STARTED_PATH } from '../../../constants/cli';
import { CliCopyCommands } from '../CliCopyCommands/CliCopyCommands';

export type WorkspaceCliCopyPanelProps = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export const WorkspaceCliCopyPanel: React.FC<WorkspaceCliCopyPanelProps> = ({
  expanded,
  onExpandedChange,
}) => {
  return (
    <div
      className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3"
      data-testid="workspace-cli-panel"
    >
      <button
        type="button"
        className="w-full flex items-start gap-3 text-left cursor-pointer"
        onClick={() => onExpandedChange(!expanded)}
        aria-expanded={expanded}
        data-testid="workspace-cli-panel-toggle"
      >
        <Terminal className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-100">
              Full analysis - ArchLens CLI
            </span>
            <span className="inline-flex items-center rounded border border-emerald-500/40 bg-emerald-950/80 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-emerald-300">
              Recommended
            </span>
          </span>
          <span className="block text-xs text-slate-400 mt-1 leading-relaxed">
            TraceLens git hotspots, watch mode and CI catalog publish.
          </span>
        </span>
        <ArrowRight
          className={`w-4 h-4 text-slate-500 shrink-0 mt-1 transition ${expanded ? 'rotate-90' : ''}`}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="mt-3 ml-7 space-y-3" data-testid="workspace-cli-panel-body">
          <CliCopyCommands testIdPrefix="workspace-cli" />
          <Link
            href={CLI_GETTING_STARTED_PATH}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00f0ff] hover:text-cyan-300 transition"
            data-testid="workspace-cli-install-guide"
          >
            Install guide
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : null}
    </div>
  );
};
