import React from 'react';
import { Check, Copy } from 'lucide-react';
import { CLI_INSTALL_COMMAND, CLI_SCAN_COMMAND } from '../../../constants/cli';

type CopyKey = 'install' | 'scan';

type CopyableCommandProps = {
  command: string;
  testId: string;
  copied: boolean;
  onCopy: () => void;
};

const CopyableCliCommand: React.FC<CopyableCommandProps> = ({
  command,
  testId,
  copied,
  onCopy,
}) => (
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
      aria-label={testId.includes('install') ? 'Copy install command' : 'Copy scan command'}
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

function useCliCommandCopy() {
  const [copiedKey, setCopiedKey] = React.useState<CopyKey | null>(null);

  const copyCommand = async (key: CopyKey, command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard may be unavailable in some contexts
    }
  };

  return { copiedKey, copyCommand };
}

export const CliCommandCopyStrip: React.FC<{ testIdPrefix?: string }> = ({
  testIdPrefix = 'workspace-cli',
}) => {
  const { copiedKey, copyCommand } = useCliCommandCopy();

  return (
    <div className="space-y-3" data-testid={`${testIdPrefix}-commands`}>
      <div className="space-y-1.5">
        <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">
          1. Install
        </p>
        <CopyableCliCommand
          command={CLI_INSTALL_COMMAND}
          testId={`${testIdPrefix}-install`}
          copied={copiedKey === 'install'}
          onCopy={() => void copyCommand('install', CLI_INSTALL_COMMAND)}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">2. Scan</p>
        <CopyableCliCommand
          command={CLI_SCAN_COMMAND}
          testId={`${testIdPrefix}-scan`}
          copied={copiedKey === 'scan'}
          onCopy={() => void copyCommand('scan', CLI_SCAN_COMMAND)}
        />
      </div>
    </div>
  );
};
