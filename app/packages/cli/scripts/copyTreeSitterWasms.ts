#!/usr/bin/env bun
/**
 * Copy language parsers next to a blueprint binary (or into a destination dir).
 *
 * Usage:
 *   bun scripts/copyTreeSitterWasms.ts [destDir...]
 * Default dest: ../../dist (next to compiled blueprint)
 */
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import {
  TREE_SITTER_WASMS_PACKAGE_LANGUAGES,
  wasmFileName,
} from '../src/analysis/adapters/parsing/treeSitterWasmPaths.ts';

const require = createRequire(import.meta.url);
const pkgJson = require.resolve('tree-sitter-wasms/package.json');
const wasmOut = path.join(path.dirname(pkgJson), 'out');
const webTreeSitterPkg = require.resolve('web-tree-sitter/package.json');
const runtimeWasm = path.join(path.dirname(webTreeSitterPkg), 'tree-sitter.wasm');

const defaultDest = path.resolve(import.meta.dirname, '../../../dist');
const destDirs =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2).map(d => path.resolve(d))
    : [defaultDest];

for (const dest of destDirs) {
  fs.mkdirSync(dest, { recursive: true });
  if (!fs.existsSync(runtimeWasm)) {
    throw new Error(`Missing runtime WASM: ${runtimeWasm}`);
  }
  fs.copyFileSync(runtimeWasm, path.join(dest, 'tree-sitter.wasm'));
  for (const lang of TREE_SITTER_WASMS_PACKAGE_LANGUAGES) {
    const name = wasmFileName(lang);
    const src = path.join(wasmOut, name);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing WASM: ${src}`);
    }
    fs.copyFileSync(src, path.join(dest, name));
  }
  console.log(
    `Copied tree-sitter.wasm + ${TREE_SITTER_WASMS_PACKAGE_LANGUAGES.length} language WASM files → ${dest}`
  );
}
