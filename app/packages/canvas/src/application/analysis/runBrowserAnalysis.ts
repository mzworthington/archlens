import { CodebaseAnalyzer } from '@archlens/analysis/analyzer';
import type { LiteScanSourceFile } from './liteScanTypes';
import { BrowserMemoryFileSystem } from '../../infrastructure/analysis/browserMemoryFileSystem';
import { BrowserTreeSitterParser } from '../../infrastructure/analysis/browserTreeSitterParser';
import { createAnalysisLogger } from '../../infrastructure/analysis/analysisLogger';
import { slugifyWorkspaceName } from './slugifyWorkspaceName';

export type BrowserAnalysisResult = {
  yamlFiles: Array<{ name: string; content: string }>;
  contextName: string;
};

export type BrowserAnalysisLogger = {
  info: (m: string, meta?: Record<string, unknown>) => void;
  warn: (m: string, meta?: Record<string, unknown>) => void;
  error: (m: string, err?: unknown) => void;
};

const noopLogger: BrowserAnalysisLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export async function runBrowserAnalysis(args: {
  sources: readonly LiteScanSourceFile[];
  directoryName: string;
  logger?: BrowserAnalysisLogger;
  signal?: AbortSignal;
}): Promise<BrowserAnalysisResult> {
  const contextName = slugifyWorkspaceName(args.directoryName);
  const cwd = '/scan';
  const outputRoot = `${cwd}/blueprints`;
  const fileSystem = new BrowserMemoryFileSystem(args.sources, { cwd });
  const parser = new BrowserTreeSitterParser(args.sources, cwd);
  const analyzer = new CodebaseAnalyzer({
    parser,
    fileSystem,
    logger: createAnalysisLogger(args.logger ?? noopLogger),
    analysisOptions: {
      ignore: [],
      include: [],
      rollupModules: false,
      systems: [],
    },
  });

  await analyzer.runAnalysis(contextName, outputRoot, '**/*.{ts,tsx,js,jsx}', args.signal);
  return {
    contextName,
    yamlFiles: fileSystem.collectWrittenYamlFiles(outputRoot),
  };
}
