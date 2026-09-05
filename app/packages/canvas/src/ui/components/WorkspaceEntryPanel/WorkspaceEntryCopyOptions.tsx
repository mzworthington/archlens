import React from 'react';
import { FolderOpen, Terminal, Copy, Check, ArrowRight, Users, Share2, Upload } from 'lucide-react';
import { Link } from 'wouter';
import {
  CLI_GETTING_STARTED_PATH,
  CLI_INSTALL_COMMAND,
  CLI_SCAN_COMMAND,
} from '../../../constants/cli';
import {
  intentCardClass,
  intentHeadingIconClass,
  intentHeadingRowClass,
  intentHeadingTitleClass,
  optionClass,
} from './workspaceEntryStyles';

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

export type WorkspaceEntryCopyCliPanelProps = {
  expandSignal?: number;
};

export const WorkspaceEntryCopyCliPanel: React.FC<WorkspaceEntryCopyCliPanelProps> = ({
  expandSignal = 0,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<'install' | 'scan' | null>(null);
  const [cliExpanded, setCliExpanded] = React.useState(false);

  React.useEffect(() => {
    if (expandSignal > 0) {
      setCliExpanded(true);
    }
  }, [expandSignal]);

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
            TraceLens git hotspots, watch mode and CI catalog publish.
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
  );
};

export type WorkspaceEntryCopyOptionsProps = {
  onShareBlankCanvas?: () => void;
  onShareDirectory?: () => void;
  onShareFile?: () => void;
  actionsDisabled: boolean;
};

export const WorkspaceEntryCopyOptions: React.FC<WorkspaceEntryCopyOptionsProps> = ({
  onShareBlankCanvas,
  onShareDirectory,
  onShareFile,
  actionsDisabled,
}) => (
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
            <span className="block text-sm font-semibold text-slate-100">Share blank room</span>
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
            <span className="block text-sm font-semibold text-slate-100">Open file then share</span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Load a YAML blueprint, then create a share link
            </span>
          </span>
        </button>
      ) : null}
    </div>
  </section>
);
