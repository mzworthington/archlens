import {
  EMPTY_MAP_COPY,
  TRUST_COPY,
  chooseWorkspaceFolder,
  decideCopyMermaid,
  decideOpenMap,
  decideOpenSource,
  decideShowHotspots,
  generateDecision,
  resolveSourceFile,
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

export async function openSource(host: EditorHost): Promise<void> {
  if (!host.isTrusted()) {
    host.showMessage(TRUST_COPY);
    return;
  }

  const focused = host.focusedSystem();
  const resolved =
    focused?.sourceFile && focused.workspaceRoot
      ? resolveSourceFile({
          sourceFile: focused.sourceFile,
          workspaceRoot: focused.workspaceRoot,
        })
      : undefined;
  const exists = resolved ? await host.fileExists(resolved) : false;
  const decision = decideOpenSource({
    systemName: focused?.name,
    sourceFile: focused?.sourceFile,
    resolvedPath: exists ? resolved : undefined,
  });

  switch (decision.kind) {
    case 'open':
      await host.openFile(decision.path);
      host.setStatus(decision.status);
      return;
    case 'missing':
      host.showMessage(decision.message);
      return;
    default: {
      const unexpected: never = decision;
      return unexpected;
    }
  }
}

export async function copyDiagram(host: EditorHost): Promise<void> {
  if (!host.isTrusted()) {
    host.showMessage(TRUST_COPY);
    return;
  }

  const decision = decideCopyMermaid(host.visibleSchema());
  switch (decision.kind) {
    case 'copy':
      await host.writeClipboard(decision.text);
      return;
    case 'empty':
      host.showMessage(decision.message);
      return;
    default: {
      const unexpected: never = decision;
      return unexpected;
    }
  }
}

export async function showHotspots(host: EditorHost): Promise<void> {
  const visible = host.visibleMap();
  if (!visible) return;
  if (!host.isTrusted()) {
    host.showMessage(TRUST_COPY);
    return;
  }

  const hasGitHistory = visible.hotspotsOn
    ? true
    : visible.workspaceRoot
      ? await host.hasGitHistory(visible.workspaceRoot)
      : false;
  const decision = decideShowHotspots({
    trusted: true,
    hasGitHistory,
    showing: visible.hotspotsOn,
  });

  switch (decision.kind) {
    case 'show':
      host.setHotspots(true);
      return;
    case 'hide':
      host.setHotspots(false);
      return;
    case 'no-git':
    case 'untrusted':
      host.showMessage(decision.message);
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
