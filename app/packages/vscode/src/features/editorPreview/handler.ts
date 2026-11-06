import {
  EMPTY_MAP_COPY,
  TRUST_COPY,
  chooseWorkspaceFolder,
  decideOpenMap,
  generateDecision,
  sameEditorPath,
} from './domain';
import type { BlueprintFile, EditorHost } from './ports';

export async function openArchitectureMap(host: EditorHost): Promise<void> {
  if (!host.isTrusted()) {
    host.showMessage(TRUST_COPY);
    return;
  }

  const selectedPath = host.selectedPath();
  const files = selectedPath ? await host.readSelectedFile() : await filesForChosenFolder(host);
  if (!files) return;

  const decision = decideOpenMap({
    files,
    selectedPath,
    blueprintsFolder: host.blueprintsFolder(),
  });

  switch (decision.kind) {
    case 'diagram':
      await host.showDiagram(decision.diagram);
      return;
    case 'empty':
      host.showMessage(EMPTY_MAP_COPY);
      return;
    case 'not-blueprint':
      return;
    default: {
      const unexpected: never = decision;
      return unexpected;
    }
  }
}

export async function generateFromWorkspace(host: EditorHost): Promise<void> {
  if (!host.isTrusted()) {
    host.showMessage(TRUST_COPY);
    return;
  }

  const enabled = host.generateEnabled();
  const choice = await host.askGenerateInterest();
  const decision = generateDecision({ trusted: true, enabled, choice });

  switch (decision.kind) {
    case 'open-discussion':
      await host.openDiscussion(decision.url);
      return;
    case 'prompt':
    case 'closed':
    case 'untrusted':
      return;
    default: {
      const unexpected: never = decision;
      return unexpected;
    }
  }
}

async function filesForChosenFolder(
  host: EditorHost
): Promise<readonly BlueprintFile[] | undefined> {
  const selectedFolder = host.selectedFolder();
  if (selectedFolder) return host.listBlueprintFiles(selectedFolder);

  const folders = host.workspaceFolders();
  const choice = chooseWorkspaceFolder({
    folders: folders.map(folder => folder.path),
    hintPath: host.hintPath(),
  });
  switch (choice.kind) {
    case 'none':
      return [];
    case 'folder': {
      const original =
        folders.find(folder => sameEditorPath(folder.path, choice.path))?.path ?? choice.path;
      return host.listBlueprintFiles(original);
    }
    case 'pick': {
      const picked = await host.pickFolder(folders);
      if (!picked) return undefined;
      return host.listBlueprintFiles(picked);
    }
    default: {
      const unexpected: never = choice;
      return unexpected;
    }
  }
}
