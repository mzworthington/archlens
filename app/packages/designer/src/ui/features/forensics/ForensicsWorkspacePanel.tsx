import React from 'react';
import { FolderOpen, Loader2, Map } from 'lucide-react';
import { WorkspaceEntryPanel } from '../../components/WorkspaceEntryPanel';

const actionButtonClass =
  'inline-flex items-center gap-2 rounded-lg border border-[#00f0ff]/25 bg-[#040914]/80 px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:border-[#00f0ff]/45 hover:bg-[#00f0ff]/10 disabled:opacity-50 disabled:pointer-events-none';

type ForensicsWorkspacePanelProps = {
  hasScope: boolean;
  workspaceLabel: string;
  loadedCount: number;
  catalogCount: number;
  isLoading: boolean | string;
  onOpenSample: () => void;
  onOpenDirectory: () => void;
};

export const ForensicsWorkspacePanel: React.FC<ForensicsWorkspacePanelProps> = ({
  hasScope,
  workspaceLabel,
  loadedCount,
  catalogCount,
  isLoading,
  onOpenSample,
  onOpenDirectory,
}) => {
  const busy = Boolean(isLoading);
  const progressLabel = busy
    ? typeof isLoading === 'string'
      ? isLoading
      : 'Loading workspace'
    : null;

  if (!hasScope) {
    return (
      <div className="mb-8">
        <WorkspaceEntryPanel
          className="rounded-xl border border-[#00f0ff]/15 bg-[#040914]/80 p-5 md:p-6"
          layout="grid"
          showCliPanel
          disabled={busy}
          onOpenSample={onOpenSample}
          onOpenDirectory={onOpenDirectory}
        />

        {progressLabel ? (
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f0ff]" />
            {progressLabel}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#00f0ff]/10 bg-[#040914]/60 px-4 py-3"
      data-testid="forensics-workspace-summary"
    >
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
          Workspace scope
        </p>
        <p className="truncate text-sm font-semibold text-white">{workspaceLabel}</p>
        <p className="text-xs text-slate-400">
          {catalogCount > 0
            ? `${loadedCount} of ${catalogCount} diagrams loaded`
            : `${loadedCount} diagram${loadedCount === 1 ? '' : 's'} loaded`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {progressLabel ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f0ff]" />
            {progressLabel}
          </span>
        ) : null}
        <button
          type="button"
          data-testid="workspace-open-sample"
          onClick={onOpenSample}
          disabled={busy}
          className={actionButtonClass}
        >
          <Map className="w-3.5 h-3.5 text-amber-400" />
          Sample
        </button>
        <button
          type="button"
          data-testid="workspace-open-directory"
          onClick={onOpenDirectory}
          disabled={busy}
          className={actionButtonClass}
        >
          <FolderOpen className="w-3.5 h-3.5 text-brand-400" />
          Folder
        </button>
      </div>
    </section>
  );
};
