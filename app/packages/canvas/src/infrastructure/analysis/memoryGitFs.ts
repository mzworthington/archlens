/** Minimal Promise FsClient for isomorphic-git tests (posix paths). */
export function createMemoryGitFs(): {
  promises: {
    readFile: (filepath: string, options?: { encoding?: string }) => Promise<Uint8Array | string>;
    writeFile: (filepath: string, data: Uint8Array | string) => Promise<void>;
    unlink: (filepath: string) => Promise<void>;
    readdir: (filepath: string) => Promise<string[]>;
    mkdir: (filepath: string, options?: { recursive?: boolean }) => Promise<void>;
    rmdir: (filepath: string) => Promise<void>;
    stat: (filepath: string) => Promise<MemoryStat>;
    lstat: (filepath: string) => Promise<MemoryStat>;
    readlink: (filepath: string) => Promise<string>;
    symlink: (target: string, filepath: string) => Promise<void>;
  };
} {
  const files = new Map<string, Uint8Array>();
  const dirs = new Set<string>(['/']);

  const normalize = (filepath: string): string => {
    const withRoot = filepath.startsWith('/') ? filepath : `/${filepath}`;
    return withRoot.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  };

  const enoent = (filepath: string): Error => {
    const err = new Error(`ENOENT: no such file or directory, '${filepath}'`) as Error & {
      code: string;
    };
    err.code = 'ENOENT';
    return err;
  };

  const parentOf = (filepath: string): string => {
    const normalized = normalize(filepath);
    const idx = normalized.lastIndexOf('/');
    return idx <= 0 ? '/' : normalized.slice(0, idx);
  };

  const toStat = (size: number, isDir: boolean): MemoryStat => ({
    isFile: () => !isDir,
    isDirectory: () => isDir,
    isSymbolicLink: () => false,
    size,
    mode: isDir ? 0o40755 : 0o100644,
    mtimeMs: Date.now(),
    ctimeMs: Date.now(),
  });

  const promises = {
    async readFile(filepath: string, options?: { encoding?: string }) {
      const key = normalize(filepath);
      const data = files.get(key);
      if (!data) throw enoent(filepath);
      if (options?.encoding === 'utf8') return new TextDecoder().decode(data);
      return data;
    },
    async writeFile(filepath: string, data: Uint8Array | string) {
      const key = normalize(filepath);
      const parent = parentOf(key);
      if (!dirs.has(parent)) {
        let current = '/';
        for (const part of parent.split('/').filter(Boolean)) {
          current = current === '/' ? `/${part}` : `${current}/${part}`;
          dirs.add(current);
        }
      }
      files.set(key, typeof data === 'string' ? new TextEncoder().encode(data) : data);
    },
    async unlink(filepath: string) {
      const key = normalize(filepath);
      if (!files.has(key)) throw enoent(filepath);
      files.delete(key);
    },
    async readdir(filepath: string) {
      const key = normalize(filepath);
      if (!dirs.has(key) && key !== '/') throw enoent(filepath);
      const prefix = key === '/' ? '/' : `${key}/`;
      const names = new Set<string>();
      for (const dir of dirs) {
        if (dir === key || dir === '/') continue;
        if (parentOf(dir) === key) names.add(dir.slice(prefix.length));
      }
      for (const file of files.keys()) {
        if (parentOf(file) === key) names.add(file.slice(prefix.length));
      }
      return [...names];
    },
    async mkdir(filepath: string, options?: { recursive?: boolean }) {
      const key = normalize(filepath);
      if (dirs.has(key)) return;
      const parent = parentOf(key);
      if (!dirs.has(parent) && !options?.recursive) throw enoent(filepath);
      if (options?.recursive) {
        let current = '/';
        for (const part of key.split('/').filter(Boolean)) {
          current = current === '/' ? `/${part}` : `${current}/${part}`;
          dirs.add(current);
        }
        return;
      }
      dirs.add(key);
    },
    async rmdir(filepath: string) {
      const key = normalize(filepath);
      if (!dirs.has(key)) throw enoent(filepath);
      dirs.delete(key);
    },
    async stat(filepath: string) {
      const key = normalize(filepath);
      if (dirs.has(key) || key === '/') return toStat(0, true);
      const data = files.get(key);
      if (!data) throw enoent(filepath);
      return toStat(data.byteLength, false);
    },
    async lstat(filepath: string) {
      return promises.stat(filepath);
    },
    async readlink(filepath: string) {
      throw enoent(filepath);
    },
    async symlink() {
      const err = new Error('EPERM: operation not permitted, symlink') as Error & { code: string };
      err.code = 'EPERM';
      throw err;
    },
  };

  return { promises };
}

type MemoryStat = {
  isFile: () => boolean;
  isDirectory: () => boolean;
  isSymbolicLink: () => boolean;
  size: number;
  mode: number;
  mtimeMs: number;
  ctimeMs: number;
};
