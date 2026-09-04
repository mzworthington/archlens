/** Live progress for an in-browser structural scan (no git). */

export type LiteScanPhase = 'walking' | 'reading' | 'analyzing';

export type LiteScanProgress = {
  phase: LiteScanPhase;
  filesScanned: number;
  fileCap: number;
  bytesRead: number;
  byteCap: number;
};

/** Decimal megabytes so the 8_000_000 byte cap reads as 8.0 MB. */
export function formatByteCount(bytes: number): string {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function formatLiteScanFileProgress(progress: LiteScanProgress): string {
  if (progress.phase === 'walking') {
    return `${progress.filesScanned} files found (cap ${progress.fileCap})`;
  }
  return `${progress.filesScanned} / ${progress.fileCap} files`;
}

export function formatLiteScanByteProgress(progress: LiteScanProgress): string {
  return `${formatByteCount(progress.bytesRead)} of ${formatByteCount(progress.byteCap)}`;
}

/** Byte line is binding once we are reading or already using the budget. */
export function isLiteScanByteBudgetBinding(progress: LiteScanProgress): boolean {
  if (progress.phase === 'walking') return false;
  return progress.bytesRead > 0 || progress.phase === 'reading' || progress.phase === 'analyzing';
}

export function liteScanProgressLabel(progress: LiteScanProgress): string {
  if (progress.phase === 'analyzing') return 'Building map from scanned files';
  if (progress.phase === 'walking') return 'Looking through the folder';
  return 'Reading source files';
}
