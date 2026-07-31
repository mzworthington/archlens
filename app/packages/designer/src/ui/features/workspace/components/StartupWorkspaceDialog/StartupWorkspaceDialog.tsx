import React from 'react';
import { FolderOpen, Map, Terminal, Copy, Check, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import {
  CLI_GETTING_STARTED_PATH,
  CLI_INSTALL_COMMAND,
  CLI_SCAN_COMMAND,
} from '../../../../../constants/cli';

interface StartupWorkspaceDialogProps {
  isOpen: boolean;
  onLoadSandbox: () => void;
  onOpenDirectory: () => void;
}

const optionClass =
  'w-full flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-left transition hover:border-[#00f0ff]/35 hover:bg-slate-900/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/40';

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

/** First-run gate for bare `/workspace` — demo sandbox or a local folder. */
export const StartupWorkspaceDialog: React.FC<StartupWorkspaceDialogProps> = ({
  isOpen,
  onLoadSandbox,
  onOpenDirectory,
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="startup-workspace-title"
      data-testid="startup-workspace-dialog"
    >
      <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
        <div className="pointer-events-auto w-full max-w-lg my-auto bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl">
          <div className="p-5 border-b border-slate-800">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff] mb-2">
              Workspace
            </p>
            <h2
              id="startup-workspace-title"
              className="text-lg font-bold text-white tracking-tight"
            >
              Open workspace
            </h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Load the bundled Golden Paths demo estate, or open a local blueprint folder from your
              machine.
            </p>
          </div>

          <div className="p-4 space-y-2.5">
            <button
              type="button"
              data-testid="startup-load-sandbox"
              onClick={onLoadSandbox}
              className={optionClass}
            >
              <Map className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-slate-100">Load sandbox</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Golden Journey estate — personas, platforms, and Payment Gateway
                </span>
              </span>
            </button>

            <button
              type="button"
              data-testid="startup-open-directory"
              onClick={onOpenDirectory}
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

          <div
            className="mx-4 mb-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
            data-testid="startup-cli-panel"
          >
            <div className="flex items-start gap-3">
              <Terminal className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    Generate from your codebase
                  </p>
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
                    testId="startup-cli-install"
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
                    testId="startup-cli-scan"
                    copied={copiedKey === 'scan'}
                    onCopy={() => void handleCopyCommand('scan', CLI_SCAN_COMMAND)}
                  />
                </div>
                <Link
                  href={CLI_GETTING_STARTED_PATH}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00f0ff] hover:text-cyan-300 transition"
                  data-testid="startup-cli-install-guide"
                >
                  Install guide
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
