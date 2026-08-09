import { CodebaseAnalyzer } from '@archlens/analysis/analyzer';
import { IacAnalyzer } from '@archlens/analysis/iac';
import { DEFAULT_SCAN_GLOB } from '@archlens/analysis/options';
import type { AnalysisFileSystemPort, CodebaseParserPort } from '@archlens/analysis/ports';
import type { LoggerPort } from '@archlens/analysis/ports';
import { slugifyWorkspaceName } from './slugifyWorkspaceName';

export const BROWSER_SCAN_CWD = '/scan';
export const BROWSER_SCAN_OUTPUT_ROOT = `${BROWSER_SCAN_CWD}/blueprints`;
export const BROWSER_SCAN_GLOB = DEFAULT_SCAN_GLOB;

/** Analysis filesystem that can hand back the YAML the writers produced. */
export type ScanFileSystemPort = AnalysisFileSystemPort & {
  collectWrittenYamlFiles: (outputRoot: string) => Array<{ name: string; content: string }>;
};

export type BrowserAnalysisResult = {
  yamlFiles: Array<{ name: string; content: string }>;
  contextName: string;
};

export type BrowserAnalysisDeps = {
  parser: CodebaseParserPort;
  fileSystem: ScanFileSystemPort;
  logger: LoggerPort;
};

/**
 * Runs the shared analyzer over pre-walked sources. Adapters are injected by the
 * caller (worker entry or store) so this stays free of browser infrastructure.
 * Mirrors the CLI: application CodebaseAnalyzer, then IacAnalyzer for Terraform/Pulumi.
 */
export async function runBrowserAnalysis(args: {
  directoryName: string;
  deps: BrowserAnalysisDeps;
  signal?: AbortSignal;
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
    args.signal
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
  };
}
