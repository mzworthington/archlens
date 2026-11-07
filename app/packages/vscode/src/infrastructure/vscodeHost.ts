import { randomBytes } from 'node:crypto';
import { parseSchemaFromYaml, type SystemSchema } from '@archlens/core';
import {
  CANCEL_COPY,
  CUSTOM_FILES_COPY,
  CUSTOM_GLOB_HINT,
  DEFAULT_SOURCE_GLOB,
  GENERATE_DIAGRAM_COPY,
  GENERATE_OFF_COPY,
  GENERATE_TITLE,
  KEEP_FILES_COPY,
  NO_CHANGES_COPY,
  NO_LOWER_COPY,
  REVIEW_NOTE,
  REVIEW_TITLE,
  TELL_US_COPY,
  THIS_FOLDER_COPY,
  WHOLE_WORKSPACE_COPY,
  decideBack,
  decideDrill,
  decideOpenMap,
  isInsideEditorPath,
  isYamlPath,
  presentHotspots,
  safeBlueprintsFolder,
  sameEditorPath,
  type ReviewRow,
} from '../features/editorPreview/domain';
import { renderMap } from '../features/editorPreview/renderMap';
import type {
  BlueprintFile,
  DiagramView,
  EditorHost,
  GenerateChoice,
  ScanOutcome,
  ScanScopeChoice,
  WorkspaceFolder,
} from '../features/editorPreview/ports';
import {
  closeDiagramSession,
  focusDiagramSystem,
  openDiagramSession,
  readFocusedSystem,
  readSessionView,
  readVisibleDiagram,
  replaceDiagramSession,
  setSessionHotspots,
  showInSession,
} from './diagramSession';

interface WebviewPanel {
  webview: {
    html: string;
    onDidReceiveMessage(listener: (message: unknown) => void | Promise<void>): {
      dispose(): void;
    };
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
    clipboard: { writeText(value: string): Thenable<void> };
  };
}

const STATUS_HIDE_MS = 5000;
const panelPainters = new Map<number, () => void>();

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
    askScanScope: found => askScanScope(api, found),
    askScanGlob: () => askScanGlob(api),
    confirmGenerate: () => confirmGenerate(api),
    scanFolder: root => scanFolder(api, root),
    showReview: rows => showReview(api, rows),
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
    if (!isInsideEditorPath(uri.fsPath, folderPath)) continue;
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
  const schema = schemaFrom(document.getText());
  const shown = { session: 0, path: diagram.sourcePath };
  shown.session = openDiagramSession(diagram, workspaceRootFor(api, diagram.sourcePath), schema);
  const paint = () => {
    const view = readSessionView(shown.session);
    if (!view) return;
    panel.webview.html = renderMap(
      presentHotspots(view.diagram, view.schema?.nodes ?? [], view.hotspotsOn),
      mapNonce()
    );
  };
  panelPainters.set(shown.session, paint);
  paint();
  const messages = panel.webview.onDidReceiveMessage(message =>
    onPanelMessage(api, shown, message, paint)
  );
  const listener = api.workspace.onDidSaveTextDocument(saved => {
    if (!sameEditorPath(saved.uri.fsPath, shown.path)) return;
    const decision = decideOpenMap({
      files: [{ path: shown.path, content: saved.getText() }],
      selectedPath: shown.path,
    });
    if (decision.kind !== 'diagram') return;
    shown.session = replaceDiagramSession(
      shown.session,
      decision.diagram,
      workspaceRootFor(api, decision.diagram.sourcePath),
      schemaFrom(saved.getText())
    );
    panelPainters.set(shown.session, paint);
    paint();
  });
  panel.onDidDispose(() => {
    panelPainters.delete(shown.session);
    closeDiagramSession(shown.session);
    messages.dispose();
    listener.dispose();
  });
}

async function onPanelMessage<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  shown: { session: number; path: string },
  message: unknown,
  paint: () => void
): Promise<void> {
  const focus = focusEntity(message);
  if (focus) {
    focusDiagramSystem(shown.session, focus);
    return;
  }
  const action = panelAction(message);
  if (!action) return;
  const visible = readVisibleDiagram();
  if (!visible || visible.id !== shown.session) return;
  const root = visible.workspaceRoot;
  if (!root) {
    if (action.type === 'drill') {
      void api.window.showInformationMessage(NO_LOWER_COPY, {});
    }
    return;
  }
  const files = await listBlueprintFiles(api, root);
  if (action.type === 'drill') {
    const decision = decideDrill({
      files,
      focusedEntityRef: action.entityRef,
      currentPath: visible.sourcePath,
    });
    if (decision.kind === 'none') {
      void api.window.showInformationMessage(decision.message, {});
      return;
    }
    const system = visible.systems.find(item => item.entityRef === action.entityRef);
    const breadcrumb = [
      ...visible.breadcrumb,
      { name: system?.name ?? decision.schema.name, sourcePath: decision.diagram.sourcePath },
    ];
    showInSession(shown.session, decision.diagram, decision.schema, breadcrumb);
    shown.path = decision.diagram.sourcePath;
    paint();
    return;
  }
  const decision = decideBack({
    breadcrumb: visible.breadcrumb,
    files,
    ...(action.type === 'breadcrumb' ? { sourcePath: action.sourcePath } : {}),
  });
  if (decision.kind === 'stay') return;
  showInSession(shown.session, decision.diagram, decision.schema, decision.breadcrumb);
  shown.path = decision.diagram.sourcePath;
  paint();
}

async function hasGitHistory<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  root: string
): Promise<boolean> {
  const folder = root.replaceAll('\\', '/').replace(/\/+$/, '');
  try {
    await api.workspace.fs.stat(api.Uri.file(`${folder}/.git`));
    return true;
  } catch {
    return false;
  }
}

function schemaFrom(content: string): SystemSchema | undefined {
  try {
    return parseSchemaFromYaml(content);
  } catch {
    return undefined;
  }
}

function focusEntity(message: unknown): string | undefined {
  if (!isRecord(message) || message.type !== 'focus-system') return undefined;
  return typeof message.entityRef === 'string' ? message.entityRef : undefined;
}

function panelAction(
  message: unknown
):
  | { type: 'drill'; entityRef: string }
  | { type: 'back' }
  | { type: 'breadcrumb'; sourcePath: string }
  | undefined {
  if (!isRecord(message)) return undefined;
  if (message.type === 'drill' && typeof message.entityRef === 'string') {
    return { type: 'drill', entityRef: message.entityRef };
  }
  if (message.type === 'back') return { type: 'back' };
  if (message.type === 'breadcrumb' && typeof message.sourcePath === 'string') {
    return { type: 'breadcrumb', sourcePath: message.sourcePath };
  }
  return undefined;
}

function isRecord(message: unknown): message is Record<string, unknown> {
  return typeof message === 'object' && message !== null;
}

function mapNonce(): string {
  return randomBytes(16).toString('hex');
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

async function listSourceFiles<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  root: string,
  glob: string
): Promise<string[]> {
  const patterns =
    glob === DEFAULT_SOURCE_GLOB ? [glob, '**/*.tf.json', '**/Pulumi*.{yaml,yml}'] : [glob];
  const paths: string[] = [];
  for (const pattern of patterns) {
    const uris = await api.workspace.findFiles({ base: root, pattern });
    for (const uri of uris) paths.push(uri.fsPath);
  }
  return [...new Set(paths)];
}

async function askScanScope<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  found: string
): Promise<ScanScopeChoice> {
  const picked = await api.window.showQuickPick(
    [
      { label: WHOLE_WORKSPACE_COPY, description: found, path: 'workspace' },
      { label: THIS_FOLDER_COPY, description: found, path: 'folder' },
      { label: CUSTOM_FILES_COPY, description: found, path: 'custom' },
    ],
    { title: GENERATE_TITLE, placeHolder: found }
  );
  if (picked?.path === 'workspace' || picked?.path === 'folder' || picked?.path === 'custom') {
    return picked.path;
  }
  return 'escape';
}

async function askScanGlob<Uri extends FileUri>(api: VsCodeLike<Uri>): Promise<string | undefined> {
  const glob = await api.window.showInputBox({
    title: CUSTOM_FILES_COPY,
    prompt: CUSTOM_GLOB_HINT,
    value: DEFAULT_SOURCE_GLOB,
  });
  const trimmed = glob?.trim();
  return trimmed ? trimmed : undefined;
}

async function confirmGenerate<Uri extends FileUri>(
  api: VsCodeLike<Uri>
): Promise<'generate' | 'cancel'> {
  const choice = await api.window.showInformationMessage(
    GENERATE_DIAGRAM_COPY,
    { modal: true },
    GENERATE_DIAGRAM_COPY,
    CANCEL_COPY
  );
  return choice === GENERATE_DIAGRAM_COPY ? 'generate' : 'cancel';
}

async function scanFolder<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  root: string
): Promise<ScanOutcome> {
  try {
    return await api.window.withProgress(
      { title: `Scanning ${root}…`, cancellable: true },
      async token => (token.isCancellationRequested ? 'cancelled' : 'ready')
    );
  } catch {
    return 'failed';
  }
}

async function showReview<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  rows: readonly ReviewRow[]
): Promise<void> {
  const lines =
    rows.length === 0 ? NO_CHANGES_COPY : rows.map(row => `${row.status} ${row.name}`).join('\n');
  await api.window.showInformationMessage(
    REVIEW_TITLE,
    { modal: true, detail: `${lines}\n\n${REVIEW_NOTE}` },
    KEEP_FILES_COPY
  );
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
