import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  TREE_SITTER_HCL_PACKAGE_LANGUAGES,
  TREE_SITTER_WASMS_PACKAGE_LANGUAGES,
  wasmFileName,
} from './treeSitterLanguages.ts';
import { copyTreeSitterWasmsTo, resolveTreeSitterWasmSourceDirs } from './treeSitterWasmCopy.ts';

describe('treeSitterWasmCopy', () => {
  it('resolves installed web-tree-sitter and tree-sitter-wasms package dirs', () => {
    const dirs = resolveTreeSitterWasmSourceDirs(import.meta.url);
    expect(fs.existsSync(path.join(dirs.runtimeDir, 'tree-sitter.wasm'))).toBe(true);
    expect(fs.existsSync(path.join(dirs.wasmsOutDir, wasmFileName('typescript')))).toBe(true);
  });

  it('copies runtime + package language WASMs into a destination directory', () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'archlens-wasm-copy-'));
    try {
      const { languageCount } = copyTreeSitterWasmsTo(dest, { moduleUrl: import.meta.url });
      expect(languageCount).toBe(TREE_SITTER_WASMS_PACKAGE_LANGUAGES.length);
      expect(fs.existsSync(path.join(dest, 'tree-sitter.wasm'))).toBe(true);
      for (const lang of TREE_SITTER_WASMS_PACKAGE_LANGUAGES) {
        expect(fs.existsSync(path.join(dest, wasmFileName(lang)))).toBe(true);
      }
      for (const lang of TREE_SITTER_HCL_PACKAGE_LANGUAGES) {
        expect(fs.existsSync(path.join(dest, wasmFileName(lang)))).toBe(false);
      }
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });

  it('optionally copies HCL grammars when the package is installed', () => {
    const dirs = resolveTreeSitterWasmSourceDirs(import.meta.url);
    if (!dirs.hclPkgDir) {
      // Designer depends on HCL; core/CLI may not. Skip rather than fail the suite.
      return;
    }
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'archlens-wasm-hcl-'));
    try {
      const { languageCount } = copyTreeSitterWasmsTo(dest, {
        moduleUrl: import.meta.url,
        includeHcl: true,
      });
      expect(languageCount).toBe(
        TREE_SITTER_WASMS_PACKAGE_LANGUAGES.length + TREE_SITTER_HCL_PACKAGE_LANGUAGES.length
      );
      for (const lang of TREE_SITTER_HCL_PACKAGE_LANGUAGES) {
        expect(fs.existsSync(path.join(dest, wasmFileName(lang)))).toBe(true);
      }
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });
});
