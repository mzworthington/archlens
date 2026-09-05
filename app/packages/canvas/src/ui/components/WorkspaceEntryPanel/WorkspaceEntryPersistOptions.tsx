import React from 'react';
import { FolderOpen, Map, ScanSearch, AlertTriangle, Cloud, Search } from 'lucide-react';
import { isBrowserDirectoryPickerSupported } from '../../../infrastructure/analysis/browserSourceWalker';
import {
  intentCardClass,
  intentHeadingIconClass,
  intentHeadingRowClass,
  intentHeadingTitleClass,
  optionClass,
  sampleStripClass,
  unsupportedOptionClass,
} from './workspaceEntryStyles';

const BROWSER_LITE_UNSUPPORTED_MESSAGE =
  'Folder picking is not available in this browser (Firefox and Safari). Use Chrome or Edge, or install the ArchLens CLI below for a full scan.';

export type WorkspaceEntrySampleStripProps = {
  onOpenSample: () => void;
  actionsDisabled: boolean;
};

export const WorkspaceEntrySampleStrip: React.FC<WorkspaceEntrySampleStripProps> = ({
  onOpenSample,
  actionsDisabled,
}) => (
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
        Opens the golden journey with ChaosLens so you see blast radius and ranked advice first
      </span>
    </span>
  </button>
);

export type WorkspaceEntryPersistOptionsProps = {
  onOpenDirectory: () => void;
  onBrowserLiteScan?: () => void;
  onImportIac?: () => void;
  onRequestCopyCliExpand?: () => void;
  actionsDisabled: boolean;
};

export const WorkspaceEntryPersistOptions: React.FC<WorkspaceEntryPersistOptionsProps> = ({
  onOpenDirectory,
  onBrowserLiteScan,
  onImportIac,
  onRequestCopyCliExpand,
  actionsDisabled,
}) => {
  const [liteScanFeedback, setLiteScanFeedback] = React.useState<string | null>(null);
  const directoryPickerSupported = isBrowserDirectoryPickerSupported();

  const handleBrowserLiteScan = () => {
    if (!directoryPickerSupported) {
      setLiteScanFeedback(BROWSER_LITE_UNSUPPORTED_MESSAGE);
      onRequestCopyCliExpand?.();
    }
    onBrowserLiteScan?.();
  };

  return (
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
                <span className="text-sm font-semibold text-slate-100">Browser lite scan</span>
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
                  ? 'Structure only (no git): TS, JS, Python, Go, Java, C#, Terraform, Pulumi'
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
              Pick a local folder of blueprints
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
  );
};
