import React from 'react';
import { Loader2 } from 'lucide-react';
import { WORKSPACE_STARTUP } from '../../content/productOutcomes';
import type { LiteScanProgress } from '../../../application/analysis/liteScanProgress';
import { BrowserLiteScanProgress } from '../BrowserLiteScanProgress/BrowserLiteScanProgress';
import { WorkspaceEntryBlankChooser } from './WorkspaceEntryBlankChooser';
import { WorkspaceEntryCopyCliPanel, WorkspaceEntryCopyOptions } from './WorkspaceEntryCopyOptions';
import {
  WorkspaceEntryPersistOptions,
  WorkspaceEntrySampleStrip,
} from './WorkspaceEntryPersistOptions';

export type WorkspaceEntryPanelProps = {
  onOpenSample: () => void;
  onOpenDirectory: () => void;
  /** Structural browser scan - pick a source folder, no CLI install. */
  onBrowserLiteScan?: () => void;
  /** Import from Mermaid diagram. */
  onImportMermaid?: () => void;
  /** Import Terraform / Pulumi into an empty starter diagram. */
  onImportIac?: () => void;
  /** Start an empty diagram with no demo or folder loaded (Ideate). */
  onStartBlankCanvas?: () => void;
  /** Collaborate: blank canvas then share link. */
  onShareBlankCanvas?: () => void;
  /** Collaborate: open blueprints folder then share. */
  onShareDirectory?: () => void;
  /** Collaborate: open a YAML file then share. */
  onShareFile?: () => void;
  disabled?: boolean;
  /** Shown while sandbox/workspace open is in progress (disables actions). */
  loadingMessage?: string | false | null;
  /** Live browser lite scan progress (chooser). */
  scanProgress?: LiteScanProgress | null;
  onCancelScan?: () => void;
  showCliPanel?: boolean;
  title?: string;
  description?: React.ReactNode;
  badge?: string;
  layout?: 'stack' | 'grid';
  className?: string;
  testId?: string;
  titleId?: string;
};

/** Intent-first workspace entry - sample strip, then Investigate / Collaborate / Ideate. */
export const WorkspaceEntryPanel: React.FC<WorkspaceEntryPanelProps> = ({
  onOpenSample,
  onOpenDirectory,
  onBrowserLiteScan,
  onImportMermaid,
  onImportIac,
  onStartBlankCanvas,
  onShareBlankCanvas,
  onShareDirectory,
  onShareFile,
  disabled = false,
  loadingMessage = null,
  scanProgress = null,
  onCancelScan,
  showCliPanel = false,
  title = WORKSPACE_STARTUP.title,
  description = WORKSPACE_STARTUP.lede,
  badge = 'Workspace',
  layout = 'grid',
  className = '',
  testId = 'workspace-entry',
  titleId,
}) => {
  const [copyCliExpandSignal, setCopyCliExpandSignal] = React.useState(0);
  const statusMessage =
    typeof loadingMessage === 'string' && loadingMessage.trim() ? loadingMessage : null;
  const actionsDisabled = disabled || Boolean(statusMessage);
  const showCollaborate = Boolean(onShareBlankCanvas || onShareDirectory || onShareFile);

  return (
    <section className={className} data-testid={testId}>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff] mb-2">
        {badge}
      </p>
      <h2 id={titleId} className="text-lg font-bold text-white tracking-tight">
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-2xl">{description}</p>

      {scanProgress && onCancelScan ? (
        <div className="mt-4 rounded-xl border border-[#00f0ff]/25 bg-[#061125]/70 px-4 py-3">
          <BrowserLiteScanProgress progress={scanProgress} onCancel={onCancelScan} />
        </div>
      ) : statusMessage ? (
        <div
          className="mt-4 flex items-center gap-2 rounded-xl border border-[#00f0ff]/25 bg-[#061125]/70 px-4 py-3"
          role="status"
          aria-live="polite"
          aria-busy="true"
          data-testid="workspace-entry-loading"
        >
          <Loader2 className="w-4 h-4 animate-spin text-[#00f0ff] shrink-0" aria-hidden />
          <span className="text-xs font-mono tracking-wider text-slate-300 uppercase">
            {statusMessage}
          </span>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <WorkspaceEntrySampleStrip onOpenSample={onOpenSample} actionsDisabled={actionsDisabled} />

        {showCliPanel ? <WorkspaceEntryCopyCliPanel expandSignal={copyCliExpandSignal} /> : null}

        <div
          className={
            layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch' : 'space-y-3'
          }
          data-testid="workspace-intent-row"
        >
          <WorkspaceEntryPersistOptions
            onOpenDirectory={onOpenDirectory}
            onBrowserLiteScan={onBrowserLiteScan}
            onImportIac={onImportIac}
            onRequestCopyCliExpand={() => setCopyCliExpandSignal(signal => signal + 1)}
            actionsDisabled={actionsDisabled}
          />

          {showCollaborate ? (
            <WorkspaceEntryCopyOptions
              onShareBlankCanvas={onShareBlankCanvas}
              onShareDirectory={onShareDirectory}
              onShareFile={onShareFile}
              actionsDisabled={actionsDisabled}
            />
          ) : null}

          <WorkspaceEntryBlankChooser
            onStartBlankCanvas={onStartBlankCanvas}
            onImportMermaid={onImportMermaid}
            actionsDisabled={actionsDisabled}
          />
        </div>
      </div>
    </section>
  );
};
