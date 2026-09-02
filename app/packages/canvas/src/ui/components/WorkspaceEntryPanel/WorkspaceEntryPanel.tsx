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
  AlertTriangle,
  FilePlus,
  GitMerge,
  Cloud,
  Users,
  Share2,
  Upload,
  Lightbulb,
  Search,
} from 'lucide-react';
import { Link } from 'wouter';
import {
  CLI_GETTING_STARTED_PATH,
  CLI_INSTALL_COMMAND,
  CLI_SCAN_COMMAND,
} from '../../../constants/cli';
import { isBrowserDirectoryPickerSupported } from '../../../infrastructure/analysis/browserSourceWalker';
import { WORKSPACE_STARTUP } from '../../content/productOutcomes';

const optionClass =
  'w-full flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-left transition hover:border-[#00f0ff]/35 hover:bg-slate-900/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/40 disabled:opacity-50 disabled:pointer-events-none';

const unsupportedOptionClass =
  'w-full flex items-start gap-3 rounded-lg border border-amber-500/35 bg-amber-950/25 px-3 py-2.5 text-left transition hover:border-amber-500/50 hover:bg-amber-950/35 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 disabled:opacity-50 disabled:pointer-events-none';

const sampleStripClass =
  'w-full flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-950/20 px-4 py-3.5 text-left transition hover:border-amber-500/55 hover:bg-amber-950/30 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 disabled:opacity-50 disabled:pointer-events-none';

const intentCardClass =
  'rounded-xl border border-slate-800 bg-slate-950/40 p-3 min-w-0 h-full flex flex-col';

const intentHeadingRowClass = 'flex items-start gap-2.5 mb-3 px-0.5';
const intentHeadingIconClass = 'w-5 h-5 text-[#00f0ff] shrink-0 mt-0.5';
const intentHeadingTitleClass = 'text-xl font-bold tracking-tight text-white';

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
  /** Structural browser scan - pick a source folder, no CLI install. */
  onBrowserLiteScan?: () => void;
  /** Import from Mermaid diagram. */
  onImportMermaid?: () => void;
  /** Import Terraform / Pulumi into an empty starter diagram. */
  onImportIac?: () => void;
  /** Start an empty diagram with no demo or folder loaded (Ideate). */
  onStartBlankCanvas?: () => void;
  /** Collaborate: blank canvas then share link. */
  onShareBlankCanvas?: () => void;
  /** Collaborate: open blueprints folder then share. */
  onShareDirectory?: () => void;
  /** Collaborate: open a YAML file then share. */
  onShareFile?: () => void;
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

const BROWSER_LITE_UNSUPPORTED_MESSAGE =
  'Folder picking is not available in this browser (Firefox and Safari). Use Chrome or Edge, or install the ArchLens CLI below for a full scan.';

/** Intent-first workspace entry - sample strip, then Investigate / Collaborate / Ideate. */
export const WorkspaceEntryPanel: React.FC<WorkspaceEntryPanelProps> = ({
  onOpenSample,
  onOpenDirectory,
  onBrowserLiteScan,
  onImportMermaid,
  onImportIac,
  onStartBlankCanvas,
  onShareBlankCanvas,
  onShareDirectory,
  onShareFile,
  disabled = false,
  loadingMessage = null,
  showCliPanel = false,
  title = WORKSPACE_STARTUP.title,
  description = WORKSPACE_STARTUP.lede,
  badge = 'Workspace',
  layout = 'grid',
  className = '',
  testId = 'workspace-entry',
  titleId,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<'install' | 'scan' | null>(null);
  const [cliExpanded, setCliExpanded] = React.useState(false);
  const [liteScanFeedback, setLiteScanFeedback] = React.useState<string | null>(null);
  const directoryPickerSupported = isBrowserDirectoryPickerSupported();
  const statusMessage =
    typeof loadingMessage === 'string' && loadingMessage.trim() ? loadingMessage : null;
  const actionsDisabled = disabled || Boolean(statusMessage);
  const showCollaborate = Boolean(onShareBlankCanvas || onShareDirectory || onShareFile);

  const handleCopyCommand = async (key: 'install' | 'scan', command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard may be unavailable in some contexts
    }
  };

  const handleBrowserLiteScan = () => {
    if (!directoryPickerSupported) {
      setLiteScanFeedback(BROWSER_LITE_UNSUPPORTED_MESSAGE);
      setCliExpanded(true);
    }
    onBrowserLiteScan?.();
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

      <div className="mt-4 space-y-3">
        <button
          type="button"
          data-testid="workspace-open-sample"
          onClick={onOpenSample}
          disabled={actionsDisabled}
          className={sampleStripClass}
        >
          <Map className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <span className="block text-sm font-semibold text-slate-100">
              Try the demo - simulate a failure
            </span>
            <span className="block text-xs text-slate-400 mt-0.5">
              Opens the golden journey with ChaosLens so you see blast radius and ranked advice
              first
            </span>
          </span>
        </button>

        {showCliPanel ? (
          <div
            className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3"
            data-testid="workspace-cli-panel"
          >
            <button
              type="button"
              className="w-full flex items-start gap-3 text-left cursor-pointer"
              onClick={() => setCliExpanded(v => !v)}
              aria-expanded={cliExpanded}
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
                  TraceLens git hotspots, watch mode, and CI catalog publish.
                </span>
              </span>
              <ArrowRight
                className={`w-4 h-4 text-slate-500 shrink-0 mt-1 transition ${cliExpanded ? 'rotate-90' : ''}`}
                aria-hidden
              />
            </button>

            {cliExpanded ? (
              <div className="mt-3 ml-7 space-y-3" data-testid="workspace-cli-panel-body">
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

        <div
          className={
            layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch' : 'space-y-3'
          }
          data-testid="workspace-intent-row"
        >
          <section
            className={intentCardClass}
            data-testid="workspace-intent-investigate"
            aria-labelledby="workspace-intent-investigate-title"
          >
            <div className={intentHeadingRowClass}>
              <Search className={intentHeadingIconClass} aria-hidden />
              <div>
                <h3 id="workspace-intent-investigate-title" className={intentHeadingTitleClass}>
                  Investigate
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Map or import real systems</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {onBrowserLiteScan ? (
                <button
                  type="button"
                  data-testid="workspace-browser-lite-scan"
                  onClick={handleBrowserLiteScan}
                  disabled={actionsDisabled}
                  className={directoryPickerSupported ? optionClass : unsupportedOptionClass}
                  aria-describedby={
                    !directoryPickerSupported ? 'workspace-browser-lite-unsupported' : undefined
                  }
                >
                  <ScanSearch
                    className={`w-4 h-4 shrink-0 mt-0.5 ${directoryPickerSupported ? 'text-[#00f0ff]' : 'text-amber-400'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">
                        Browser lite scan
                      </span>
                      <span
                        className="inline-flex items-center rounded border border-amber-500/40 bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-amber-300"
                        data-testid="workspace-browser-lite-badge"
                      >
                        Lite
                      </span>
                      {!directoryPickerSupported ? (
                        <span
                          className="inline-flex items-center rounded border border-amber-500/40 bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-amber-200"
                          data-testid="workspace-browser-lite-unavailable-badge"
                        >
                          Unavailable here
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-xs text-slate-400 mt-0.5">
                      {directoryPickerSupported
                        ? 'Instant structural map of a folder - no git TraceLens, no CI publish.'
                        : 'Needs Chrome or Edge (folder picker API). Use the ArchLens CLI instead.'}
                    </span>
                  </span>
                </button>
              ) : null}

              {!directoryPickerSupported && onBrowserLiteScan ? (
                <div
                  id="workspace-browser-lite-unsupported"
                  className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-100/95"
                  role="status"
                  data-testid="workspace-browser-lite-unsupported"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
                  <p className="leading-relaxed">{BROWSER_LITE_UNSUPPORTED_MESSAGE}</p>
                </div>
              ) : null}

              {liteScanFeedback ? (
                <div
                  className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-950/50 px-3 py-2 text-xs text-amber-100"
                  role="alert"
                  data-testid="workspace-browser-lite-feedback"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
                  <p className="leading-relaxed">{liteScanFeedback}</p>
                </div>
              ) : null}

              <button
                type="button"
                data-testid="workspace-open-directory"
                onClick={onOpenDirectory}
                disabled={actionsDisabled}
                className={optionClass}
              >
                <FolderOpen className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <span>
                  <span className="block text-sm font-semibold text-slate-100">
                    Open existing blueprints folder
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Pick a local folder of YAML blueprints (e.g. after a CLI scan)
                  </span>
                </span>
              </button>

              {onImportIac ? (
                <button
                  type="button"
                  data-testid="workspace-import-iac"
                  onClick={onImportIac}
                  disabled={actionsDisabled}
                  className={optionClass}
                >
                  <Cloud className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-100">
                      Import infrastructure
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      Terraform or Pulumi into a starter diagram
                    </span>
                  </span>
                </button>
              ) : null}
            </div>
          </section>

          {showCollaborate ? (
            <section
              className={intentCardClass}
              data-testid="workspace-intent-collaborate"
              aria-labelledby="workspace-intent-collaborate-title"
            >
              <div className={intentHeadingRowClass}>
                <Users className={intentHeadingIconClass} aria-hidden />
                <div>
                  <h3 id="workspace-intent-collaborate-title" className={intentHeadingTitleClass}>
                    Collaborate
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Share a canvas with others</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {onShareBlankCanvas ? (
                  <button
                    type="button"
                    data-testid="workspace-share-blank"
                    onClick={onShareBlankCanvas}
                    disabled={actionsDisabled}
                    className={optionClass}
                  >
                    <Share2 className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-100">
                        Share blank room
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        Empty canvas with a live editing link
                      </span>
                    </span>
                  </button>
                ) : null}
                {onShareDirectory ? (
                  <button
                    type="button"
                    data-testid="workspace-share-directory"
                    onClick={onShareDirectory}
                    disabled={actionsDisabled}
                    className={optionClass}
                  >
                    <FolderOpen className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-100">
                        Open folder then share
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        Load blueprints locally, then create a share link
                      </span>
                    </span>
                  </button>
                ) : null}
                {onShareFile ? (
                  <button
                    type="button"
                    data-testid="workspace-share-file"
                    onClick={onShareFile}
                    disabled={actionsDisabled}
                    className={optionClass}
                  >
                    <Upload className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-100">
                        Open file then share
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        Load a YAML blueprint, then create a share link
                      </span>
                    </span>
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          {onStartBlankCanvas || onImportMermaid ? (
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
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sketch from scratch - solo; share later from the toolbar
                  </p>
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
                        Empty diagram - draw or import when you are ready
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
                        Paste or upload a Mermaid diagram (.mmd / .md)
                      </span>
                    </span>
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
};
