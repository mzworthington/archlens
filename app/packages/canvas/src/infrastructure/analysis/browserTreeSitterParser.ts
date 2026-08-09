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

export type TreeSitterParserLike = {
  setLanguage: (language: unknown) => void;
  parse: (content: string) => { delete: () => void };
};

export type BrowserTreeSitterRuntime = {
  init: () => Promise<boolean>;
  loadLanguageForFile: (filepath: string) => Promise<{ language: unknown } | null>;
  createParser: () => TreeSitterParserLike;
};

const defaultRuntime: BrowserTreeSitterRuntime = {
  init: initTreeSitter,
  loadLanguageForFile: loadTreeSitterLanguageForFile,
  createParser: () => new Parser() as unknown as TreeSitterParserLike,
};

/**
 * Browser CodebaseParserPort backed by tree-sitter WASM.
 * Falls back to lightweight specifier extraction when WASM is unavailable
 * or when an individual file fails to parse.
 */
export class BrowserTreeSitterParser implements CodebaseParserPort {
  private readonly fallback: BrowserSourceParser;
  private readonly runtime: BrowserTreeSitterRuntime;

  constructor(
    private readonly sources: readonly LiteScanSourceFile[],
    private readonly cwd: string = '/scan',
    private readonly logger?: BrowserParserLogger,
    runtime: Partial<BrowserTreeSitterRuntime> = {}
  ) {
    this.fallback = new BrowserSourceParser(sources, cwd);
    this.runtime = { ...defaultRuntime, ...runtime };
  }

  async parseSourceFiles(globPattern: string, signal?: AbortSignal): Promise<ParsedSourceFile[]> {
    throwIfAborted(signal);
    if (!(await this.runtime.init())) {
      this.logger?.warn('Tree-sitter unavailable; using lightweight browser parser');
      return this.fallback.parseSourceFiles(globPattern, signal);
    }

    let parser: TreeSitterParserLike | null = null;
    const parsed: ParsedSourceFile[] = [];
    let attempted = 0;
    let failed = 0;
    let fellBack = 0;

    for (const source of this.sources) {
      throwIfAborted(signal);
      const relativePath = source.relativePath.replace(/\\/g, '/');
      if (!isLiteScanSourcePath(relativePath)) continue;

      attempted += 1;
      const loaded = await this.runtime.loadLanguageForFile(relativePath);
      if (!loaded) {
        const lightweight = this.fallback.parseOne(source);
        if (lightweight) {
          parsed.push(lightweight);
          fellBack += 1;
        } else {
          failed += 1;
        }
        continue;
      }

      parser ??= this.runtime.createParser();
      let tree: { delete: () => void } | null = null;
      try {
        parser.setLanguage(loaded.language);
        tree = parser.parse(source.content);
        parsed.push(
          extractParsedSourceFileFromTree({
            filePath: `${this.cwd}/${relativePath}`.replace(/\/{2,}/g, '/'),
            relativePath,
            tree: tree as never,
          })
        );
      } catch {
        const lightweight = this.fallback.parseOne(source);
        if (lightweight) {
          parsed.push(lightweight);
          fellBack += 1;
        } else {
          failed += 1;
        }
      } finally {
        tree?.delete();
      }
    }

    if (attempted > 0 && parsed.length === 0) {
      this.logger?.warn('Tree-sitter parsed no files; using lightweight browser parser', {
        attempted,
        failed,
      });
      return this.fallback.parseSourceFiles(globPattern, signal);
    }

    if (failed > 0 || fellBack > 0) {
      this.logger?.warn('Some files used lightweight parse fallback during browser scan', {
        attempted,
        failed,
        fellBack,
      });
    }

    return parsed;
  }
}
