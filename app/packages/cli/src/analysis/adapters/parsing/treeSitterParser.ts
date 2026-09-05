import Parser from 'web-tree-sitter';
import * as path from 'path';
import * as fs from 'fs';
import type { CodebaseParserPort } from '@archlens/analysis/ports';
import type { ParsedSourceFile } from '@archlens/analysis/types';
import type { AnalysisOptions } from '@archlens/analysis/options';
import { extractParsedSourceFileFromTree } from '@archlens/analysis/tree-sitter-extract';
import { createSourcePathFilter, type SourcePathFilter } from '../pathFilter/sourcePathFilter.ts';
import { throwIfAborted } from '@archlens/analysis/cancellation';
import { TreeSitterWasmLoader } from './treeSitterLoader.ts';
import type { TreeSitterScanCache } from './treeSitterForensics.ts';
import { parseIncludeGlobPattern } from './includeGlobPattern.ts';

export class TreeSitterParserAdapter implements CodebaseParserPort {
  private readonly wasmLoader = new TreeSitterWasmLoader();
  private pathFilter: SourcePathFilter = createSourcePathFilter();

  constructor(
    private options: Pick<AnalysisOptions, 'ignore' | 'include'> = { ignore: [], include: [] },
    private scanCache?: TreeSitterScanCache
  ) {}

  private async getLanguage(ext: string): Promise<Parser.Language | null> {
    return this.wasmLoader.getLanguageForExtension(ext);
  }

  private getFilesRecursively(dir: string, extensions: string[]): string[] {
    if (!fs.existsSync(dir)) return [];
    const results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      try {
        const relativePath = path.relative(process.cwd(), filePath);
        if (this.pathFilter.shouldSkip(relativePath)) {
          return;
        }

        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results.push(...this.getFilesRecursively(filePath, extensions));
        } else {
          const ext = path.extname(file).toLowerCase();
          if (extensions.includes(ext)) {
            results.push(filePath);
          }
        }
      } catch {}
    });
    return results;
  }

  async parseSourceFiles(globPattern: string, signal?: AbortSignal): Promise<ParsedSourceFile[]> {
    throwIfAborted(signal);
    await TreeSitterWasmLoader.ensureInitialized();
    this.pathFilter = createSourcePathFilter(process.cwd(), this.options);

    const { dir, extensions } = parseIncludeGlobPattern(globPattern, process.cwd());
    const matchedFiles = this.getFilesRecursively(dir, extensions);

    const result: ParsedSourceFile[] = [];
    const parser = new Parser();

    for (const filePath of matchedFiles) {
      throwIfAborted(signal);
      const ext = path.extname(filePath).toLowerCase();
      const lang = await this.getLanguage(ext);
      if (!lang) continue;

      parser.setLanguage(lang);

      const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
      const cached = this.scanCache?.get(relativePath);

      let tree: Parser.Tree;
      let ownsTree = false;
      try {
        if (cached) {
          tree = cached.tree;
        } else {
          const content = fs.readFileSync(filePath, 'utf8');
          tree = parser.parse(content);
          ownsTree = true;
        }
      } catch {
        continue;
      }

      try {
        result.push(
          extractParsedSourceFileFromTree({
            filePath,
            relativePath,
            tree,
          })
        );
      } finally {
        if (ownsTree) {
          tree.delete();
        }
      }
    }

    return result;
  }
}
