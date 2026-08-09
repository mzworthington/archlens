import type { WorkspacePort } from '../../core';

/**
 * Read-only WorkspacePort backed by in-memory BlueprintSpec YAML from a browser lite scan.
 * Commit/diff still works against IndexedDB drafts; there is no disk folder to write back to.
 */
export function createMemoryScanWorkspacePort(args: {
  directoryName: string;
  files: Array<{ name: string; content: string }>;
}): WorkspacePort {
  const byPath = new Map(args.files.map(f => [f.name.replace(/\\/g, '/'), f.content]));

  return {
    selectDirectory: async () => true,
    readFile: async relativePath => {
      const content = byPath.get(relativePath.replace(/\\/g, '/'));
      if (content == null) throw new Error(`File not found: ${relativePath}`);
      return content;
    },
    writeFile: async () => false,
    getDirectoryName: () => args.directoryName,
    hasPermission: async () => true,
    readDirectoryFiles: async () =>
      Array.from(byPath.entries()).map(([name, content]) => ({ name, content })),
  };
}
