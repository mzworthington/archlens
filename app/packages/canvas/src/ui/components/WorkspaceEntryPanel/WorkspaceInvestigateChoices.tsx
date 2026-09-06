import React from 'react';
import { AlertTriangle, FolderOpen, ScanSearch, Search } from 'lucide-react';
import { isBrowserDirectoryPickerSupported } from '../../../infrastructure/analysis/browserSourceWalker';
import { WorkspaceEntryOption } from './WorkspaceEntryOption';
import { WorkspaceIntentCard } from './WorkspaceIntentCard';
import { intentHeadingIconClass } from './workspaceEntryChrome';
import { optionClass, unsupportedOptionClass } from './workspaceEntryChrome';

const BROWSER_LITE_UNSUPPORTED_MESSAGE =
  'Folder picking is not available in this browser (Firefox and Safari). Use Chrome or Edge, or install the ArchLens CLI below for a full scan.';

export type WorkspaceInvestigateChoicesProps = {
  actionsDisabled: boolean;
  onOpenDirectory: () => void;
  onBrowserLiteScan?: () => void;
  onNeedCliHelp: () => void;
};

export const WorkspaceInvestigateChoices: React.FC<WorkspaceInvestigateChoicesProps> = ({
  actionsDisabled,
  onOpenDirectory,
  onBrowserLiteScan,
  onNeedCliHelp,
}) => {
  const [liteScanFeedback, setLiteScanFeedback] = React.useState<string | null>(null);
  const directoryPickerSupported = isBrowserDirectoryPickerSupported();

  const handleBrowserLiteScan = () => {
    if (!directoryPickerSupported) {
      setLiteScanFeedback(BROWSER_LITE_UNSUPPORTED_MESSAGE);
      onNeedCliHelp();
    }
    onBrowserLiteScan?.();
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
        <WorkspaceEntryOption
          testId="workspace-browser-lite-scan"
          onClick={handleBrowserLiteScan}
          disabled={actionsDisabled}
          className={directoryPickerSupported ? optionClass : unsupportedOptionClass}
          ariaDescribedBy={
            !directoryPickerSupported ? 'workspace-browser-lite-unsupported' : undefined
          }
          icon={
            <ScanSearch
              className={`w-4 h-4 shrink-0 mt-0.5 ${directoryPickerSupported ? 'text-[#00f0ff]' : 'text-amber-400'}`}
            />
          }
          title="Browser lite scan"
          titleExtra={
            <>
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
            </>
          }
          descriptionClassName="text-slate-400"
          description={
            directoryPickerSupported
              ? 'TS, JS, Python, Go, Java, C#, Terraform, Pulumi'
              : 'Needs Chrome or Edge (folder picker API). Use the ArchLens CLI instead.'
          }
        />
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
