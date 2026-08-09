import type { LoggerPort } from '@archlens/analysis/ports';
import type { LiteScanSourceFile } from '../../application/analysis/liteScanTypes';
import {
  BROWSER_SCAN_CWD,
  type BrowserAnalysisDeps,
} from '../../application/analysis/runBrowserAnalysis';
import { BrowserMemoryFileSystem } from './browserMemoryFileSystem';
import { BrowserTreeSitterParser } from './browserTreeSitterParser';

const noopLogger: LoggerPort = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

/** Composition root for the browser scan: memory filesystem + tree-sitter parser. */
export function createBrowserAnalysisDeps(args: {
  sources: readonly LiteScanSourceFile[];
  logger?: LoggerPort;
}): BrowserAnalysisDeps {
  const logger = args.logger ?? noopLogger;
  return {
    fileSystem: new BrowserMemoryFileSystem(args.sources, { cwd: BROWSER_SCAN_CWD }),
    parser: new BrowserTreeSitterParser(args.sources, BROWSER_SCAN_CWD, {
      warn: (message, context) => logger.warn(message, context),
    }),
    logger,
  };
}
