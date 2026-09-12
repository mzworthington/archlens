import { CodebaseAnalyzer } from '@archlens/analysis/analyzer';
import { IacAnalyzer } from '@archlens/analysis/iac';
import { DEFAULT_SCAN_GLOB } from '@archlens/analysis/options';
import type { AnalysisFileSystemPort, CodebaseParserPort } from '@archlens/analysis/ports';
import type { LoggerPort } from '@archlens/analysis/ports';
import type { FileMetrics } from '@archlens/analysis/forensics';
import { slugifyWorkspaceName } from './slugifyWorkspaceName';
import type { BrowserGitHistoryStatus } from './browserGitStatus';

export const BROWSER_SCAN_CWD = '/scan';
const BROWSER_SCAN_OUTPUT_ROOT = `${BROWSER_SCAN_CWD}/blueprints`;
const BROWSER_SCAN_GLOB = DEFAULT_SCAN_GLOB;

/** Analysis filesystem that can hand back the YAML the writers produced. */
export type ScanFileSystemPort = AnalysisFileSystemPort & {
  collectWrittenYamlFiles: (outputRoot: string) => Array<{ name: string; content: string }>;
};

export type BrowserAnalysisResult = {
  yamlFiles: Array<{ name: string; content: string }>;
  contextName: string;
  gitStatus: BrowserGitHistoryStatus;
};

export type BrowserAnalysisDeps = {
  parser: CodebaseParserPort;
  fileSystem: ScanFileSystemPort;
  logger: LoggerPort;
};

/**
 * Runs the shared analyzer over pre-walked sources. Adapters are injected by the
 * caller (worker entry or store) so this stays free of browser infrastructure.
 * Mirrors the CLI: ForensicAnalyzer metrics (when git history is present), then
 * CodebaseAnalyzer, then IacAnalyzer for Terraform/Pulumi.
 */
export async function runBrowserAnalysis(args: {
  directoryName: string;
  deps: BrowserAnalysisDeps;
  signal?: AbortSignal;
  forensicsByPath?: ReadonlyMap<string, FileMetrics>;
  gitStatus?: BrowserGitHistoryStatus;
}): Promise<BrowserAnalysisResult> {
  const contextName = slugifyWorkspaceName(args.directoryName);
  const analyzer = new CodebaseAnalyzer({
    parser: args.deps.parser,
    fileSystem: args.deps.fileSystem,
    logger: args.deps.logger,
    analysisOptions: {
      ignore: [],
      include: [],
      rollupModules: false,
      systems: [],
    },
  });

  const discoveredSystems = await analyzer.runAnalysis(
    contextName,
    BROWSER_SCAN_OUTPUT_ROOT,
    BROWSER_SCAN_GLOB,
    args.signal,
    args.forensicsByPath && args.forensicsByPath.size > 0
      ? { forensicsByPath: args.forensicsByPath }
      : {}
  );

  const iacAnalyzer = new IacAnalyzer({
    fileSystem: args.deps.fileSystem,
    logger: args.deps.logger,
    parser: args.deps.parser,
  });
  await iacAnalyzer.run(contextName, BROWSER_SCAN_OUTPUT_ROOT, {
    scanRoot: BROWSER_SCAN_CWD,
    signal: args.signal,
    discoveredSystems,
  });

  return {
    contextName,
    yamlFiles: args.deps.fileSystem.collectWrittenYamlFiles(BROWSER_SCAN_OUTPUT_ROOT),
    gitStatus: args.gitStatus ?? 'missing',
  };
}
