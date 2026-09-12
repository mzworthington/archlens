import { unzipSync, strFromU8 } from 'fflate';
import { throwIfAborted } from '@archlens/analysis/cancellation';
import { LITE_SCAN_MAX_TOTAL_BYTES } from '../../application/analysis/liteScanLimits';
import type { MemoryScanEntry } from '../../application/analysis/collectLiteScanFromEntries';

export class ZipScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipScanError';
  }
}

export const ZIP_SCAN_INVALID_MESSAGE =
  'This ZIP could not be read. Pick a valid repository archive, or install the ArchLens CLI.';

export const ZIP_SCAN_TOO_LARGE_MESSAGE =
  'This ZIP is larger than the in-tab scan budget. Install the ArchLens CLI for a full scan.';

export function unzipLiteScanArchive(
  bytes: Uint8Array,
  options: { signal?: AbortSignal; maxTotalBytes?: number } = {}
): MemoryScanEntry[] {
  throwIfAborted(options.signal);
  const maxTotalBytes = options.maxTotalBytes ?? LITE_SCAN_MAX_TOTAL_BYTES;
  if (bytes.byteLength > maxTotalBytes) {
    throw new ZipScanError(ZIP_SCAN_TOO_LARGE_MESSAGE);
  }

  let unzipped: ReturnType<typeof unzipSync>;
  try {
    unzipped = unzipSync(bytes);
  } catch {
    throw new ZipScanError(ZIP_SCAN_INVALID_MESSAGE);
  }

  const entries: MemoryScanEntry[] = [];
  let total = 0;
  for (const [name, data] of Object.entries(unzipped)) {
    throwIfAborted(options.signal);
    if (!data || name.endsWith('/')) continue;
    if (zipPathHasTraversal(name)) {
      throw new ZipScanError(ZIP_SCAN_INVALID_MESSAGE);
    }
    total += data.byteLength;
    if (total > maxTotalBytes) {
      throw new ZipScanError(ZIP_SCAN_TOO_LARGE_MESSAGE);
    }
    let content: string;
    try {
      content = strFromU8(data);
    } catch {
      continue;
    }
    entries.push({
      relativePath: name,
      content,
      size: data.byteLength,
    });
  }
  return entries;
}

function zipPathHasTraversal(name: string): boolean {
  return name.replace(/\\/g, '/').split('/').includes('..');
}
