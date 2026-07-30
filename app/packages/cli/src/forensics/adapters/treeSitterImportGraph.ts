import { throwIfAborted } from '../../analysis/domain/cancellation.ts';
import type { ForensicsOptions } from '../domain/options.ts';
import type { ImportGraphPort } from '../domain/ports.ts';
import {
  extractRelativeImportsFromTree,
  type TreeSitterScanCache,
} from '../../analysis/adapters/parsing/treeSitterForensics.ts';
import path from 'path';
import fs from 'fs';
import Parser from 'web-tree-sitter';
import { extensionToTreeSitterLanguage } from '@archlens/core';
import { TreeSitterWasmLoader } from '../../analysis/adapters/parsing/treeSitterLoader.ts';

export class TreeSitterImportGraphAdapter implements ImportGraphPort {
  private readonly loader = new TreeSitterWasmLoader();

  constructor(
    private readonly cwd: string = process.cwd(),
    private readonly scanCache?: TreeSitterScanCache
  ) {}

  async extractImports(
    paths: string[],
    _options: ForensicsOptions,
    signal?: AbortSignal
  ): Promise<Map<string, string[]>> {
    throwIfAborted(signal);
    await TreeSitterWasmLoader.ensureInitialized();

    const parser = new Parser();
    const result = new Map<string, string[]>();

    for (const relativePath of paths) {
      throwIfAborted(signal);
      const normalized = relativePath.replace(/\\/g, '/');
      const absolute = path.resolve(this.cwd, relativePath);
      if (!fs.existsSync(absolute)) continue;

      try {
        const ext = path.extname(normalized).toLowerCase();
        const cached = this.scanCache?.get(normalized);
        let specifiers: string[];

        if (cached) {
          specifiers = extractRelativeImportsFromTree(cached.ext, cached.tree.rootNode);
        } else {
          const langKey = extensionToTreeSitterLanguage(normalized);
          if (!langKey || langKey === 'terraform' || langKey === 'hcl') continue;
          const language = await this.loader.getLanguage(langKey);
          if (!language) continue;
          parser.setLanguage(language);
          const text = fs.readFileSync(absolute, 'utf8');
          const tree = parser.parse(text);
          specifiers = extractRelativeImportsFromTree(ext, tree.rootNode);
        }

        if (specifiers.length > 0) {
          result.set(normalized, specifiers);
        }
      } catch {
        // Skip unreadable files
      }
    }

    return result;
  }
}
