import React, { useEffect, useState } from 'react';
import { Code2, ExternalLink, Key, RefreshCw, X } from 'lucide-react';
import {
  buildSourceFileUrl,
  normalizeGitRemoteUrl,
  safeHttpUrl,
  type SourceProvenance,
} from '@archlens/core';
import { useSourceCodeDialog } from './useSourceCodeDialog';
import { HighlightedSourceCode } from './HighlightedSourceCode';
import {
  ExternalHttpLink,
  PatSettingsDrawer,
  SourceUnavailablePanel,
} from './SourceCodeDialogParts';

const CUSTOM_REPO_URL_KEY = 'archlens_custom_repo_url';

function readStoredRepoUrl(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return '';
  return normalizeGitRemoteUrl(localStorage.getItem(CUSTOM_REPO_URL_KEY) ?? '') ?? '';
}

function resolveViewerUrl(
  rawViewerUrl: string | undefined,
  displayPath: string | undefined,
  source: SourceProvenance | undefined,
  activeRepoUrl: string
): string | undefined {
  const effectiveRemoteUrl = normalizeGitRemoteUrl(source?.remoteUrl || activeRepoUrl || '');
  const fallbackViewerUrl =
    effectiveRemoteUrl && displayPath
      ? buildSourceFileUrl(
          {
            ...source,
            remoteUrl: effectiveRemoteUrl,
            scannedAtCommit: source?.scannedAtCommit || source?.defaultBranch || 'main',
          },
          displayPath
        )
      : undefined;
  return safeHttpUrl(rawViewerUrl || fallbackViewerUrl);
}

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
  const [repoUrlInput, setRepoUrlInput] = useState(readStoredRepoUrl);
  const [activeRepoUrl, setActiveRepoUrl] = useState(readStoredRepoUrl);

  useEffect(() => {
    setTokenInput(githubPat ?? '');
  }, [githubPat]);

  if (!isOpen) return null;

  const displayPath =
    result?.ok && 'filepath' in result
      ? result.filepath
      : filepath?.replace(/\\/g, '/').replace(/^\.\//, '');
  const viewerUrl = resolveViewerUrl(
    result ? result.viewerUrl : undefined,
    displayPath,
    source,
    activeRepoUrl
  );

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
      <button
        type="button"
        aria-label="Dismiss"
        className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm cursor-pointer border-0 p-0"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-4xl bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl h-[min(90vh,860px)] flex flex-col overflow-hidden"
          onWheel={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0 bg-slate-950/80">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <Code2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 id="source-code-dialog-title" className="text-base font-bold text-white">
                  Source code
                </h2>
                {displayPath ? (
                  <p className="text-xs text-slate-400 mt-0.5 font-mono break-all">{displayPath}</p>
                ) : null}
                {viewerUrl ? (
                  <ExternalHttpLink
                    href={viewerUrl}
                    className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-mono mt-1 font-semibold cursor-pointer"
                    title="Open in repository browser / GitHub"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>Open in GitHub</span>
                  </ExternalHttpLink>
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
                <Key className="w-3.5 h-3.5 text-accent" />
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
                <ExternalHttpLink
                  href={viewerUrl}
                  className="p-2 rounded-lg text-slate-400 hover:text-accent hover:bg-slate-900 transition"
                  aria-label="Open in repository browser"
                  title="Open in repository browser"
                >
                  <ExternalLink className="w-4 h-4" />
                </ExternalHttpLink>
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

          {showPatDrawer && (
            <PatSettingsDrawer
              tokenInput={tokenInput}
              onChangeTokenInput={setTokenInput}
              showPasswordText={showPasswordText}
              onTogglePasswordText={() => setShowPasswordText(!showPasswordText)}
              githubPat={githubPat}
              onSaveToken={handleSaveToken}
              onClearToken={handleClearToken}
            />
          )}

          <div className="flex-1 overflow-hidden p-4 pt-0 min-h-0 flex flex-col gap-2">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-500 font-mono">
                Loading source…
              </div>
            ) : result && !result.ok ? (
              <SourceUnavailablePanel
                viewerUrl={viewerUrl}
                repoUrlInput={repoUrlInput}
                onChangeRepoUrlInput={setRepoUrlInput}
                onOpenPatDrawer={() => setShowPatDrawer(true)}
                onSaveRepoUrl={remote => {
                  setActiveRepoUrl(remote);
                  setRepoUrlInput(remote);
                }}
              />
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
