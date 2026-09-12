import {
  collectFileMetricsFromPorts,
  ContentComplexityAdapter,
  ContentFileLister,
  ContentImportGraphAdapter,
  StaticGitHistoryAdapter,
  type FileMetrics,
} from '@archlens/analysis/forensics';
import type { GitCommit } from '@archlens/core/forensics';
import { isLiteScanSourcePath } from './liteScanLimits';
import type { LiteScanSourceFile } from './liteScanTypes';
import { BROWSER_SCAN_CWD } from './runBrowserAnalysis';

function sourceMapFromLiteScan(sources: readonly LiteScanSourceFile[]): Map<string, string> {
  const files = new Map<string, string>();
  for (const source of sources) {
    const path = source.relativePath.replace(/\\/g, '/');
    if (!isLiteScanSourcePath(path)) continue;
    files.set(path, source.content);
  }
  return files;
}

export async function collectBrowserFileMetrics(args: {
  sources: readonly LiteScanSourceFile[];
  commits: readonly GitCommit[];
  signal?: AbortSignal;
}): Promise<Map<string, FileMetrics>> {
  const files = sourceMapFromLiteScan(args.sources);
  const paths = [...files.keys()];
  if (paths.length === 0) return new Map();

  return collectFileMetricsFromPorts(
    {
      fileLister: new ContentFileLister(paths),
      complexity: new ContentComplexityAdapter(files),
      gitHistory: new StaticGitHistoryAdapter(args.commits),
      importGraph: new ContentImportGraphAdapter(files),
      reporters: [],
    },
    {
      rootPath: BROWSER_SCAN_CWD,
      explicitPaths: paths,
      signal: args.signal,
    }
  );
}
