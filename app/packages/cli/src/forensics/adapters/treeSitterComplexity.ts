import fs from 'fs';
import path from 'path';
import Parser from 'web-tree-sitter';
import {
  countLocAndSloc,
  summarizeFunctionComplexitySlices,
  type CyclomaticLanguage,
} from '@archlens/core/forensics';
import { extensionToTreeSitterLanguage } from '@archlens/core';
import type { LoggerPort } from '../../analysis/domain/ports.ts';
import { throwIfAborted } from '../../analysis/domain/cancellation.ts';
import type { ForensicsOptions } from '../domain/options.ts';
import type { ComplexityAnalyzerPort } from '../domain/ports.ts';
import type { StructuralMetrics } from '../domain/types.ts';
import { TreeSitterWasmLoader } from '../../analysis/adapters/parsing/treeSitterLoader.ts';
import {
  collectCyclomaticAstNodes,
  collectFunctionComplexitySlices,
  type CachedTreeParse,
  type TreeSitterScanCache,
} from '../../analysis/adapters/parsing/treeSitterForensics.ts';

function extensionOf(relativePath: string): string {
  const dot = relativePath.lastIndexOf('.');
  return dot >= 0 ? relativePath.slice(dot).toLowerCase() : '';
}

function cyclomaticLanguageForPath(relativePath: string): CyclomaticLanguage | null {
  const langKey = extensionToTreeSitterLanguage(relativePath);
  if (!langKey || langKey === 'terraform' || langKey === 'hcl') {
    return null;
  }
  return langKey;
}

function metricsFromTree(
  cyclomaticLang: CyclomaticLanguage,
  cached: CachedTreeParse
): Pick<
  StructuralMetrics,
  'complexity' | 'complexityPeak' | 'cognitiveComplexity' | 'functionCount'
> {
  const fileNodes = collectCyclomaticAstNodes(cached.tree.rootNode);
  const slices = collectFunctionComplexitySlices(cached.tree.rootNode, cyclomaticLang);
  const summary = summarizeFunctionComplexitySlices(cyclomaticLang, slices, fileNodes);

  return {
    complexity: summary.complexityPeak,
    ...(summary.functionCount > 0
      ? {
          complexityPeak: summary.complexityPeak,
          cognitiveComplexity: summary.cognitivePeak > 0 ? summary.cognitivePeak : undefined,
          functionCount: summary.functionCount,
        }
      : {}),
  };
}

export interface TreeSitterComplexityAdapterOptions {
  scanCache?: TreeSitterScanCache;
}

export class TreeSitterComplexityAdapter implements ComplexityAnalyzerPort {
  private readonly loader = new TreeSitterWasmLoader();
  private readonly scanCache?: TreeSitterScanCache;

  constructor(
    private readonly logger: LoggerPort,
    private readonly cwd: string = process.cwd(),
    options: TreeSitterComplexityAdapterOptions = {}
  ) {
    this.scanCache = options.scanCache;
  }

  async analyze(
    paths: string[],
    _options: ForensicsOptions,
    signal?: AbortSignal
  ): Promise<StructuralMetrics[]> {
    throwIfAborted(signal);
    await TreeSitterWasmLoader.ensureInitialized();

    const parser = new Parser();
    const results: StructuralMetrics[] = [];

    for (const relativePath of paths) {
      throwIfAborted(signal);
      const normalizedPath = relativePath.replace(/\\/g, '/');
      const absolute = path.resolve(this.cwd, relativePath);

      try {
        if (!fs.existsSync(absolute)) {
          this.logger.warn('Skipping missing file for complexity analysis', { path: relativePath });
          continue;
        }

        const text = fs.readFileSync(absolute, 'utf8');
        const { loc, sloc } = countLocAndSloc(text);
        const cyclomaticLang = cyclomaticLanguageForPath(normalizedPath);

        let complexity = 0;
        let complexityPeak: number | undefined;
        let cognitiveComplexity: number | undefined;
        let functionCount: number | undefined;

        if (cyclomaticLang) {
          const ext = extensionOf(normalizedPath);
          let cached = this.scanCache?.get(normalizedPath);

          if (!cached) {
            const language = await this.loader.getLanguageForExtension(ext);
            if (language) {
              parser.setLanguage(language);
              const tree = parser.parse(text);
              cached = {
                relativePath: normalizedPath,
                text,
                tree,
                language: cyclomaticLang,
                ext,
              };
              this.scanCache?.put(cached);
            }
          }

          if (cached) {
            const derived = metricsFromTree(cyclomaticLang, cached);
            complexity = derived.complexity;
            complexityPeak = derived.complexityPeak;
            cognitiveComplexity = derived.cognitiveComplexity;
            functionCount = derived.functionCount;
          }
        }

        results.push({
          path: normalizedPath,
          complexity,
          loc,
          sloc,
          ...(complexityPeak !== undefined ? { complexityPeak } : {}),
          ...(cognitiveComplexity !== undefined ? { cognitiveComplexity } : {}),
          ...(functionCount !== undefined ? { functionCount } : {}),
        });
      } catch (error) {
        this.logger.warn('Failed to analyze structural metrics; continuing', {
          path: relativePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }
}
