export type FolderChoice =
  { kind: 'folder'; path: string } | { kind: 'pick'; paths: string[] } | { kind: 'none' };

function normalizePath(value: string): string {
  let path = value.replaceAll('\\', '/');
  while (path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

export function isInsideFolder(file: string, folder: string): boolean {
  const filePath = normalizePath(file);
  const folderPath = normalizePath(folder);
  return filePath === folderPath || filePath.startsWith(`${folderPath}/`);
}

export function isYamlPath(file: string): boolean {
  return file.endsWith('.yaml') || file.endsWith('.yml');
}

/** One workspace folder, or a pick. Roots are never merged into one estate. */
export function chooseMapFolder(input: {
  workspaceFolders: string[];
  invokedPath?: string;
}): FolderChoice {
  const folders = input.workspaceFolders
    .map(normalizePath)
    .filter(folder => folder.length > 0)
    .sort((a, b) => a.localeCompare(b));
  if (input.invokedPath) {
    const matches = folders
      .filter(folder => isInsideFolder(input.invokedPath ?? '', folder))
      .sort((a, b) => b.length - a.length);
    const closest = matches[0];
    if (closest) return { kind: 'folder', path: closest };
  }
  if (folders.length === 1) {
    const only = folders[0];
    if (only) return { kind: 'folder', path: only };
  }
  if (folders.length === 0) return { kind: 'none' };
  return { kind: 'pick', paths: folders };
}
