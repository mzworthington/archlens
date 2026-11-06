import { randomBytes } from 'node:crypto';
import {
  CANCEL_COPY,
  GENERATE_OFF_COPY,
  GENERATE_TITLE,
  TELL_US_COPY,
  decideOpenMap,
  safeBlueprintsFolder,
} from '../features/editorPreview/domain';
import { renderEmptyMap, renderMap } from '../features/editorPreview/renderMap';
import type {
  BlueprintFile,
  DiagramView,
  EditorHost,
  GenerateChoice,
  WorkspaceFolder,
} from '../features/editorPreview/ports';
import {
  closeDiagramSession,
  focusDiagramSystem,
  openDiagramSession,
  readFocusedSystem,
  replaceDiagramSession,
} from './diagramSession';

interface WebviewPanel {
  webview: {
    html: string;
    onDidReceiveMessage(listener: (message: unknown) => void): { dispose(): void };
  };
  onDidDispose(listener: () => void): void;
}

interface FolderPickItem {
  label: string;
  description: string;
  path: string;
}

type FileUri = { fsPath: string; toString(): string };
type OpenDocument<Uri extends FileUri> = { getText(): string; uri: Uri };

export interface VsCodeLike<
  Uri extends FileUri = FileUri,
  Document extends OpenDocument<Uri> = OpenDocument<Uri>,
> {
  FileType: { readonly File: number; readonly Directory: number };
  ViewColumn: { readonly Active: number; readonly Beside: number };
  Uri: {
    file(path: string): Uri;
    parse(value: string): Uri;
  };
  workspace: {
    readonly isTrusted: boolean;
    readonly workspaceFolders: readonly { name: string; uri: Uri }[] | undefined;
    getConfiguration(section: string): {
      get<T>(key: string, defaultValue: T): T;
    };
    findFiles(pattern: { base: string; pattern: string }): Thenable<readonly Uri[]>;
    fs: {
      stat(uri: Uri): Thenable<{ type: number }>;
      readFile(uri: Uri): Thenable<Uint8Array>;
    };
    openTextDocument(uri: Uri): Thenable<Document>;
    onDidSaveTextDocument(listener: (document: Document) => void): { dispose(): void };
  };
  window: {
    showInformationMessage(
      message: string,
      options: { modal?: boolean; detail?: string },
      ...items: string[]
    ): Thenable<string | undefined>;
    showQuickPick(
      items: readonly FolderPickItem[],
      options: { title: string }
    ): Thenable<FolderPickItem | undefined>;
    showTextDocument(document: Document, column: number): Thenable<unknown>;
    setStatusBarMessage(message: string, hideAfterTimeout: number): void;
    createWebviewPanel(
      viewType: string,
      title: string,
      column: number,
      options: { enableScripts: boolean }
    ): WebviewPanel;
  };
  env: {
    openExternal(uri: Uri): Thenable<boolean>;
  };
}

const STATUS_HIDE_MS = 5000;

export async function createEditorHost<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  resource?: Uri
): Promise<EditorHost> {
  const selection = api.workspace.isTrusted ? await describeResource(api, resource) : {};

  return {
    isTrusted: () => api.workspace.isTrusted,
    generateEnabled: () =>
      api.workspace
        .getConfiguration('archlens')
        .get<boolean>('generateFromWorkspace.enabled', false) === true,
    selectedPath: () => selection.filePath,
    selectedFolder: () => selection.folderPath,
    workspaceFolders: () => workspaceFolders(api),
    pickFolder: folders => pickFolder(api, folders),
    readSelectedFile: () => readSelected(api, selection.filePath),
    listBlueprintFiles: folderPath => listBlueprintFiles(api, folderPath),
    blueprintsFolder: () => configuredBlueprintsFolder(api),
    showMessage: message => {
      void api.window.showInformationMessage(message, {});
    },
    showDiagram: diagram => showDiagram(api, diagram),
    askGenerateInterest: () => askGenerateInterest(api),
    openDiscussion: async url => {
      await api.env.openExternal(api.Uri.parse(url));
    },
    focusedSystem: () => readFocusedSystem(),
    fileExists: path => fileExists(api, path),
    openFile: async path => {
      const document = await api.workspace.openTextDocument(api.Uri.file(path));
      await api.window.showTextDocument(document, api.ViewColumn.Active);
    },
    setStatus: message => {
      api.window.setStatusBarMessage(message, STATUS_HIDE_MS);
    },
  };
}

async function describeResource<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  resource: Uri | undefined
): Promise<{ filePath?: string; folderPath?: string }> {
  if (!resource) return {};
  const stat = await api.workspace.fs.stat(resource);
  if ((stat.type & api.FileType.Directory) !== 0) {
    return { folderPath: resource.fsPath };
  }
  return { filePath: resource.fsPath };
}

function workspaceFolders<Uri extends FileUri>(api: VsCodeLike<Uri>): WorkspaceFolder[] {
  return (api.workspace.workspaceFolders ?? []).map(folder => ({
    name: folder.name,
    path: folder.uri.fsPath,
  }));
}

async function pickFolder<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  folders: readonly WorkspaceFolder[]
): Promise<string | undefined> {
  const picked = await api.window.showQuickPick(
    folders.map(folder => ({
      label: folder.name,
      description: folder.path,
      path: folder.path,
    })),
    { title: 'Choose a folder' }
  );
  return picked?.path;
}

async function readSelected<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  filePath: string | undefined
): Promise<readonly BlueprintFile[]> {
  if (!filePath) return [];
  return [await readFile(api, api.Uri.file(filePath))];
}

async function listBlueprintFiles<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  folderPath: string
): Promise<readonly BlueprintFile[]> {
  const blueprintsFolder = configuredBlueprintsFolder(api);
  const uris = await api.workspace.findFiles({
    base: folderPath,
    pattern: blueprintSearchPattern(folderPath, blueprintsFolder),
  });
  const files: BlueprintFile[] = [];
  for (const uri of uris) {
    files.push(await readFile(api, uri));
  }
  return files;
}

async function readFile<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  uri: Uri
): Promise<BlueprintFile> {
  const bytes = await api.workspace.fs.readFile(uri);
  return { path: uri.fsPath, content: new TextDecoder().decode(bytes) };
}

function blueprintSearchPattern(folderPath: string, blueprintsFolder: string): string {
  const segments = folderPath.split(/[/\\]/).filter(segment => segment.length > 0);
  const name = segments[segments.length - 1];
  if (name === blueprintsFolder) return '**/*.{yaml,yml}';
  return `${blueprintsFolder}/**/*.{yaml,yml}`;
}

function configuredBlueprintsFolder<Uri extends FileUri>(api: VsCodeLike<Uri>): string {
  const configured = api.workspace
    .getConfiguration('archlens')
    .get('blueprintsFolder', 'blueprints');
  return safeBlueprintsFolder(configured);
}

async function showDiagram<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  diagram: DiagramView
): Promise<void> {
  const document = await api.workspace.openTextDocument(api.Uri.file(diagram.sourcePath));
  await api.window.showTextDocument(document, api.ViewColumn.Active);
  const panel = api.window.createWebviewPanel(
    'archlens.architectureMap',
    'Architecture map',
    api.ViewColumn.Beside,
    { enableScripts: true }
  );
  let session = openDiagramSession(diagram, workspaceRootFor(api, diagram.sourcePath));
  panel.webview.html = renderMap(diagram, mapNonce());
  const messages = panel.webview.onDidReceiveMessage(message => {
    if (!isFocusMessage(message)) return;
    focusDiagramSystem(session, message.entityRef);
  });
  const listener = api.workspace.onDidSaveTextDocument(saved => {
    if (saved.uri.fsPath !== diagram.sourcePath) return;
    const decision = decideOpenMap({
      files: [{ path: diagram.sourcePath, content: saved.getText() }],
      selectedPath: diagram.sourcePath,
    });
    if (decision.kind === 'diagram') {
      session = replaceDiagramSession(
        session,
        decision.diagram,
        workspaceRootFor(api, decision.diagram.sourcePath)
      );
      panel.webview.html = renderMap(decision.diagram, mapNonce());
      return;
    }
    closeDiagramSession(session);
    panel.webview.html = renderEmptyMap();
  });
  panel.onDidDispose(() => {
    closeDiagramSession(session);
    messages.dispose();
    listener.dispose();
  });
}

function mapNonce(): string {
  return randomBytes(16).toString('hex');
}

function isFocusMessage(message: unknown): message is { entityRef: string } {
  if (typeof message !== 'object' || message === null) return false;
  const record = message as { type?: unknown; entityRef?: unknown };
  return record.type === 'focus-system' && typeof record.entityRef === 'string';
}

function workspaceRootFor<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  blueprintPath: string
): string | undefined {
  const file = blueprintPath.replaceAll('\\', '/').replace(/\/+$/, '');
  const folders = api.workspace.workspaceFolders ?? [];
  const matches = folders
    .map(folder => folder.uri.fsPath)
    .filter(folder => {
      const root = folder.replaceAll('\\', '/').replace(/\/+$/, '');
      return file === root || file.startsWith(`${root}/`);
    })
    .sort((left, right) => right.length - left.length);
  return matches[0];
}

async function fileExists<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  path: string
): Promise<boolean> {
  try {
    const stat = await api.workspace.fs.stat(api.Uri.file(path));
    return (stat.type & api.FileType.File) !== 0;
  } catch {
    return false;
  }
}

async function askGenerateInterest<Uri extends FileUri>(
  api: VsCodeLike<Uri>
): Promise<GenerateChoice> {
  const choice = await api.window.showInformationMessage(
    GENERATE_TITLE,
    { modal: true, detail: GENERATE_OFF_COPY },
    TELL_US_COPY,
    CANCEL_COPY
  );
  if (choice === TELL_US_COPY) return 'tell';
  if (choice === CANCEL_COPY) return 'cancel';
  return 'escape';
}
