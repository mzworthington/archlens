import React from 'react';
import { FolderOpen, Map, Terminal, Copy, Check, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import {
  CLI_GETTING_STARTED_PATH,
  CLI_INSTALL_COMMAND,
  CLI_SCAN_COMMAND,
} from '../../../constants/cli';
import { WORKSPACE_STARTUP } from '../../content/productOutcomes';
import {
  SANDBOX_DEFINITIONS,
  type SandboxContextPath,
} from '../../../application/store/defaultData';

const optionClass =
  'w-full flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-left transition hover:border-[#00f0ff]/35 hover:bg-slate-900/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/40 disabled:opacity-50 disabled:pointer-events-none';

const sandboxOptionClass =
  'w-full flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-3 text-left transition hover:border-amber-500/30 hover:bg-slate-900/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/30 disabled:opacity-50 disabled:pointer-events-none';

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
  onLoadSandbox: (contextPath: SandboxContextPath) => void;
  onOpenDirectory: () => void;
  disabled?: boolean;
  showCliPanel?: boolean;
  title?: string;
  description?: React.ReactNode;
  badge?: string;
  layout?: 'stack' | 'grid';
  className?: string;
  testId?: string;
  titleId?: string;
};

/** Shared workspace entry — pick a bundled sandbox or open a local blueprint folder. */
export const WorkspaceEntryPanel: React.FC<WorkspaceEntryPanelProps> = ({
  onLoadSandbox,
  onOpenDirectory,
  disabled = false,
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

  const handleCopyCommand = async (key: 'install' | 'scan', command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard may be unavailable in some contexts
    }
  };

  const sandboxLayoutClass =
    layout === 'grid' ? 'mt-4 grid gap-2 sm:grid-cols-2' : 'mt-4 grid gap-2 sm:grid-cols-2';

  return (
    <section className={className} data-testid={testId}>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff] mb-2">
        {badge}
      </p>
      <h2 id={titleId} className="text-lg font-bold text-white tracking-tight">
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-2xl">{description}</p>

      <div className="mt-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500 mb-2">
          Sandboxes
        </p>
        <div className={sandboxLayoutClass}>
          {SANDBOX_DEFINITIONS.map(definition => (
            <button
              key={definition.contextPath}
              type="button"
              data-testid={`workspace-load-sandbox-${definition.entityRef}`}
              onClick={() => onLoadSandbox(definition.contextPath)}
              disabled={disabled}
              className={sandboxOptionClass}
            >
              <Map className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-slate-100">
                  {definition.name}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={layout === 'grid' ? 'mt-4' : 'mt-3'}>
        <button
          type="button"
          data-testid="workspace-open-directory"
          onClick={onOpenDirectory}
          disabled={disabled}
          className={optionClass}
        >
          <FolderOpen className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
          <span>
            <span className="block text-sm font-semibold text-slate-100">
              Open workspace from directory
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Pick a local folder of YAML blueprints
            </span>
          </span>
        </button>
      </div>

      {showCliPanel ? (
        <div
          className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
          data-testid="workspace-cli-panel"
        >
          <div className="flex items-start gap-3">
            <Terminal className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">Generate from your codebase</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Install ArchLens, scan your repo, then open the output folder above.
                </p>
              </div>
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
          </div>
        </div>
      ) : null}
    </section>
  );
};
