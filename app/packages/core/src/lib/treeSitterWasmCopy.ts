/**
 * Shared Node helpers for resolving installed tree-sitter WASM packages and
 * copying them next to a binary or into a static public dir.
 *
 * Not re-exported from `@archlens/core` (browser-safe). Import via
 * `@archlens/core/tree-sitter-wasm`.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {
  TREE_SITTER_HCL_PACKAGE_LANGUAGES,
  TREE_SITTER_WASMS_PACKAGE_LANGUAGES,
  wasmFileName,
} from './treeSitterLanguages.ts';

export type TreeSitterWasmSourceDirs = {
  /** Directory containing `tree-sitter.wasm` (web-tree-sitter package root). */
  runtimeDir: string;
  /** `tree-sitter-wasms/out` language WASM directory. */
  wasmsOutDir: string;
  /** `@tree-sitter-grammars/tree-sitter-hcl` package root, if installed. */
  hclPkgDir: string | null;
};

/** Resolve install paths for web-tree-sitter + tree-sitter-wasms (+ optional HCL). */
export function resolveTreeSitterWasmSourceDirs(moduleUrl: string): TreeSitterWasmSourceDirs {
  const require = createRequire(moduleUrl);
  const runtimeDir = path.dirname(require.resolve('web-tree-sitter/package.json'));
  const wasmsOutDir = path.join(
    path.dirname(require.resolve('tree-sitter-wasms/package.json')),
    'out'
  );

  let hclPkgDir: string | null = null;
  try {
    hclPkgDir = path.dirname(require.resolve('@tree-sitter-grammars/tree-sitter-hcl/package.json'));
  } catch {
    hclPkgDir = null;
  }

  return { runtimeDir, wasmsOutDir, hclPkgDir };
}

export type CopyTreeSitterWasmsOptions = {
  /** `import.meta.url` of the caller (for `createRequire`). */
  moduleUrl: string;
  /** Copy terraform/hcl grammars from `@tree-sitter-grammars/tree-sitter-hcl`. */
  includeHcl?: boolean;
};

/**
 * Copy runtime `tree-sitter.wasm` plus language parsers into `destDir`.
 * Throws if a required source file is missing.
 */
export function copyTreeSitterWasmsTo(
  destDir: string,
  options: CopyTreeSitterWasmsOptions
): { languageCount: number } {
  const { runtimeDir, wasmsOutDir, hclPkgDir } = resolveTreeSitterWasmSourceDirs(options.moduleUrl);
  const runtimeWasm = path.join(runtimeDir, 'tree-sitter.wasm');
  if (!fs.existsSync(runtimeWasm)) {
    throw new Error(`Missing runtime WASM: ${runtimeWasm}`);
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(runtimeWasm, path.join(destDir, 'tree-sitter.wasm'));

  let languageCount = 0;
  for (const lang of TREE_SITTER_WASMS_PACKAGE_LANGUAGES) {
    const name = wasmFileName(lang);
    const src = path.join(wasmsOutDir, name);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing WASM: ${src}`);
    }
    fs.copyFileSync(src, path.join(destDir, name));
    languageCount += 1;
  }

  if (options.includeHcl) {
    if (!hclPkgDir) {
      throw new Error('Missing @tree-sitter-grammars/tree-sitter-hcl package');
    }
    for (const lang of TREE_SITTER_HCL_PACKAGE_LANGUAGES) {
      const name = wasmFileName(lang);
      const src = path.join(hclPkgDir, name);
      if (!fs.existsSync(src)) {
        throw new Error(`Missing tree-sitter WASM: ${src}`);
      }
      fs.copyFileSync(src, path.join(destDir, name));
      languageCount += 1;
    }
  }

  return { languageCount };
}
