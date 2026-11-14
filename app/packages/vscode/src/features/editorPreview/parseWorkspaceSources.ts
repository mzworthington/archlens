import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Parser from 'web-tree-sitter';
import { extractParsedSourceFileFromTree } from '@archlens/analysis/tree-sitter-extract';
import type { ParsedSourceFile } from '@archlens/analysis/types';
import { extensionToTreeSitterLanguage, wasmFileName } from '@archlens/core';
import { resolveTreeSitterWasmSourceDirs } from '@archlens/core/tree-sitter-wasm';

type SourceText = { path: string; content: string };

let ready: Promise<boolean> | null = null;
const languages = new Map<string, Parser.Language | null>();

/** Tree-sitter parse of the sources the extension already chose. */
export async function parseWorkspaceSources(
  root: string,
  sources: readonly SourceText[]
): Promise<ParsedSourceFile[]> {
  const parserReady = await initParser();
  const parser = parserReady ? new Parser() : null;
  const parsed: ParsedSourceFile[] = [];
  try {
    for (const source of sources) {
      const relativePath = relativeSourcePath(root, source.path);
      if (!parser) {
        parsed.push(emptyParsed(source.path, relativePath));
        continue;
      }
      const language = await languageFor(relativePath);
      if (!language) {
        parsed.push(emptyParsed(source.path, relativePath));
        continue;
      }
      parser.setLanguage(language);
      const tree = parser.parse(source.content);
      try {
        parsed.push(
          extractParsedSourceFileFromTree({
            filePath: source.path,
            relativePath,
            tree,
          })
        );
      } finally {
        tree.delete();
      }
    }
    return parsed;
  } finally {
    parser?.delete?.();
  }
}

async function initParser(): Promise<boolean> {
  if (!ready) {
    ready = Parser.init({
      locateFile(scriptName: string) {
        return path.join(wasmDirs().runtimeDir, scriptName);
      },
    })
      .then(() => true)
      .catch(() => false);
  }
  return ready;
}

async function languageFor(relativePath: string): Promise<Parser.Language | null> {
  const langKey = extensionToTreeSitterLanguage(relativePath);
  if (!langKey) return null;
  const cached = languages.get(langKey);
  if (cached !== undefined) return cached;
  const wasmPath = path.join(wasmDirs().wasmsOutDir, wasmFileName(langKey));
  try {
    const language = await Parser.Language.load(wasmPath);
    languages.set(langKey, language);
    return language;
  } catch {
    languages.set(langKey, null);
    return null;
  }
}

function wasmDirs() {
  return resolveTreeSitterWasmSourceDirs(moduleUrl());
}

function moduleUrl(): string {
  return pathToFileURL(__filename).href;
}

function emptyParsed(filePath: string, relativePath: string): ParsedSourceFile {
  const baseName =
    relativePath
      .split('/')
      .pop()
      ?.replace(/\.[^.]+$/, '') || relativePath;
  return {
    filePath,
    relativePath,
    baseName,
    isTestFile: /\.(test|spec)\.[^.]+$/.test(relativePath),
    imports: [],
    reExports: [],
    newExpressions: [],
    callExpressions: [],
  };
}

function relativeSourcePath(root: string, file: string): string {
  const normalizedRoot = root.replaceAll('\\', '/').replace(/\/+$/, '');
  const normalized = file.replaceAll('\\', '/');
  if (normalized.startsWith(`${normalizedRoot}/`)) {
    return normalized.slice(normalizedRoot.length + 1);
  }
  return normalized.split('/').pop() || normalized;
}
