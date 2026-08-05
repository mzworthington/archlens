#!/usr/bin/env bun
/**
 * Copy language parsers next to a blueprint binary (or into a destination dir).
 *
 * Usage:
 *   bun scripts/copyTreeSitterWasms.ts [destDir...]
 * Default dest: ../../dist (next to compiled blueprint)
 */
import * as path from 'node:path';
import { TREE_SITTER_WASMS_PACKAGE_LANGUAGES } from '@archlens/core';
import { copyTreeSitterWasmsTo } from '@archlens/core/tree-sitter-wasm';

const defaultDest = path.resolve(import.meta.dirname, '../../../dist');
const destDirs =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2).map(d => path.resolve(d))
    : [defaultDest];

for (const dest of destDirs) {
  copyTreeSitterWasmsTo(dest, { moduleUrl: import.meta.url });
  console.log(
    `Copied tree-sitter.wasm + ${TREE_SITTER_WASMS_PACKAGE_LANGUAGES.length} language WASM files → ${dest}`
  );
}
