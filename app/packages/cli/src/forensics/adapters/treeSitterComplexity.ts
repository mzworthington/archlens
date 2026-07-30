import fs from 'fs';
import path from 'path';
import Parser from 'web-tree-sitter';
import {
  countCyclomaticComplexity,
  countLocAndSloc,
  type CyclomaticAstNode,
  type CyclomaticLanguage,
} from '@archlens/core/forensics';
import { extensionToTreeSitterLanguage } from '@archlens/core';
import type { LoggerPort } from '../../analysis/domain/ports.ts';
import { throwIfAborted } from '../../analysis/domain/cancellation.ts';
import type { ForensicsOptions } from '../domain/options.ts';
import type { ComplexityAnalyzerPort } from '../domain/ports.ts';
import type { StructuralMetrics } from '../domain/types.ts';
import { TreeSitterWasmLoader } from '../../analysis/adapters/parsing/treeSitterLoader.ts';

function extensionOf(relativePath: string): string {
  const dot = relativePath.lastIndexOf('.');
  return dot >= 0 ? relativePath.slice(dot).toLowerCase() : '';
}

function collectCyclomaticAstNodes(root: Parser.SyntaxNode): CyclomaticAstNode[] {
  const nodes: CyclomaticAstNode[] = [];

  const walk = (node: Parser.SyntaxNode) => {
    let operatorText: string | undefined;
    if (node.type === 'binary_expression') {
      const operator = node.childForFieldName('operator');
      operatorText = operator?.text;
    }

    nodes.push({ type: node.type, operatorText });

    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i)!);
    }
  };

  walk(root);
  return nodes;
}

function cyclomaticLanguageForPath(relativePath: string): CyclomaticLanguage | null {
  const langKey = extensionToTreeSitterLanguage(relativePath);
  if (!langKey || langKey === 'terraform' || langKey === 'hcl') {
    return null;
  }
  return langKey;
}

export class TreeSitterComplexityAdapter implements ComplexityAnalyzerPort {
  private readonly loader = new TreeSitterWasmLoader();

  constructor(
    private readonly logger: LoggerPort,
    private readonly cwd: string = process.cwd()
  ) {}

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

        if (cyclomaticLang) {
          const ext = extensionOf(normalizedPath);
          const language = await this.loader.getLanguageForExtension(ext);
          if (language) {
            parser.setLanguage(language);
            const tree = parser.parse(text);
            const nodes = collectCyclomaticAstNodes(tree.rootNode);
            complexity = countCyclomaticComplexity(cyclomaticLang, nodes);
          }
        }

        results.push({
          path: normalizedPath,
          complexity,
          loc,
          sloc,
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
