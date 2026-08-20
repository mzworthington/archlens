import React, { useEffect, useState } from 'react';
import { Code2, ExternalLink, Key, Lock, RefreshCw, X, Eye, EyeOff } from 'lucide-react';
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
  githubPat?: string | null;
  onSavePat?: (pat: string | null) => void;
}

export const SourceCodeDialog: React.FC<SourceCodeDialogProps> = ({
  isOpen,
  onClose,
  filepath,
  source,
  isWorkspaceOpen,
  readLocalFile,
  githubPat,
  onSavePat,
}) => {
  const { result, loading, reload } = useSourceCodeDialog({
    isOpen,
    filepath,
    source,
    isWorkspaceOpen,
    readLocalFile,
    githubPat,
  });

  const [tokenInput, setTokenInput] = useState(githubPat ?? '');
  const [showPatDrawer, setShowPatDrawer] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

  useEffect(() => {
    setTokenInput(githubPat ?? '');
  }, [githubPat]);

  const [repoUrlInput, setRepoUrlInput] = useState(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('archlens_custom_repo_url') || '';
    }
    return '';
  });

  const [activeRepoUrl, setActiveRepoUrl] = useState(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('archlens_custom_repo_url') || '';
    }
    return '';
  });

  if (!isOpen) return null;

  const rawViewerUrl =
    result && !result.ok ? result.viewerUrl : result?.ok ? result.viewerUrl : undefined;
  const displayPath =
    result?.ok && 'filepath' in result
      ? result.filepath
      : filepath?.replace(/\\/g, '/').replace(/^\.\//, '');

  const effectiveRemoteUrl = source?.remoteUrl || activeRepoUrl;

  const computedViewerUrl =
    rawViewerUrl ||
    (effectiveRemoteUrl && displayPath
      ? `${effectiveRemoteUrl.replace(/\.git$/, '').replace(/\/$/, '')}/blob/${source?.scannedAtCommit || source?.defaultBranch || 'main'}/${displayPath}`
      : undefined);

  const viewerUrl = computedViewerUrl;

  const handleSaveToken = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = tokenInput.trim();
    onSavePat?.(clean ? clean : null);
    setShowPatDrawer(false);
    void reload();
  };

  const handleClearToken = () => {
    setTokenInput('');
    onSavePat?.(null);
    setShowPatDrawer(false);
    void reload();
  };

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
          className="pointer-events-auto w-full max-w-4xl bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl h-[min(90vh,860px)] flex flex-col overflow-hidden"
          onWheel={e => e.stopPropagation()}
        >
          {/* Dialog Header */}
          <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0 bg-slate-950/80">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <Code2 className="w-4 h-4 text-[#00f0ff] mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 id="source-code-dialog-title" className="text-base font-bold text-white">
                  Source code
                </h2>
                {displayPath ? (
                  <p className="text-xs text-slate-400 mt-0.5 font-mono break-all">{displayPath}</p>
                ) : null}
                {viewerUrl ? (
                  <a
                    href={viewerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#00f0ff] hover:underline font-mono mt-1 font-semibold cursor-pointer"
                    title="Open in repository browser / GitHub"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>Open in GitHub</span>
                  </a>
                ) : null}
                {result?.ok ? (
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
                    Loaded from {result.origin === 'local' ? 'workspace folder' : 'git raw / API'}
                  </p>
                ) : null}
                {source?.systemName ? (
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
                    System · {source.systemName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowPatDrawer(!showPatDrawer)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  githubPat
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Configure GitHub Personal Access Token (PAT)"
                aria-label="GitHub PAT token settings"
              >
                <Key className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span>{githubPat ? 'PAT Active' : 'Add PAT'}</span>
              </button>

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
                  title="Open in repository browser"
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

          {/* Collapsible PAT settings drawer */}
          {showPatDrawer && (
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#00f0ff]" />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    GitHub Personal Access Token (PAT)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Required for private repositories (stored in local browser storage only)
                </p>
              </div>

              <form onSubmit={handleSaveToken} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    placeholder="ghp_... or github_pat_..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-[#00f0ff] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
                  >
                    {showPasswordText ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#00f0ff]/15 border border-[#00f0ff]/40 text-[#00f0ff] font-semibold text-xs hover:bg-[#00f0ff]/25 transition cursor-pointer shrink-0"
                >
                  Save & Retry
                </button>
                {githubPat && (
                  <button
                    type="button"
                    onClick={handleClearToken}
                    className="px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 font-semibold text-xs hover:bg-red-900/40 transition cursor-pointer shrink-0"
                  >
                    Clear Token
                  </button>
                )}
              </form>
            </div>
          )}

          {/* Dialog Body */}
          <div className="flex-1 overflow-hidden p-4 pt-0 min-h-0 flex flex-col gap-2">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-500 font-mono">
                Loading source…
              </div>
            ) : result && !result.ok ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-0 overflow-y-auto">
                <div className="w-full max-w-lg bg-slate-900/80 border border-slate-800 rounded-xl p-6 text-center shadow-lg flex flex-col items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-[#00f0ff]">
                    <Lock className="w-5 h-5" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-200">
                      Source code preview unavailable
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      In-browser source rendering works directly for{' '}
                      <strong className="text-slate-300 font-semibold">public repositories</strong>.
                      For private repositories, click the{' '}
                      <button
                        type="button"
                        onClick={() => setShowPatDrawer(true)}
                        className="text-[#00f0ff] font-semibold underline hover:text-white cursor-pointer"
                      >
                        Add PAT
                      </button>{' '}
                      button at the top of the screen to configure a GitHub Personal Access Token,
                      or open the workspace locally.
                    </p>
                  </div>

                  {viewerUrl ? (
                    <a
                      href={viewerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 border border-[#00f0ff]/40 text-[#00f0ff] font-bold text-xs transition cursor-pointer shadow-md"
                    >
                      <ExternalLink className="w-4 h-4 shrink-0 text-[#00f0ff]" />
                      <span>Open in GitHub</span>
                    </a>
                  ) : (
                    <div className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-left space-y-2">
                      <p className="text-[11px] text-slate-400">
                        No remote repository URL found on this diagram. Enter your GitHub repository
                        web URL:
                      </p>
                      <form
                        onSubmit={e => {
                          e.preventDefault();
                          const clean = repoUrlInput.trim();
                          if (
                            clean &&
                            typeof window !== 'undefined' &&
                            typeof localStorage !== 'undefined'
                          ) {
                            localStorage.setItem('archlens_custom_repo_url', clean);
                            setActiveRepoUrl(clean);
                          }
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={repoUrlInput}
                          onChange={e => setRepoUrlInput(e.target.value)}
                          placeholder="https://github.com/owner/repo"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#00f0ff]"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-[#00f0ff]/15 border border-[#00f0ff]/30 text-[#00f0ff] font-semibold text-xs hover:bg-[#00f0ff]/25 transition cursor-pointer shrink-0"
                        >
                          Save & View Link
                        </button>
                      </form>
                    </div>
                  )}
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
