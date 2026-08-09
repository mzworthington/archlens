import Parser from 'web-tree-sitter';
import type { CodebaseParserPort } from '@archlens/analysis/ports';
import type { ParsedSourceFile } from '@archlens/analysis/types';
import { extractParsedSourceFileFromTree } from '@archlens/analysis/tree-sitter-extract';
import { throwIfAborted } from '@archlens/analysis/cancellation';
import {
  initTreeSitter,
  loadTreeSitterLanguageForFile,
} from '../../application/parsing/treeSitterClient';
import type { LiteScanSourceFile } from '../../application/analysis/liteScanTypes';
import { isLiteScanSourcePath } from '../../application/analysis/liteScanLimits';
import { BrowserSourceParser } from './browserSourceParser';

export type BrowserParserLogger = {
  warn: (message: string, context?: Record<string, unknown>) => void;
};

/**
 * Browser CodebaseParserPort backed by tree-sitter WASM.
 * Falls back to lightweight specifier extraction when WASM is unavailable.
 */
export class BrowserTreeSitterParser implements CodebaseParserPort {
  private readonly fallback: BrowserSourceParser;

  constructor(
    private readonly sources: readonly LiteScanSourceFile[],
    private readonly cwd: string = '/scan',
    private readonly logger?: BrowserParserLogger
  ) {
    this.fallback = new BrowserSourceParser(sources, cwd);
  }

  async parseSourceFiles(globPattern: string, signal?: AbortSignal): Promise<ParsedSourceFile[]> {
    throwIfAborted(signal);
    if (!(await initTreeSitter())) {
      this.logger?.warn('Tree-sitter unavailable; using lightweight browser parser');
      return this.fallback.parseSourceFiles(globPattern, signal);
    }

    const parser = new Parser();
    const parsed: ParsedSourceFile[] = [];
    let attempted = 0;
    let failed = 0;

    for (const source of this.sources) {
      throwIfAborted(signal);
      const relativePath = source.relativePath.replace(/\\/g, '/');
      if (!isLiteScanSourcePath(relativePath)) continue;

      attempted += 1;
      const loaded = await loadTreeSitterLanguageForFile(relativePath);
      if (!loaded) {
        failed += 1;
        continue;
      }

      try {
        parser.setLanguage(loaded.language);
        const tree = parser.parse(source.content);
        parsed.push(
          extractParsedSourceFileFromTree({
            filePath: `${this.cwd}/${relativePath}`.replace(/\/{2,}/g, '/'),
            relativePath,
            tree,
          })
        );
      } catch {
        // A single malformed file should not block onboarding feedback.
        failed += 1;
      }
    }

    if (attempted > 0 && parsed.length === 0) {
      this.logger?.warn('Tree-sitter parsed no files; using lightweight browser parser', {
        attempted,
        failed,
      });
      return this.fallback.parseSourceFiles(globPattern, signal);
    }

    if (failed > 0) {
      this.logger?.warn('Some files could not be parsed during browser scan', {
        attempted,
        failed,
      });
    }

    return parsed;
  }
}
