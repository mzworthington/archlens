import React from 'react';
import {
  formatLiteScanByteProgress,
  formatLiteScanFileProgress,
  isLiteScanByteBudgetBinding,
  liteScanProgressLabel,
  type LiteScanProgress,
} from '../../../application/analysis/liteScanProgress';

type BrowserLiteScanProgressProps = {
  progress: LiteScanProgress;
  onCancel: () => void;
};

/** Named progress + cancel for an in-flight browser lite scan. */
export const BrowserLiteScanProgress: React.FC<BrowserLiteScanProgressProps> = ({
  progress,
  onCancel,
}) => {
  const fileLabel = formatLiteScanFileProgress(progress);
  const showBytes = isLiteScanByteBudgetBinding(progress);
  const phaseLabel = liteScanProgressLabel(progress);
  const valueNow =
    progress.phase === 'walking'
      ? Math.min(progress.filesScanned, progress.fileCap)
      : progress.filesScanned;
  const valueMax = Math.max(progress.fileCap, 1);

  return (
    <div
      className="w-full space-y-2"
      data-testid="browser-lite-scan-progress"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={phaseLabel}
    >
      <p className="text-xs font-mono tracking-wider text-slate-300 uppercase">{phaseLabel}</p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuenow={valueNow}
        aria-valuemax={valueMax}
        aria-label={fileLabel}
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
        data-testid="browser-lite-scan-progress-bar"
      >
        <div
          className="h-full rounded-full bg-[#00f0ff] transition-[width]"
          style={{ width: `${Math.min(100, (valueNow / valueMax) * 100)}%` }}
        />
      </div>
      <p
        className="text-xs font-mono text-slate-300"
        data-testid="browser-lite-scan-progress-files"
      >
        {fileLabel}
      </p>
      {showBytes ? (
        <p
          className="text-xs font-mono text-slate-400"
          data-testid="browser-lite-scan-progress-bytes"
        >
          {formatLiteScanByteProgress(progress)}
        </p>
      ) : null}
      <p className="text-[11px] text-slate-500">Structure only — no git history.</p>
      <button
        type="button"
        onClick={onCancel}
        className="mt-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-900 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/40"
        data-testid="browser-lite-scan-cancel"
      >
        Cancel scan
      </button>
    </div>
  );
};
