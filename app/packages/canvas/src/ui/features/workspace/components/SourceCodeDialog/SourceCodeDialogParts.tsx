import React from 'react';
import { ExternalLink, Eye, EyeOff, Key, Lock } from 'lucide-react';
import { normalizeGitRemoteUrl } from '@archlens/core';

const CUSTOM_REPO_URL_KEY = 'archlens_custom_repo_url';

export function ExternalHttpLink({
  href,
  className,
  title,
  children,
  'aria-label': ariaLabel,
}: {
  href: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
  'aria-label'?: string;
}) {
  let safeHref: string | undefined;
  try {
    const parsed = new URL(href);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      safeHref = parsed.href;
    }
  } catch {
    return null;
  }
  if (!safeHref) return null;
  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

export function PatSettingsDrawer({
  tokenInput,
  onChangeTokenInput,
  showPasswordText,
  onTogglePasswordText,
  githubPat,
  onSaveToken,
  onClearToken,
}: {
  tokenInput: string;
  onChangeTokenInput: (value: string) => void;
  showPasswordText: boolean;
  onTogglePasswordText: () => void;
  githubPat?: string | null;
  onSaveToken: (e?: React.FormEvent) => void;
  onClearToken: () => void;
}) {
  return (
    <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            GitHub Personal Access Token (PAT)
          </h3>
        </div>
        <p className="text-[11px] text-slate-400">
          Required for private repositories (stored in local browser storage only)
        </p>
      </div>

      <form onSubmit={onSaveToken} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showPasswordText ? 'text' : 'password'}
            value={tokenInput}
            onChange={e => onChangeTokenInput(e.target.value)}
            placeholder="ghp_... or github_pat_..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-accent rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none pr-8"
          />
          <button
            type="button"
            onClick={onTogglePasswordText}
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
          className="px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/40 text-accent font-semibold text-xs hover:bg-accent/25 transition cursor-pointer shrink-0"
        >
          Save & Retry
        </button>
        {githubPat && (
          <button
            type="button"
            onClick={onClearToken}
            className="px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 font-semibold text-xs hover:bg-red-900/40 transition cursor-pointer shrink-0"
          >
            Clear Token
          </button>
        )}
      </form>
    </div>
  );
}

export function SourceUnavailablePanel({
  viewerUrl,
  repoUrlInput,
  onChangeRepoUrlInput,
  onOpenPatDrawer,
  onSaveRepoUrl,
}: {
  viewerUrl?: string;
  repoUrlInput: string;
  onChangeRepoUrlInput: (value: string) => void;
  onOpenPatDrawer: () => void;
  onSaveRepoUrl: (remote: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-0 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900/80 border border-slate-800 rounded-xl p-6 text-center shadow-lg flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-accent">
          <Lock className="w-5 h-5" />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-200">Source code preview unavailable</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            In-browser source rendering works directly for{' '}
            <strong className="text-slate-300 font-semibold">public repositories</strong>. For
            private repositories, click the{' '}
            <button
              type="button"
              onClick={onOpenPatDrawer}
              className="text-accent font-semibold underline hover:text-white cursor-pointer"
            >
              Add PAT
            </button>{' '}
            button at the top of the screen to configure a GitHub Personal Access Token, or open the
            workspace locally.
          </p>
        </div>

        {viewerUrl ? (
          <ExternalHttpLink
            href={viewerUrl}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/40 text-accent font-bold text-xs transition cursor-pointer shadow-md"
          >
            <ExternalLink className="w-4 h-4 shrink-0 text-accent" />
            <span>Open in GitHub</span>
          </ExternalHttpLink>
        ) : (
          <div className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-left space-y-2">
            <p className="text-[11px] text-slate-400">
              No remote repository URL found on this diagram. Enter your GitHub repository web URL:
            </p>
            <form
              onSubmit={e => {
                e.preventDefault();
                const remote = normalizeGitRemoteUrl(repoUrlInput);
                if (remote) {
                  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
                    localStorage.setItem(CUSTOM_REPO_URL_KEY, remote);
                  }
                  onSaveRepoUrl(remote);
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={repoUrlInput}
                onChange={e => onChangeRepoUrlInput(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/30 text-accent font-semibold text-xs hover:bg-accent/25 transition cursor-pointer shrink-0"
              >
                Save & View Link
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
