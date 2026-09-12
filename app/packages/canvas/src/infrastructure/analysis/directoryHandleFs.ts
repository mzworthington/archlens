import type { PromiseFsClient } from 'isomorphic-git';
import { listDirectoryNames } from './fileSystemDirectoryEntries';

type HandleCache = Map<string, FileSystemDirectoryHandle | FileSystemFileHandle>;

class FsNotFoundError extends Error {
  readonly code = 'ENOENT';

  constructor(filepath: string) {
    super(`ENOENT: no such file or directory, '${filepath}'`);
    this.name = 'FsNotFoundError';
  }
}

function normalizeFsPath(filepath: string): string {
  const withRoot = filepath.startsWith('/') ? filepath : `/${filepath}`;
  return withRoot.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function partsOf(filepath: string): string[] {
  return normalizeFsPath(filepath).split('/').filter(Boolean);
}

function toStat(
  size: number,
  isDir: boolean
): {
  isFile: () => boolean;
  isDirectory: () => boolean;
  isSymbolicLink: () => boolean;
  size: number;
  mode: number;
  mtimeMs: number;
  ctimeMs: number;
} {
  return {
    isFile: () => !isDir,
    isDirectory: () => isDir,
    isSymbolicLink: () => false,
    size,
    mode: isDir ? 0o40755 : 0o100644,
    mtimeMs: Date.now(),
    ctimeMs: Date.now(),
  };
}

export function createDirectoryHandleFs(root: FileSystemDirectoryHandle): PromiseFsClient {
  const cache: HandleCache = new Map([['/', root]]);

  const resolve = async (
    filepath: string
  ): Promise<FileSystemDirectoryHandle | FileSystemFileHandle> => {
    const key = normalizeFsPath(filepath);
    const cached = cache.get(key);
    if (cached) return cached;

    const parts = partsOf(filepath);
    let dir: FileSystemDirectoryHandle = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      if (!name) continue;
      const atLeaf = i === parts.length - 1;
      const nextKey = `/${parts.slice(0, i + 1).join('/')}`;
      const hit = cache.get(nextKey);
      if (hit) {
        if (atLeaf) return hit;
        if (hit.kind !== 'directory') throw new FsNotFoundError(filepath);
        dir = hit;
        continue;
      }
      if (atLeaf) {
        try {
          const file = await dir.getFileHandle(name);
          cache.set(nextKey, file);
          return file;
        } catch {
          try {
            const nested = await dir.getDirectoryHandle(name);
            cache.set(nextKey, nested);
            return nested;
          } catch {
            throw new FsNotFoundError(filepath);
          }
        }
      }
      try {
        dir = await dir.getDirectoryHandle(name);
        cache.set(nextKey, dir);
      } catch {
        throw new FsNotFoundError(filepath);
      }
    }
    return dir;
  };

  const unsupported = async (): Promise<never> => {
    throw new Error('Read-only filesystem');
  };

  return {
    promises: {
      readFile: async (filepath: string, options?: { encoding?: string }) => {
        const handle = await resolve(filepath);
        if (handle.kind !== 'file') throw new FsNotFoundError(filepath);
        const file = await handle.getFile();
        if (options?.encoding === 'utf8') return file.text();
        return new Uint8Array(await file.arrayBuffer());
      },
      writeFile: unsupported,
      unlink: unsupported,
      readdir: async (filepath: string) => {
        const handle = await resolve(filepath);
        if (handle.kind !== 'directory') throw new FsNotFoundError(filepath);
        return listDirectoryNames(handle);
      },
      mkdir: unsupported,
      rmdir: unsupported,
      stat: async (filepath: string) => {
        const handle = await resolve(filepath);
        if (handle.kind === 'directory') return toStat(0, true);
        const file = await handle.getFile();
        return toStat(file.size, false);
      },
      lstat: async (filepath: string) => {
        const handle = await resolve(filepath);
        if (handle.kind === 'directory') return toStat(0, true);
        const file = await handle.getFile();
        return toStat(file.size, false);
      },
      readlink: async (filepath: string) => {
        throw new FsNotFoundError(filepath);
      },
      symlink: unsupported,
    },
  };
}
