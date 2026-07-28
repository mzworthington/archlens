import React from 'react';
import { Box, FolderOpen, Loader2 } from 'lucide-react';

const actionButtonClass =
  'inline-flex items-center gap-2 rounded-lg border border-[#00f0ff]/25 bg-[#040914]/80 px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:border-[#00f0ff]/45 hover:bg-[#00f0ff]/10 disabled:opacity-50 disabled:pointer-events-none';

const optionClass =
  'w-full flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-left transition hover:border-[#00f0ff]/35 hover:bg-slate-900/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/40 disabled:opacity-50 disabled:pointer-events-none';

type ForensicsWorkspacePanelProps = {
  hasScope: boolean;
  workspaceLabel: string;
  loadedCount: number;
  catalogCount: number;
  unloadedCount: number;
  isLoading: boolean | string;
  onLoadSandbox: () => void;
  onOpenDirectory: () => void;
};

export const ForensicsWorkspacePanel: React.FC<ForensicsWorkspacePanelProps> = ({
  hasScope,
  workspaceLabel,
  loadedCount,
  catalogCount,
  unloadedCount,
  isLoading,
  onLoadSandbox,
  onOpenDirectory,
}) => {
  const busy = Boolean(isLoading);
  const showCatalogProgress = catalogCount > 0 && unloadedCount > 0;
  const progressLabel = showCatalogProgress
    ? `Loading ${loadedCount}/${catalogCount} diagrams`
    : busy
      ? typeof isLoading === 'string'
        ? isLoading
        : 'Loading workspace'
      : null;

  if (!hasScope) {
    return (
      <section
        className="mb-8 rounded-xl border border-[#00f0ff]/15 bg-[#040914]/80 p-5 md:p-6"
        data-testid="forensics-workspace-load"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff] mb-2">
          ArchLens Canvas
        </p>
        <h2 className="text-lg font-bold text-white tracking-tight">Load blueprints to rank</h2>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-2xl">
          TraceLens ranks components and containers from loaded YAML blueprints. Start with the
          bundled sandbox or open a local folder — or load a workspace on ArchLens Canvas first and
          return here to use what is already in scope.
        </p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            data-testid="forensics-load-sandbox"
            onClick={onLoadSandbox}
            disabled={busy}
            className={optionClass}
          >
            <Box className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-semibold text-slate-100">Load sandbox</span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Bundled demo diagrams with sample hotspot data
              </span>
            </span>
          </button>

          <button
            type="button"
            data-testid="forensics-open-directory"
            onClick={onOpenDirectory}
            disabled={busy}
            className={optionClass}
          >
            <FolderOpen className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-semibold text-slate-100">Open folder</span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Pick a local directory of blueprint YAML files
              </span>
            </span>
          </button>
        </div>

        {progressLabel ? (
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f0ff]" />
            {progressLabel}
          </p>
        ) : null}
      </section>
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
          data-testid="forensics-load-sandbox"
          onClick={onLoadSandbox}
          disabled={busy}
          className={actionButtonClass}
        >
          <Box className="w-3.5 h-3.5 text-brand-400" />
          Sandbox
        </button>
        <button
          type="button"
          data-testid="forensics-open-directory"
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
