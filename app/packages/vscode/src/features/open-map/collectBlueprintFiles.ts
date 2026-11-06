import type { CandidateRead, MapFile } from './openMap';
import { blueprintsFolderName } from './blueprintsFolder';
import { chooseMapFolder, isInsideFolder, isYamlPath } from './chooseFolder';

export interface WorkspaceFiles {
  workspaceFolders(): string[];
  findYaml(folder: string, blueprintsFolder: string): Promise<string[]>;
  readText(path: string): Promise<string>;
  pickFolder(folders: string[]): Promise<string | undefined>;
}

export async function collectBlueprintFiles(
  files: WorkspaceFiles,
  input: {
    invokedPath?: string;
    activePath?: string;
    blueprintsFolderSetting: unknown;
  }
): Promise<CandidateRead> {
  const folderName = blueprintsFolderName(input.blueprintsFolderSetting);
  const choice = chooseMapFolder({
    workspaceFolders: files.workspaceFolders(),
    invokedPath: input.invokedPath ?? input.activePath,
  });
  let folder: string | undefined;
  switch (choice.kind) {
    case 'none':
      return { status: 'ok', files: [] };
    case 'folder':
      folder = choice.path;
      break;
    case 'pick': {
      const picked = await files.pickFolder(choice.paths);
      if (!picked || !choice.paths.includes(picked)) return { status: 'cancelled' };
      folder = picked;
      break;
    }
    default: {
      const neverChoice: never = choice;
      throw new Error(`Unexpected folder choice: ${JSON.stringify(neverChoice)}`);
    }
  }
  const listed = await files.findYaml(folder, folderName);
  const paths = new Set(listed.filter(file => isInsideFolder(file, folder)));
  if (
    input.invokedPath &&
    isYamlPath(input.invokedPath) &&
    isInsideFolder(input.invokedPath, folder)
  ) {
    paths.add(input.invokedPath);
  }
  const collected: MapFile[] = [];
  for (const filePath of [...paths].sort((a, b) => a.localeCompare(b))) {
    collected.push({ path: filePath, content: await files.readText(filePath) });
  }
  return { status: 'ok', files: collected };
}
