import React from 'react';
import {
  FolderOpen,
  Map,
  Terminal,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  ScanSearch,
} from 'lucide-react';
import { Link } from 'wouter';
import {
  CLI_GETTING_STARTED_PATH,
  CLI_INSTALL_COMMAND,
  CLI_SCAN_COMMAND,
} from '../../../constants/cli';
import { WORKSPACE_STARTUP } from '../../content/productOutcomes';

const optionClass =
  'w-full flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-left transition hover:border-[#00f0ff]/35 hover:bg-slate-900/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/40 disabled:opacity-50 disabled:pointer-events-none';

const primaryOptionClass =
  'w-full flex items-start gap-3 rounded-xl border border-[#00f0ff]/35 bg-[#061125]/80 px-4 py-3.5 text-left transition hover:border-[#00f0ff]/55 hover:bg-[#07162c] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/40 disabled:opacity-50 disabled:pointer-events-none';

type CopyableCommandProps = {
  command: string;
  testId: string;
  copied: boolean;
  onCopy: () => void;
};

const CopyableCommand: React.FC<CopyableCommandProps> = ({ command, testId, copied, onCopy }) => (
  <div
    className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#040914] px-3 py-2"
    data-testid={testId}
  >
    <code className="flex-1 min-w-0 text-[11px] font-mono text-emerald-300 break-all">
      {command}
    </code>
    <button
      type="button"
      onClick={onCopy}
      className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
      aria-label="Copy command"
      title="Copy command"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  </div>
);

export type WorkspaceEntryPanelProps = {
  onOpenSample: () => void;
  onOpenDirectory: () => void;
  /** Structural browser scan — pick a source folder, no CLI install. */
  onBrowserLiteScan?: () => void;
  disabled?: boolean;
  /** Shown while sandbox/workspace open is in progress (disables actions). */
  loadingMessage?: string | false | null;
  showCliPanel?: boolean;
  title?: string;
  description?: React.ReactNode;
  badge?: string;
  layout?: 'stack' | 'grid';
  className?: string;
  testId?: string;
  titleId?: string;
};

/** Shared workspace entry — demo insight first, then browser scan / folder / CLI. */
export const WorkspaceEntryPanel: React.FC<WorkspaceEntryPanelProps> = ({
  onOpenSample,
  onOpenDirectory,
  onBrowserLiteScan,
  disabled = false,
  loadingMessage = null,
  showCliPanel = false,
  title = WORKSPACE_STARTUP.title,
  description = WORKSPACE_STARTUP.lede,
  badge = 'Workspace',
  layout = 'stack',
  className = '',
  testId = 'workspace-entry',
  titleId,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<'install' | 'scan' | null>(null);
  const [cliExpanded, setCliExpanded] = React.useState(false);
  const statusMessage =
    typeof loadingMessage === 'string' && loadingMessage.trim() ? loadingMessage : null;
  const actionsDisabled = disabled || Boolean(statusMessage);

  const handleCopyCommand = async (key: 'install' | 'scan', command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard may be unavailable in some contexts
    }
  };

  return (
    <section className={className} data-testid={testId}>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff] mb-2">
        {badge}
      </p>
      <h2 id={titleId} className="text-lg font-bold text-white tracking-tight">
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-2xl">{description}</p>

      {statusMessage ? (
        <div
          className="mt-4 flex items-center gap-2 rounded-xl border border-[#00f0ff]/25 bg-[#061125]/70 px-4 py-3"
          role="status"
          aria-live="polite"
          aria-busy="true"
          data-testid="workspace-entry-loading"
        >
          <Loader2 className="w-4 h-4 animate-spin text-[#00f0ff] shrink-0" aria-hidden />
          <span className="text-xs font-mono tracking-wider text-slate-300 uppercase">
            {statusMessage}
          </span>
        </div>
      ) : null}

      <div className={layout === 'grid' ? 'mt-4 grid gap-2 sm:grid-cols-2' : 'mt-4 space-y-2'}>
        <button
          type="button"
          data-testid="workspace-open-sample"
          onClick={onOpenSample}
          disabled={actionsDisabled}
          className={primaryOptionClass}
        >
          <Map className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <span className="block text-sm font-semibold text-slate-100">
              Try the demo — simulate a failure
            </span>
            <span className="block text-xs text-slate-400 mt-0.5">
              Opens the golden journey with ChaosLens so you see blast radius and ranked advice
              first
            </span>
          </span>
        </button>

        {onBrowserLiteScan ? (
          <button
            type="button"
            data-testid="workspace-browser-lite-scan"
            onClick={onBrowserLiteScan}
            disabled={actionsDisabled}
            className={optionClass}
          >
            <ScanSearch className="w-5 h-5 text-[#00f0ff] shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-semibold text-slate-100">
                Scan my repo in the browser
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Pick a source folder — structural BlueprintSpec only (no install, no git hotspots)
              </span>
            </span>
          </button>
        ) : null}

        <button
          type="button"
          data-testid="workspace-open-directory"
          onClick={onOpenDirectory}
          disabled={actionsDisabled}
          className={optionClass}
        >
          <FolderOpen className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
          <span>
            <span className="block text-sm font-semibold text-slate-100">
              Open existing blueprints folder
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Pick a local folder of YAML blueprints (e.g. after a CLI scan)
            </span>
          </span>
        </button>
      </div>

      {showCliPanel ? (
        <div
          className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
          data-testid="workspace-cli-panel"
        >
          <button
            type="button"
            className="w-full flex items-start gap-3 text-left cursor-pointer"
            onClick={() => setCliExpanded(v => !v)}
            aria-expanded={cliExpanded}
            data-testid="workspace-cli-panel-toggle"
          >
            <Terminal className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-100">
                Need git hotspots or CI publish?
              </span>
              <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                Install the ArchLens CLI for TraceLens forensics, watch mode, and catalog publish.
              </span>
            </span>
            <ArrowRight
              className={`w-4 h-4 text-slate-500 shrink-0 mt-1 transition ${cliExpanded ? 'rotate-90' : ''}`}
              aria-hidden
            />
          </button>

          {cliExpanded ? (
            <div className="mt-3 ml-8 space-y-3" data-testid="workspace-cli-panel-body">
              <div className="space-y-1.5">
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">
                  1. Install
                </p>
                <CopyableCommand
                  command={CLI_INSTALL_COMMAND}
                  testId="workspace-cli-install"
                  copied={copiedKey === 'install'}
                  onCopy={() => void handleCopyCommand('install', CLI_INSTALL_COMMAND)}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">
                  2. Scan
                </p>
                <CopyableCommand
                  command={CLI_SCAN_COMMAND}
                  testId="workspace-cli-scan"
                  copied={copiedKey === 'scan'}
                  onCopy={() => void handleCopyCommand('scan', CLI_SCAN_COMMAND)}
                />
              </div>
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
      ) : null}
    </section>
  );
};
