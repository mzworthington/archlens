import Parser from 'web-tree-sitter';
import {
  extensionToTreeSitterLanguage,
  wasmFileName,
  type TreeSitterWasmLanguage,
} from '@archlens/core';
import type { CodebaseParserPort } from '@archlens/analysis/ports';
import type { ParsedSourceFile } from '@archlens/analysis/types';
import { extractParsedSourceFileFromTree } from '@archlens/analysis/tree-sitter-extract';
import { throwIfAborted } from '@archlens/analysis/cancellation';
import type { LiteScanSourceFile } from '../../application/analysis/liteScanTypes';
import { BrowserSourceParser } from './browserSourceParser';

const wasmBase = `${import.meta.env.BASE_URL}tree-sitter/`.replace(/(?<!:)\/{2,}/g, '/');

let initPromise: Promise<boolean> | null = null;
let initFailed = false;
const languageCache = new Map<TreeSitterWasmLanguage, Parser.Language>();

function treeSitterWasmUrl(fileName: string): string {
  return `${wasmBase}${fileName}`;
}

async function initTreeSitter(): Promise<boolean> {
  if (initFailed) return false;
  if (import.meta.env.MODE === 'test') return false;
  if (typeof WebAssembly === 'undefined') return false;
  if (!initPromise) {
    initPromise = Parser.init({
      locateFile(scriptName: string) {
        return treeSitterWasmUrl(scriptName);
      },
    })
      .then(() => true)
      .catch(() => {
        initFailed = true;
        return false;
      });
  }
  return initPromise;
}

async function loadTreeSitterLanguageForFile(filepath: string): Promise<Parser.Language | null> {
  const lang = extensionToTreeSitterLanguage(filepath);
  if (!lang) return null;
  const cached = languageCache.get(lang);
  if (cached) return cached;
  const ready = await initTreeSitter();
  if (!ready) return null;
  try {
    const language = await Parser.Language.load(treeSitterWasmUrl(wasmFileName(lang)));
    languageCache.set(lang, language);
    return language;
  } catch {
    return null;
  }
}

/**
 * Browser CodebaseParserPort backed by tree-sitter WASM.
 * Falls back to the lightweight parser if WASM/language loading is unavailable.
 */
export class BrowserTreeSitterParser implements CodebaseParserPort {
  private readonly fallback: BrowserSourceParser;

  constructor(
    private readonly sources: readonly LiteScanSourceFile[],
    private readonly cwd: string = '/scan'
  ) {
    this.fallback = new BrowserSourceParser(sources, cwd);
  }

  async parseSourceFiles(globPattern: string, signal?: AbortSignal): Promise<ParsedSourceFile[]> {
    throwIfAborted(signal);
    const ready = await initTreeSitter();
    if (!ready) {
      return this.fallback.parseSourceFiles(globPattern, signal);
    }

    const parser = new Parser();
    const parsed: ParsedSourceFile[] = [];
    let parsedAny = false;

    for (const source of this.sources) {
      throwIfAborted(signal);
      const relativePath = source.relativePath.replace(/\\/g, '/');
      const language = await loadTreeSitterLanguageForFile(relativePath);
      if (!language) continue;
      try {
        parser.setLanguage(language);
        const tree = parser.parse(source.content);
        parsed.push(
          extractParsedSourceFileFromTree({
            filePath: `${this.cwd}/${relativePath}`.replace(/\/{2,}/g, '/'),
            relativePath,
            tree,
          })
        );
        parsedAny = true;
      } catch {
        // Continue: a single malformed file should not block onboarding feedback.
      }
    }

    if (!parsedAny) {
      return this.fallback.parseSourceFiles(globPattern, signal);
    }
    return parsed;
  }
}

/** @internal Test helper */
export function resetBrowserTreeSitterParserForTests(): void {
  initPromise = null;
  initFailed = false;
  languageCache.clear();
}
