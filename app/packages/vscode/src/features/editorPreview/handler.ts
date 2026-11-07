import {
  DEFAULT_SOURCE_GLOB,
  EMPTY_MAP_COPY,
  NO_CHANGES_COPY,
  NO_SOURCE_FILES_COPY,
  SCAN_FAILED_COPY,
  TRUST_COPY,
  UNSAVED_BLUEPRINT_COPY,
  WRITE_FAILED_COPY,
  chooseWorkspaceFolder,
  decideCopyMermaid,
  decideOpenMap,
  decideOpenSource,
  decideShowHotspots,
  foundLine,
  generateDecision,
  languagesInPaths,
  blueprintWritePlan,
  resolveSourceFile,
  reviewRows,
  sameEditorPath,
  supportedSourcePaths,
  systemsFromSourcePaths,
  systemsInBlueprints,
  workspaceRootForSelection,
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
  if (!host.generateEnabled()) {
    await offerGenerateInterest(host);
    return;
  }
  await reviewWorkspaceScan(host, 'review', true);
}

export async function compareWithScan(host: EditorHost): Promise<void> {
  if (!host.isTrusted()) {
    host.showMessage(TRUST_COPY);
    return;
  }
  if (!host.generateEnabled()) {
    await offerGenerateInterest(host);
    return;
  }
  if (host.unsavedBlueprint()) {
    host.showMessage(UNSAVED_BLUEPRINT_COPY);
    return;
  }
  await reviewWorkspaceScan(host, 'message', false);
}

async function offerGenerateInterest(host: EditorHost): Promise<void> {
  const choice = await host.askGenerateInterest();
  const decision = generateDecision({ trusted: true, enabled: false, choice });
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

async function reviewWorkspaceScan(
  host: EditorHost,
  empty: 'review' | 'message',
  confirm: boolean
): Promise<void> {
  const folders = host.workspaceFolders();
  const selectedFolder = host.selectedFolder();
  const picked = folders.length > 1 && !selectedFolder ? await host.pickFolder(folders) : undefined;
  if (folders.length > 1 && !selectedFolder && !picked) return;

  const workspaceRoot = workspaceRootForSelection({
    folders,
    ...(selectedFolder ? { selectedFolder } : {}),
    ...(picked ? { picked } : {}),
  });
  if (!workspaceRoot) return;

  const discovered = supportedSourcePaths(
    await host.listSourceFiles(workspaceRoot, DEFAULT_SOURCE_GLOB)
  );
  const scope = await host.askScanScope(foundLine(languagesInPaths(discovered)));
  if (scope === 'escape') return;

  const files = await filesForScope(host, scope, workspaceRoot, selectedFolder, discovered);
  if (!files) return;

  if (confirm && (await host.confirmGenerate()) !== 'generate') return;

  const scanRoot = scope === 'folder' ? (selectedFolder ?? workspaceRoot) : workspaceRoot;
  const outcome = await host.scanFolder(scanRoot);
  switch (outcome) {
    case 'cancelled':
    case 'failed':
      host.showMessage(SCAN_FAILED_COPY);
      return;
    case 'ready':
      break;
    default: {
      const unexpected: never = outcome;
      return unexpected;
    }
  }

  if (files.length === 0) {
    host.showMessage(NO_SOURCE_FILES_COPY);
    return;
  }

  const existing = await host.listBlueprintFiles(workspaceRoot);
  const scanned = systemsFromSourcePaths(workspaceRoot, files);
  const rows = reviewRows(systemsInBlueprints(existing), scanned);
  switch (empty) {
    case 'message':
      if (rows.length === 0) {
        host.showMessage(NO_CHANGES_COPY);
        return;
      }
      break;
    case 'review':
      break;
    default: {
      const unexpected: never = empty;
      return unexpected;
    }
  }
  if ((await host.showReview(rows)) !== 'write') return;

  const plan = blueprintWritePlan({
    root: workspaceRoot,
    blueprintsFolder: host.blueprintsFolder(),
    files: existing,
    scanned,
  });
  if ((await host.applyBlueprintWrite(plan.documents)) === 'failed') {
    host.showMessage(WRITE_FAILED_COPY);
    return;
  }
  await host.showDiagram(plan.diagram);
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

async function filesForScope(
  host: EditorHost,
  scope: 'workspace' | 'folder' | 'custom',
  workspaceRoot: string,
  selectedFolder: string | undefined,
  discovered: readonly string[]
): Promise<readonly string[] | undefined> {
  switch (scope) {
    case 'workspace':
      return discovered;
    case 'folder': {
      const root = selectedFolder ?? workspaceRoot;
      if (root === workspaceRoot) return discovered;
      return supportedSourcePaths(await host.listSourceFiles(root, DEFAULT_SOURCE_GLOB));
    }
    case 'custom': {
      const glob = await host.askScanGlob();
      if (!glob) return undefined;
      return supportedSourcePaths(await host.listSourceFiles(workspaceRoot, glob));
    }
    default: {
      const unexpected: never = scope;
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
