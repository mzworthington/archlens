import path from 'node:path';
import type { Plugin } from 'vite';
import { copyTreeSitterWasmsTo } from '../../core/src/lib/treeSitterWasmCopy.ts';
import { designerPackageRoot } from './paths.ts';

/** Copy tree-sitter runtime + language WASM parsers for in-browser highlighting. */
export function syncTreeSitterWasms(): Plugin {
  const dest = path.resolve(designerPackageRoot, 'public/tree-sitter');

  const sync = () => {
    copyTreeSitterWasmsTo(dest, {
      moduleUrl: import.meta.url,
      includeHcl: true,
    });
  };

  return {
    name: 'sync-tree-sitter-wasms',
    configResolved: sync,
    buildStart: sync,
    configureServer() {
      sync();
    },
  };
}
