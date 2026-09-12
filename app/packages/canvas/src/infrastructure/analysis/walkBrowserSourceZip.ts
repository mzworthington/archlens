import { collectLiteScanFromEntries } from '../../application/analysis/collectLiteScanFromEntries';
import type { LiteScanWalkResult } from '../../application/analysis/collectLiteScanFromEntries';
import type { LiteScanProgress } from '../../application/analysis/liteScanProgress';
import { unzipLiteScanArchive } from './unzipLiteScanArchive';

export async function walkBrowserSourceZip(
  file: File,
  options: {
    maxFiles?: number;
    maxMetadataFiles?: number;
    maxFileBytes?: number;
    maxTotalBytes?: number;
    signal?: AbortSignal;
    onProgress?: (progress: LiteScanProgress) => void;
  } = {}
): Promise<LiteScanWalkResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = unzipLiteScanArchive(bytes, {
    signal: options.signal,
    maxTotalBytes: options.maxTotalBytes,
  });
  const directoryName = file.name.replace(/\.zip$/i, '') || 'scanned';
  return collectLiteScanFromEntries(entries, {
    directoryName,
    maxFiles: options.maxFiles,
    maxMetadataFiles: options.maxMetadataFiles,
    maxFileBytes: options.maxFileBytes,
    maxTotalBytes: options.maxTotalBytes,
    signal: options.signal,
    onProgress: options.onProgress,
  });
}
