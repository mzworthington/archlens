import React from 'react';
import { FolderOpen, Loader2, Map } from 'lucide-react';
import { WorkspaceEntryPanel } from '../../components/WorkspaceEntryPanel';
import {
  GOLDEN_PATHS_CONTEXT_PATH,
  type SandboxContextPath,
} from '../../../application/store/defaultData';

const actionButtonClass =
  'inline-flex items-center gap-2 rounded-lg border border-[#00f0ff]/25 bg-[#040914]/80 px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:border-[#00f0ff]/45 hover:bg-[#00f0ff]/10 disabled:opacity-50 disabled:pointer-events-none';

type ForensicsWorkspacePanelProps = {
  hasScope: boolean;
  workspaceLabel: string;
  loadedCount: number;
  catalogCount: number;
  unloadedCount: number;
  isLoading: boolean | string;
  pendingFolderSession?: boolean;
  pendingFolderName?: string;
  rankLoadedOnly?: boolean;
  onRankLoadedOnly?: () => void;
  onLoadSandbox: (contextPath: SandboxContextPath) => void;
  onOpenDirectory: () => void;
  activeSandboxContextPath?: string | null;
};

export const ForensicsWorkspacePanel: React.FC<ForensicsWorkspacePanelProps> = ({
  hasScope,
  workspaceLabel,
  loadedCount,
  catalogCount,
  unloadedCount,
  isLoading,
  pendingFolderSession = false,
  pendingFolderName,
  rankLoadedOnly = false,
  onRankLoadedOnly,
  onLoadSandbox,
  onOpenDirectory,
  activeSandboxContextPath = null,
}) => {
  const busy = Boolean(isLoading);
  const showCatalogProgress = catalogCount > 0 && unloadedCount > 0 && !rankLoadedOnly;
  const progressPct = catalogCount > 0 ? Math.round((loadedCount / catalogCount) * 100) : undefined;
  const progressLabel = showCatalogProgress
    ? `Loading ${loadedCount}/${catalogCount} diagrams`
    : busy
      ? typeof isLoading === 'string'
        ? isLoading
        : 'Loading workspace'
      : null;

  if (!hasScope) {
    const description = pendingFolderSession ? (
      <>
        Load the demo estate to simulate failures and ranked advice in minutes — or open blueprints
        from your own repo. Your last session used a local folder (
        <span className="font-mono text-slate-300">{pendingFolderName || 'folder'}</span>) — re-open
        it below to restore rankings.
      </>
    ) : undefined;

    return (
      <div className="mb-8">
        <WorkspaceEntryPanel
          className="rounded-xl border border-[#00f0ff]/15 bg-[#040914]/80 p-5 md:p-6"
          layout="grid"
          showCliPanel
          disabled={busy}
          description={description}
          onLoadSandbox={onLoadSandbox}
          onOpenDirectory={onOpenDirectory}
        />

        {progressLabel ? (
          <div className="mt-4 space-y-2">
            <p className="inline-flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f0ff]" />
              {progressLabel}
            </p>
            {progressPct != null ? (
              <div
                className="h-1.5 max-w-xs rounded-full bg-slate-900 overflow-hidden"
                data-testid="forensics-prefetch-progress"
              >
                <div
                  className="h-full rounded-full bg-[#00f0ff]/70 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            ) : null}
          </div>
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
        {showCatalogProgress && onRankLoadedOnly ? (
          <button
            type="button"
            data-testid="forensics-rank-loaded-only"
            onClick={onRankLoadedOnly}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-300 hover:border-[#00f0ff]/35 hover:text-[#00f0ff] transition-colors disabled:opacity-50"
            title="Skip background prefetch and rank from diagrams already in memory"
          >
            Rank loaded only
          </button>
        ) : null}
        {progressLabel ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f0ff]" />
            {progressLabel}
            {progressPct != null ? (
              <span className="font-mono text-[10px] text-slate-500">({progressPct}%)</span>
            ) : null}
          </span>
        ) : null}
        <button
          type="button"
          data-testid="workspace-load-sandbox"
          onClick={() =>
            onLoadSandbox(
              (activeSandboxContextPath as SandboxContextPath | null) ?? GOLDEN_PATHS_CONTEXT_PATH
            )
          }
          disabled={busy}
          className={actionButtonClass}
        >
          <Map className="w-3.5 h-3.5 text-amber-400" />
          Sandbox
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
