import {
  hasUnsavedBlueprint,
  isYamlPath,
  type BlueprintDocument,
} from '../features/editorPreview/domain';
import type { BlueprintFile, EditorHost, WorkspaceFolder } from '../features/editorPreview/ports';
import { readVisibleDiagram, setSessionHotspots } from './diagramSession';
import type { FileUri, FolderPickItem, OpenDocument, WebviewPanel } from './host/vscodeTypes';
import {
  configuredBlueprintsFolder,
  listBlueprintFiles,
  panelPainters,
  readFile,
  showDiagram,
  showEmptyMap,
} from './host/webviewPanelAdapter';
import {
  askGenerateInterest,
  askScanGlob,
  askScanScope,
  confirmGenerate,
  hasGitHistory,
  listSourceFiles,
  readGitignore,
  scanFolder,
  showReview,
} from './host/workspaceFileTransactions';

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
      writeFile(uri: Uri, content: Uint8Array): Thenable<void>;
      delete(uri: Uri): Thenable<void>;
      createDirectory(uri: Uri): Thenable<void>;
    };
    openTextDocument(uri: Uri): Thenable<Document>;
    onDidSaveTextDocument(listener: (document: Document) => void): { dispose(): void };
    applyTextDocument?(uri: Uri, content: string): Thenable<void>;
    saveTextDocument?(uri: Uri): Thenable<boolean>;
    readonly textDocuments?: readonly { uri: Uri; isDirty: boolean; getText(): string }[];
  };
  window: {
    showInformationMessage(
      message: string,
      options: { modal?: boolean; detail?: string },
      ...items: string[]
    ): Thenable<string | undefined>;
    showQuickPick(
      items: readonly FolderPickItem[],
      options: { title: string; placeHolder?: string }
    ): Thenable<FolderPickItem | undefined>;
    showInputBox(options: {
      title: string;
      prompt: string;
      value: string;
    }): Thenable<string | undefined>;
    withProgress<T>(
      options: { title: string; cancellable: boolean },
      task: (token: { isCancellationRequested: boolean }) => Thenable<T>
    ): Thenable<T>;
    activeTextEditor: { document: Document } | undefined;
    showTextDocument(document: Document, column: number): Thenable<unknown>;
    createWebviewPanel(
      viewType: string,
      title: string,
      column: number,
      options: { enableScripts: boolean; localResourceRoots?: readonly Uri[] }
    ): WebviewPanel<Uri>;
  };
  env: {
    openExternal(uri: Uri): Thenable<boolean>;
    clipboard: { writeText(value: string): Thenable<void> };
  };
  extensionUri?: Uri;
}

export async function createEditorHost<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  resource?: Uri
): Promise<EditorHost> {
  const selection = api.workspace.isTrusted ? await describeResource(api, resource) : {};

  return {
    isTrusted: () => api.workspace.isTrusted,
    generateEnabled: () => true,
    selectedPath: () => selection.filePath,
    selectedFolder: () => selection.folderPath,
    hintPath: () => selection.hintPath,
    workspaceFolders: () => workspaceFolders(api),
    pickFolder: folders => pickFolder(api, folders),
    readSelectedFile: () => readSelected(api, selection.filePath),
    listBlueprintFiles: folderPath => listBlueprintFiles(api, folderPath),
    blueprintsFolder: () => configuredBlueprintsFolder(api),
    showMessage: message => {
      void api.window.showInformationMessage(message, {});
    },
    showDiagram: diagram => showDiagram(api, diagram),
    showEmptyMap: () => showEmptyMap(api),
    askGenerateInterest: () => askGenerateInterest(api),
    openDiscussion: async url => {
      await api.env.openExternal(api.Uri.parse(url));
    },
    visibleSchema: () => readVisibleDiagram()?.schema,
    writeClipboard: async text => {
      await api.env.clipboard.writeText(text);
    },
    visibleMap: () => {
      const visible = readVisibleDiagram();
      if (!visible) return undefined;
      return {
        hotspotsOn: visible.hotspotsOn,
        ...(visible.workspaceRoot ? { workspaceRoot: visible.workspaceRoot } : {}),
      };
    },
    hasGitHistory: root => hasGitHistory(api, root),
    setHotspots: on => {
      const visible = readVisibleDiagram();
      if (!visible) return;
      setSessionHotspots(visible.id, on);
      panelPainters.get(visible.id)?.();
    },
    listSourceFiles: (root, glob) => listSourceFiles(api, root, glob),
    readSource: async filePath => {
      try {
        return (await readFile(api, api.Uri.file(filePath))).content;
      } catch {
        return null;
      }
    },
    readGitignore: root => readGitignore(api, root),
    askScanScope: found => askScanScope(api, found),
    askScanGlob: () => askScanGlob(api),
    confirmGenerate: () => confirmGenerate(api),
    scanFolder: root => scanFolder(api, root),
    unsavedBlueprint: () =>
      hasUnsavedBlueprint(
        (api.workspace.textDocuments ?? []).map(document => ({
          path: document.uri.fsPath,
          dirty: document.isDirty,
          content: document.getText(),
        })),
        {
          roots: workspaceFolders(api).map(folder => folder.path),
          blueprintsFolder: configuredBlueprintsFolder(api),
        }
      ),
    showReview: rows => showReview(api, rows),
    applyBlueprintWrite: documents => applyBlueprintWrite(api, documents),
  };
}

async function describeResource<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  resource: Uri | undefined
): Promise<{ filePath?: string; folderPath?: string; hintPath?: string }> {
  const target = resource ?? activeEditorUri(api);
  if (!target) return {};
  if (!resource && isYamlPath(target.fsPath)) return { filePath: target.fsPath };
  if (!resource) return { hintPath: target.fsPath };
  const stat = await api.workspace.fs.stat(target);
  if ((stat.type & api.FileType.Directory) !== 0) {
    return { folderPath: target.fsPath };
  }
  return { filePath: target.fsPath };
}

function activeEditorUri<Uri extends FileUri>(api: VsCodeLike<Uri>): Uri | undefined {
  return api.window.activeTextEditor?.document.uri;
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

async function applyBlueprintWrite<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  documents: readonly BlueprintDocument[]
): Promise<'written' | 'failed'> {
  const originals: { path: string; bytes?: Uint8Array }[] = [];
  try {
    for (const document of documents) {
      originals.push({ path: document.path, bytes: await readBytes(api, document.path) });
    }
    for (const document of documents) {
      await writeBlueprintDocument(api, document);
    }
    return 'written';
  } catch {
    for (const original of originals) {
      await restoreBlueprintDocument(api, original.path, original.bytes);
    }
    return 'failed';
  }
}

async function readBytes<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  filePath: string
): Promise<Uint8Array | undefined> {
  try {
    return await api.workspace.fs.readFile(api.Uri.file(filePath));
  } catch {
    return undefined;
  }
}

async function writeBlueprintDocument<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  document: BlueprintDocument
): Promise<void> {
  const uri = api.Uri.file(document.path);
  if (document.content === undefined) {
    await api.workspace.fs.delete(uri);
    return;
  }
  await ensureParentDirectory(api, document.path);
  await api.workspace.fs.writeFile(uri, new TextEncoder().encode(document.content));
}

async function restoreBlueprintDocument<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  filePath: string,
  bytes: Uint8Array | undefined
): Promise<void> {
  try {
    if (bytes === undefined) {
      await api.workspace.fs.delete(api.Uri.file(filePath));
      return;
    }
    await api.workspace.fs.writeFile(api.Uri.file(filePath), bytes);
  } catch {
    return;
  }
}

async function ensureParentDirectory<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  filePath: string
): Promise<void> {
  const parent = filePath.replace(/[/\\][^/\\]+$/, '');
  if (!parent || parent === filePath) return;
  try {
    const stat = await api.workspace.fs.stat(api.Uri.file(parent));
    if ((stat.type & api.FileType.Directory) !== 0) return;
  } catch {
    await api.workspace.fs.createDirectory(api.Uri.file(parent));
  }
}
