import React from 'react';
import { Code2, ExternalLink, Lock, RefreshCw, X } from 'lucide-react';
import type { SourceProvenance } from '@archlens/core';
import { useSourceCodeDialog } from './useSourceCodeDialog';
import { HighlightedSourceCode } from './HighlightedSourceCode';

interface SourceCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filepath?: string;
  source?: SourceProvenance;
  isWorkspaceOpen: boolean;
  readLocalFile?: (relativePath: string) => Promise<string>;
}

export const SourceCodeDialog: React.FC<SourceCodeDialogProps> = ({
  isOpen,
  onClose,
  filepath,
  source,
  isWorkspaceOpen,
  readLocalFile,
}) => {
  const { result, loading, reload } = useSourceCodeDialog({
    isOpen,
    filepath,
    source,
    isWorkspaceOpen,
    readLocalFile,
  });

  if (!isOpen) return null;

  const viewerUrl =
    result && !result.ok ? result.viewerUrl : result?.ok ? result.viewerUrl : undefined;
  const displayPath =
    result?.ok && 'filepath' in result
      ? result.filepath
      : filepath?.replace(/\\/g, '/').replace(/^\.\//, '');

  return (
    <div
      className="fixed inset-0 z-[110]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-code-dialog-title"
      data-testid="source-code-dialog"
    >
      <div
        className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-4xl bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl h-[min(90vh,860px)] flex flex-col"
          onWheel={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-start gap-2 min-w-0">
              <Code2 className="w-4 h-4 text-[#00f0ff] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h2 id="source-code-dialog-title" className="text-base font-bold text-white">
                  Source code
                </h2>
                {displayPath ? (
                  <p className="text-xs text-slate-500 mt-0.5 font-mono break-all">{displayPath}</p>
                ) : null}
                {result?.ok ? (
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
                    Loaded from {result.origin === 'local' ? 'workspace folder' : 'git raw URL'}
                  </p>
                ) : null}
                {source?.systemName ? (
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
                    System · {source.systemName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => void reload()}
                disabled={loading}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer disabled:opacity-50"
                aria-label="Reload source"
                title="Reload"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {viewerUrl ? (
                <a
                  href={viewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-slate-400 hover:text-[#00f0ff] hover:bg-slate-900 transition"
                  aria-label="Open in repository browser"
                  title="Open in browser"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
                aria-label="Close source code dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-4 pt-0 min-h-0 flex flex-col gap-2">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-500 font-mono">
                Loading source…
              </div>
            ) : result && !result.ok ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-0">
                <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-xl p-6 text-center shadow-lg flex flex-col items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-[#00f0ff]">
                    <Lock className="w-5 h-5" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-slate-200">
                      Source code preview unavailable
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      In-browser source rendering works directly for{' '}
                      <strong className="text-slate-300 font-semibold">public repositories</strong>.
                      Private repositories require authenticated browser sessions or local workspace
                      access.
                    </p>
                  </div>

                  <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-left space-y-1 text-[11px] text-slate-400">
                    <p className="font-semibold text-slate-300">Tips for private repos:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                      <li>Open the workspace folder locally via CLI or folder loader</li>
                      <li>Click below to view directly in your logged-in browser</li>
                    </ul>
                  </div>

                  {viewerUrl ? (
                    <a
                      href={viewerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 border border-[#00f0ff]/30 text-[#00f0ff] font-semibold text-xs transition cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in repository browser
                    </a>
                  ) : null}
                </div>
              </div>
            ) : result?.ok ? (
              <HighlightedSourceCode content={result.content} filepath={result.filepath} />
            ) : null}

            {result?.ok ? (
              <p className="text-[10px] text-slate-500 text-center shrink-0">
                Scroll with trackpad or mouse wheel inside the code panel. Use{' '}
                <kbd className="font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded px-1">
                  ↑
                </kbd>{' '}
                <kbd className="font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded px-1">
                  ↓
                </kbd>{' '}
                when the panel is focused.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
