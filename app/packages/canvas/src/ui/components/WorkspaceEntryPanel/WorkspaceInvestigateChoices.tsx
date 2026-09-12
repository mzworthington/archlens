import React from 'react';
import { AlertTriangle, FolderOpen, ScanSearch, Search, X } from 'lucide-react';
import { isBrowserDirectoryPickerSupported } from '../../../infrastructure/analysis/browserSourceWalker';
import { WorkspaceEntryOption } from './WorkspaceEntryOption';
import { WorkspaceIntentCard } from './WorkspaceIntentCard';
import { intentHeadingIconClass } from './workspaceEntryChrome';
import { optionClass } from './workspaceEntryChrome';

const ZIP_LITE_SCAN_ACCESSIBLE_NAME = 'Upload ZIP for browser lite scan';
const ZIP_LITE_SCAN_CANCELLED_MESSAGE = 'Scan cancelled. Upload a ZIP of the repo to try again.';
const ZIP_LITE_SCAN_FAILED_MESSAGE =
  'That ZIP could not be scanned. Try another archive, or pick a folder.';

export type BrowserLiteScanSource = {
  zipFile?: File;
};

export type WorkspaceInvestigateChoicesProps = {
  actionsDisabled: boolean;
  onOpenDirectory: () => void;
  onBrowserLiteScan?: (source?: BrowserLiteScanSource) => void | Promise<boolean>;
};

export const WorkspaceInvestigateChoices: React.FC<WorkspaceInvestigateChoicesProps> = ({
  actionsDisabled,
  onOpenDirectory,
  onBrowserLiteScan,
}) => {
  const [liteScanFeedback, setLiteScanFeedback] = React.useState<string | null>(null);
  const zipInputRef = React.useRef<HTMLInputElement>(null);
  const directoryPickerSupported = isBrowserDirectoryPickerSupported();

  React.useEffect(() => {
    const input = zipInputRef.current;
    if (!input) return undefined;
    const onCancel = () => setLiteScanFeedback(ZIP_LITE_SCAN_CANCELLED_MESSAGE);
    input.addEventListener('cancel', onCancel);
    return () => input.removeEventListener('cancel', onCancel);
  }, []);

  const openZipPicker = () => {
    setLiteScanFeedback(null);
    zipInputRef.current?.click();
  };

  const handleBrowserLiteScan = () => {
    if (!directoryPickerSupported) {
      openZipPicker();
      return;
    }
    void onBrowserLiteScan?.();
  };

  const handleZipSelected = async (file: File | undefined) => {
    if (!file) {
      setLiteScanFeedback(ZIP_LITE_SCAN_CANCELLED_MESSAGE);
      return;
    }
    const opened = await onBrowserLiteScan?.({ zipFile: file });
    if (opened === false) {
      setLiteScanFeedback(ZIP_LITE_SCAN_FAILED_MESSAGE);
    }
  };

  return (
    <WorkspaceIntentCard
      testId="workspace-intent-investigate"
      titleId="workspace-intent-investigate-title"
      title="Investigate"
      subtitle="Map real systems"
      icon={<Search className={intentHeadingIconClass} aria-hidden />}
    >
      {onBrowserLiteScan ? (
        <>
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            data-testid="workspace-browser-lite-scan-zip-input"
            onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              void handleZipSelected(file);
            }}
          />
          <WorkspaceEntryOption
            testId="workspace-browser-lite-scan"
            onClick={handleBrowserLiteScan}
            disabled={actionsDisabled}
            className={optionClass}
            ariaLabel={directoryPickerSupported ? undefined : ZIP_LITE_SCAN_ACCESSIBLE_NAME}
            icon={<ScanSearch className="w-4 h-4 shrink-0 mt-0.5 text-[#00f0ff]" />}
            title="Browser lite scan"
            titleExtra={
              <span
                className="inline-flex items-center rounded border border-amber-500/40 bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-amber-300"
                data-testid="workspace-browser-lite-badge"
              >
                Lite
              </span>
            }
            descriptionClassName="text-slate-400"
            description={
              directoryPickerSupported
                ? 'TS, JS, Python, Go, Java, C#, Terraform, Pulumi'
                : 'Upload a ZIP of the repo — this browser cannot pick a folder'
            }
          />
          {directoryPickerSupported ? (
            <button
              type="button"
              data-testid="workspace-browser-lite-scan-zip"
              onClick={openZipPicker}
              disabled={actionsDisabled}
              aria-label={ZIP_LITE_SCAN_ACCESSIBLE_NAME}
              className="mt-1 w-full px-1 text-left text-[11px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/40 rounded disabled:opacity-50 disabled:pointer-events-none"
            >
              Or upload a ZIP of the repo
            </button>
          ) : null}
        </>
      ) : null}

      {liteScanFeedback ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-950/50 px-3 py-2 text-xs text-amber-100"
          role="alert"
          data-testid="workspace-browser-lite-feedback"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <p className="leading-relaxed flex-1">{liteScanFeedback}</p>
          <button
            type="button"
            onClick={() => setLiteScanFeedback(null)}
            className="shrink-0 rounded p-0.5 text-amber-200/80 hover:bg-white/10 hover:text-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
            aria-label="Dismiss scan error"
            data-testid="workspace-browser-lite-feedback-dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}

      <WorkspaceEntryOption
        testId="workspace-open-directory"
        onClick={onOpenDirectory}
        disabled={actionsDisabled}
        icon={<FolderOpen className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />}
        title="Open existing blueprints folder"
        description="Pick a local folder of blueprints"
      />
    </WorkspaceIntentCard>
  );
};
