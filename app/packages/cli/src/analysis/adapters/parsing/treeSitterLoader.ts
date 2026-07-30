import path from 'path';
import pc from 'picocolors';
import Parser from 'web-tree-sitter';
import { extensionToTreeSitterLanguage, wasmFileName } from '@archlens/core';
import { resolveTreeSitterWasmPath, treeSitterWasmSearchDirs } from './treeSitterWasmPaths.ts';

export class TreeSitterWasmLoader {
  private static initPromise: Promise<void> | null = null;
  private readonly loadedLanguages = new Map<string, Parser.Language>();
  private readonly missingLanguages = new Set<string>();

  static async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = Parser.init();
    }
    await this.initPromise;
  }

  async getLanguageForExtension(ext: string): Promise<Parser.Language | null> {
    const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
    const langKey = extensionToTreeSitterLanguage(`file${normalizedExt}`);
    if (!langKey) return null;
    return this.getLanguage(langKey);
  }

  async getLanguage(langKey: string): Promise<Parser.Language | null> {
    if (this.loadedLanguages.has(langKey)) {
      return this.loadedLanguages.get(langKey)!;
    }

    if (this.missingLanguages.has(langKey)) {
      return null;
    }

    const wasmPath = resolveTreeSitterWasmPath(langKey);
    if (!wasmPath) {
      this.missingLanguages.add(langKey);
      const candidates = treeSitterWasmSearchDirs({}).map(dir =>
        path.join(dir, wasmFileName(langKey))
      );
      console.warn(
        pc.yellow(
          `[Warning] Could not find WASM parser for "${langKey}". Expected at one of:\n` +
            candidates.map(c => `  - ${c}`).join('\n') +
            `\nRebuild the CLI (\`pnpm --filter @archlens/cli build\`) so parsers are copied next to the binary, ` +
            `or install tree-sitter-wasms in the project.`
        )
      );
      return null;
    }

    const lang = await Parser.Language.load(wasmPath);
    this.loadedLanguages.set(langKey, lang);
    return lang;
  }
}
