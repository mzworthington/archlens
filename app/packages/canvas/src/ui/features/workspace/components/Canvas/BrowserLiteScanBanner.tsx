import React from 'react';
import { Panel } from '@xyflow/react';
import { ScanSearch, Terminal, X } from 'lucide-react';
import { Link } from 'wouter';
import { CLI_GETTING_STARTED_PATH } from '../../../../../constants/cli';
import { CliCommandCopyStrip } from '../../../../components/WorkspaceEntryPanel/CliCommandCopyStrip';
import type { BrowserGitHistoryStatus } from '../../../../../application/analysis/browserGitStatus';

type BrowserLiteScanBannerProps = {
  open: boolean;
  onDismiss: () => void;
  onSaveMap?: () => void;
  gitStatus?: BrowserGitHistoryStatus | null;
};

/** Sticky reminder after an in-browser scan, with copyable CLI commands. */
export const BrowserLiteScanBanner: React.FC<BrowserLiteScanBannerProps> = ({
  open,
  onDismiss,
  onSaveMap,
  gitStatus = 'missing',
}) => {
  if (!open) return null;

  const gitLine =
    gitStatus === 'included'
      ? 'TraceLens git hotspots are on this map. The CLI is still needed for watch mode and CI publish.'
      : gitStatus === 'failed'
        ? 'Git history could not be read in this tab. Install the ArchLens CLI for watch mode, CI publish, and a native git scan.'
        : 'This folder has no git history, so TraceLens hotspots are empty. Install the ArchLens CLI for watch mode and CI publish.';

  return (
    <Panel position="top-center" className="m-4 max-w-lg w-full z-50">
      <div
        className="flex items-start gap-3 border border-amber-500/35 bg-amber-950/95 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-amber-100 text-xs"
        data-testid="browser-lite-scan-banner"
        role="status"
      >
        <ScanSearch className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="font-bold text-amber-200">Browser scan</h5>
            <span className="inline-flex items-center rounded border border-amber-500/45 bg-amber-900/60 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-amber-300">
              {gitStatus === 'included'
                ? 'Git included'
                : gitStatus === 'failed'
                  ? 'Git unread'
                  : 'No git history'}
            </span>
          </div>
          <p className="leading-relaxed text-amber-100/90">{gitLine}</p>
          <CliCommandCopyStrip testIdPrefix="browser-lite-scan-banner-cli" />
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={CLI_GETTING_STARTED_PATH}
              className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-[#00f0ff] hover:underline"
              data-testid="browser-lite-scan-banner-cli"
            >
              <Terminal className="w-3 h-3" aria-hidden />
              Install CLI & run a full scan
            </Link>
            {onSaveMap ? (
              <button
                type="button"
                onClick={onSaveMap}
                className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-amber-200 hover:underline cursor-pointer"
                data-testid="browser-lite-scan-banner-save"
              >
                Save map to folder
              </button>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-amber-300 hover:text-amber-100 transition shrink-0 p-0.5 rounded hover:bg-white/10 cursor-pointer"
          aria-label="Dismiss browser scan banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </Panel>
  );
};
