import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { wasmFileName } from '@archlens/core';
import { resolveTreeSitterWasmSourceDirs } from '@archlens/core/tree-sitter-wasm';

/**
 * Candidate directories that may contain language .wasm files.
 * Prefer package install (dev / tests), then next to the compiled binary.
 */
export function treeSitterWasmSearchDirs(opts: {
  cwd?: string;
  execPath?: string;
  argv0?: string;
  moduleUrl?: string;
}): string[] {
  const cwd = opts.cwd ?? process.cwd();
  const execPath = opts.execPath ?? process.execPath;
  const argv0 = opts.argv0 ?? process.argv[0] ?? '';
  const moduleUrl = opts.moduleUrl ?? import.meta.url;
  const moduleDir = path.dirname(fileURLToPath(moduleUrl));

  const dirs: string[] = [];

  try {
    const { wasmsOutDir, runtimeDir } = resolveTreeSitterWasmSourceDirs(moduleUrl);
    dirs.push(wasmsOutDir);
    dirs.push(runtimeDir);
  } catch {
    // Package may be unavailable inside a bun --compile binary.
  }

  // Compiled binary: wasms are copied next to the executable at build time.
  dirs.push(path.dirname(path.resolve(execPath)));

  // When invoked as `./blueprint` or via PATH alias, argv[0] may differ from execPath.
  if (argv0) {
    const argvDir = path.dirname(path.resolve(cwd, argv0));
    dirs.push(argvDir);
  }

  dirs.push(path.join(cwd, 'node_modules', 'tree-sitter-wasms', 'out'));

  // Source / monorepo layouts (parsing → … → packages/cli or app)
  dirs.push(path.resolve(moduleDir, '../../../../node_modules/tree-sitter-wasms/out'));
  dirs.push(path.resolve(moduleDir, '../../../../../node_modules/tree-sitter-wasms/out'));
  dirs.push(path.resolve(moduleDir, '../../../../../../node_modules/tree-sitter-wasms/out'));

  return [...new Set(dirs.map(d => path.normalize(d)))];
}

export function resolveTreeSitterWasmPath(
  langKey: string,
  opts?: Parameters<typeof treeSitterWasmSearchDirs>[0]
): string | null {
  const name = wasmFileName(langKey);
  for (const dir of treeSitterWasmSearchDirs(opts ?? {})) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Runtime `tree-sitter.wasm` used by `Parser.init` (not a language grammar). */
export function resolveTreeSitterRuntimeWasmPath(
  scriptName = 'tree-sitter.wasm',
  opts?: Parameters<typeof treeSitterWasmSearchDirs>[0]
): string | null {
  const baseName = path.basename(scriptName);
  for (const dir of treeSitterWasmSearchDirs(opts ?? {})) {
    const candidate = path.join(dir, baseName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
