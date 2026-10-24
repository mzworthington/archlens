type Entry = [string, FileSystemHandle];

export function file(name: string, content: string): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    getFile: async () => new File([content], name),
  } as unknown as FileSystemFileHandle;
}

export function dir(name: string, entries: Entry[]): FileSystemDirectoryHandle {
  const handle = {
    kind: 'directory' as const,
    name,
    async *entries() {
      for (const entry of entries) yield entry;
    },
    async getDirectoryHandle(child: string) {
      const found = entries.find(([n, h]) => n === child && h.kind === 'directory');
      if (!found) throw new Error('not found');
      return found[1] as FileSystemDirectoryHandle;
    },
    async getFileHandle(child: string) {
      const found = entries.find(([n, h]) => n === child && h.kind === 'file');
      if (!found) throw new Error('not found');
      return found[1] as FileSystemFileHandle;
    },
  };
  return handle as unknown as FileSystemDirectoryHandle;
}
