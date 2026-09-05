import React from 'react';
import { Panel } from '@xyflow/react';
import { ScanSearch, Terminal, X } from 'lucide-react';
import { Link } from 'wouter';
import { CLI_GETTING_STARTED_PATH } from '../../../../../constants/cli';

type BrowserLiteScanBannerProps = {
  open: boolean;
  onDismiss: () => void;
  onSaveMap?: () => void;
  showSave?: boolean;
};

/** Sticky reminder that the open workspace is a structure-only browser scan. */
export const BrowserLiteScanBanner: React.FC<BrowserLiteScanBannerProps> = ({
  open,
  onDismiss,
  onSaveMap,
  showSave = false,
}) => {
  if (!open) return null;

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
            <h5 className="font-bold text-amber-200">Browser lite scan</h5>
            <span className="inline-flex items-center rounded border border-amber-500/45 bg-amber-900/60 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-amber-300">
              Structure only
            </span>
          </div>
          <p className="leading-relaxed text-amber-100/90">
            This map has no TraceLens git hotspots or CI publish. Install the ArchLens CLI for
            in-depth forensics, watch mode and catalog workflows.
          </p>
          {showSave && onSaveMap ? (
            <button
              type="button"
              onClick={onSaveMap}
              className="inline-flex items-center rounded-md border border-amber-400/40 bg-amber-900/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-100 hover:bg-amber-800/60 cursor-pointer"
              data-testid="browser-lite-scan-banner-save"
            >
              Save map to folder
            </button>
          ) : null}
          <Link
            href={CLI_GETTING_STARTED_PATH}
            className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-[#00f0ff] hover:underline"
            data-testid="browser-lite-scan-banner-cli"
          >
            <Terminal className="w-3 h-3" aria-hidden />
            Install CLI & run a full scan
          </Link>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-amber-300 hover:text-amber-100 transition shrink-0 p-0.5 rounded hover:bg-white/10 cursor-pointer"
          aria-label="Dismiss lite scan banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </Panel>
  );
};
