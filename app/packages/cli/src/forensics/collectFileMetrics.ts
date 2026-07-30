import path from 'path';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import { ForensicAnalyzer } from './domain/forensicAnalyzer.ts';
import type { ForensicsOptions } from './domain/options.ts';
import type { FileMetrics } from './domain/types.ts';
import { normalizeFilePath } from './domain/attachForensics.ts';
import { GitLogHistoryAdapter } from './adapters/gitLogHistory.ts';
import { TreeSitterImportGraphAdapter } from './adapters/treeSitterImportGraph.ts';
import type { TreeSitterScanCache } from '../analysis/adapters/parsing/treeSitterForensics.ts';
import { loadForensicsConfig, resolveForensicsOptions } from './adapters/loadForensicsConfig.ts';
import { SourceFileListerAdapter } from './adapters/sourceFileLister.ts';
import { TreeSitterComplexityAdapter } from './adapters/treeSitterComplexity.ts';
import type { GitForensicsCliFlags } from '../cli/parseArchlensArgv.ts';

/**
 * Collect per-file forensics metrics for attaching onto architecture nodes.
 * Does not write reports - blueprints YAML is the deliverable.
 */
export async function collectFileMetrics(
  git: GitForensicsCliFlags,
  cwd: string = process.cwd(),
  signal?: AbortSignal,
  deps: {
    explicitPaths?: string[];
    scanCache?: TreeSitterScanCache;
  } = {}
): Promise<Map<string, FileMetrics>> {
  const rootPath = path.resolve(cwd, git.targetPath);
  const fileConfig = loadForensicsConfig(rootPath);
  const options = resolveForensicsOptions(fileConfig, {
    sinceDays: git.sinceDays,
    glob: git.glob,
    ignore: [...(fileConfig.ignore ?? []), ...(git.ignore ?? [])],
  } satisfies Partial<ForensicsOptions>);

  const logger = new ConsoleLogger();
  const scanCache = deps.scanCache;
  const analyzer = new ForensicAnalyzer({
    fileLister: new SourceFileListerAdapter(rootPath),
    complexity: new TreeSitterComplexityAdapter(logger, rootPath, { scanCache }),
    gitHistory: new GitLogHistoryAdapter(),
    importGraph: new TreeSitterImportGraphAdapter(rootPath, scanCache),
    reporters: [],
  });

  const report = await analyzer.run({
    rootPath,
    options,
    explicitPaths: deps.explicitPaths,
    signal,
  });

  const byPath = new Map<string, FileMetrics>();
  for (const file of report.files) {
    byPath.set(normalizeFilePath(file.path), {
      ...file,
      sinceDays: options.sinceDays,
      ...(options.shortChurnDays > 0 && options.shortChurnDays < options.sinceDays
        ? { shortChurnDays: options.shortChurnDays }
        : {}),
    });
  }
  return byPath;
}
