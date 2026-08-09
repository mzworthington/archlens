import Parser from 'web-tree-sitter';
import {
  extensionToTreeSitterLanguage,
  wasmFileName,
  type TreeSitterWasmLanguage,
} from '@archlens/core';

const wasmBase = `${import.meta.env.BASE_URL}tree-sitter/`.replace(/(?<!:)\/{2,}/g, '/');

let initPromise: Promise<boolean> | null = null;
let initFailed = false;
const languageCache = new Map<TreeSitterWasmLanguage, Parser.Language>();

function treeSitterWasmUrl(fileName: string): string {
  return `${wasmBase}${fileName}`;
}

/** True in a window or a worker; false under SSR/Node. */
function hasBrowserRuntime(): boolean {
  return typeof self !== 'undefined' && typeof WebAssembly !== 'undefined';
}

export async function initTreeSitter(): Promise<boolean> {
  if (initFailed) return false;
  if (import.meta.env.MODE === 'test' || !hasBrowserRuntime()) {
    return false;
  }

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

async function loadTreeSitterLanguage(
  lang: TreeSitterWasmLanguage
): Promise<Parser.Language | null> {
  if (!hasBrowserRuntime()) {
    return null;
  }

  const ready = await initTreeSitter();
  if (!ready) return null;

  const cached = languageCache.get(lang);
  if (cached) return cached;

  try {
    const language = await Parser.Language.load(treeSitterWasmUrl(wasmFileName(lang)));
    languageCache.set(lang, language);
    return language;
  } catch {
    return null;
  }
}

export async function loadTreeSitterLanguageForFile(
  filepath: string
): Promise<{ lang: TreeSitterWasmLanguage; language: Parser.Language } | null> {
  const lang = extensionToTreeSitterLanguage(filepath);
  if (!lang) return null;
  const language = await loadTreeSitterLanguage(lang);
  if (!language) return null;
  return { lang, language };
}
