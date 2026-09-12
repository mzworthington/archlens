import React from 'react';
import { AlertTriangle, FolderOpen, ScanSearch, Search, Upload } from 'lucide-react';
import { isBrowserDirectoryPickerSupported } from '../../../infrastructure/analysis/browserSourceWalker';
import { WorkspaceEntryOption } from './WorkspaceEntryOption';
import { WorkspaceIntentCard } from './WorkspaceIntentCard';
import { intentHeadingIconClass } from './workspaceEntryChrome';
import { optionClass } from './workspaceEntryChrome';

export type WorkspaceInvestigateChoicesProps = {
  actionsDisabled: boolean;
  onOpenDirectory: () => void;
  onBrowserLiteScan?: () => void;
  onBrowserLiteScanZip?: () => void;
};

export const WorkspaceInvestigateChoices: React.FC<WorkspaceInvestigateChoicesProps> = ({
  actionsDisabled,
  onOpenDirectory,
  onBrowserLiteScan,
  onBrowserLiteScanZip,
}) => {
  const directoryPickerSupported = isBrowserDirectoryPickerSupported();

  return (
    <WorkspaceIntentCard
      testId="workspace-intent-investigate"
      titleId="workspace-intent-investigate-title"
      title="Investigate"
      subtitle="Map real systems"
      icon={<Search className={intentHeadingIconClass} aria-hidden />}
    >
      {onBrowserLiteScan && directoryPickerSupported ? (
        <WorkspaceEntryOption
          testId="workspace-browser-lite-scan"
          onClick={onBrowserLiteScan}
          disabled={actionsDisabled}
          className={optionClass}
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
          description="TS, JS, Python, Go, Java, C#, Terraform, Pulumi — git hotspots when `.git` is present"
        />
      ) : null}

      {(onBrowserLiteScanZip || onBrowserLiteScan) && !directoryPickerSupported ? (
        <WorkspaceEntryOption
          testId="workspace-browser-lite-scan-zip"
          onClick={onBrowserLiteScanZip ?? onBrowserLiteScan!}
          disabled={actionsDisabled}
          className={optionClass}
          icon={<Upload className="w-4 h-4 shrink-0 mt-0.5 text-[#00f0ff]" />}
          title="Upload ZIP to scan"
          accessibleName="Upload ZIP"
          titleExtra={
            <span
              className="inline-flex items-center rounded border border-amber-500/40 bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-amber-300"
              data-testid="workspace-browser-lite-badge"
            >
              Lite
            </span>
          }
          descriptionClassName="text-slate-400"
          description="Safari and Firefox cannot pick a folder. Upload a ZIP of the repo instead — same scan caps as Chrome."
        />
      ) : null}

      {onBrowserLiteScanZip && directoryPickerSupported ? (
        <button
          type="button"
          data-testid="workspace-browser-lite-scan-zip"
          onClick={onBrowserLiteScanZip}
          disabled={actionsDisabled}
          className="w-full text-left text-xs font-semibold text-slate-400 hover:text-slate-200 px-1 py-1 rounded-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/40 disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Upload ZIP"
        >
          Upload ZIP instead
        </button>
      ) : null}

      {!directoryPickerSupported && (onBrowserLiteScanZip || onBrowserLiteScan) ? (
        <div
          id="workspace-browser-lite-zip-hint"
          className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-400"
          role="status"
          data-testid="workspace-browser-lite-zip-hint"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <p className="leading-relaxed">
            Folder picking is not available in this browser. Upload a ZIP, or install the ArchLens
            CLI below for watch mode and CI.
          </p>
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
