import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { parseSchemaFromYaml, serializeSchemaToYaml, type SystemSchema } from '@archlens/core';
import {
  decideBack,
  decideDrill,
  decideOpenMap,
  isInsideEditorPath,
  NO_LOWER_COPY,
  readableBlueprint,
  safeBlueprintsFolder,
  sameEditorPath,
} from '../../features/editorPreview/domain';
import type { BlueprintFile, DiagramView } from '../../features/editorPreview/ports';
import { renderCanvasShell, renderEmptyMap } from '../../features/editorPreview/renderMap';
import {
  closeDiagramSession,
  openDiagramSession,
  readSessionView,
  replaceDiagramSession,
  setSessionSchema,
  showInSession,
} from '../diagramSession';
import type { VsCodeLike } from '../vscodeHost';
import type { FileUri, WebviewPanel } from './vscodeTypes';

export const panelPainters = new Map<number, () => void>();

export async function readFile<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  uri: Uri
): Promise<BlueprintFile> {
  const bytes = await api.workspace.fs.readFile(uri);
  return { path: uri.fsPath, content: new TextDecoder().decode(bytes) };
}

export function configuredBlueprintsFolder<Uri extends FileUri>(api: VsCodeLike<Uri>): string {
  const configured = api.workspace
    .getConfiguration('archlens')
    .get('blueprintsFolder', 'blueprints');
  return safeBlueprintsFolder(configured);
}

export async function listBlueprintFiles<Uri extends FileUri>(
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

function blueprintSearchPattern(folderPath: string, blueprintsFolder: string): string {
  const segments = folderPath.split(/[/\\]/).filter(segment => segment.length > 0);
  const name = segments[segments.length - 1];
  if (name === blueprintsFolder) return '**/*.{yaml,yml}';
  return `${blueprintsFolder}/**/*.{yaml,yml}`;
}

function configuredMapTheme<Uri extends FileUri>(api: VsCodeLike<Uri>): 'light' | 'system' {
  const configured = api.workspace.getConfiguration('archlens').get<string>('theme', 'light');
  return configured === 'system' ? 'system' : 'light';
}

export function showEmptyMap<Uri extends FileUri>(api: VsCodeLike<Uri>): void {
  const panel = api.window.createWebviewPanel(
    'archlens.architectureMap',
    'Architecture map',
    api.ViewColumn.Beside,
    { enableScripts: false }
  );
  panel.webview.html = renderEmptyMap();
}

function canvasSources<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  panel: WebviewPanel<Uri>
): { scriptSrc: string; styleSrc: string; cspSource: string } {
  const extensionUri = api.extensionUri;
  if (!extensionUri || !panel.webview.asWebviewUri) {
    return {
      scriptSrc: 'canvas-preview.js',
      styleSrc: 'canvas-preview.css',
      cspSource: '',
    };
  }
  const directory = path.join(extensionUri.fsPath, 'media', 'canvas-preview');
  return {
    scriptSrc: panel.webview
      .asWebviewUri(api.Uri.file(path.join(directory, 'canvas-preview.js')))
      .toString(),
    styleSrc: panel.webview
      .asWebviewUri(api.Uri.file(path.join(directory, 'canvas-preview.css')))
      .toString(),
    cspSource: panel.webview.cspSource ?? '',
  };
}

export async function showDiagram<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  diagram: DiagramView
): Promise<void> {
  const document = await api.workspace.openTextDocument(api.Uri.file(diagram.sourcePath));
  await api.window.showTextDocument(document, api.ViewColumn.Active);
  const mediaRoot = api.extensionUri
    ? api.Uri.file(path.join(api.extensionUri.fsPath, 'media'))
    : undefined;
  const panel = api.window.createWebviewPanel(
    'archlens.architectureMap',
    'Architecture map',
    api.ViewColumn.Beside,
    {
      enableScripts: true,
      ...(mediaRoot ? { localResourceRoots: [mediaRoot] } : {}),
    }
  );
  const schema = schemaFrom(document.getText());
  const shown: { session: number; path: string; synced?: string } = {
    session: 0,
    path: diagram.sourcePath,
  };
  const workspaceRoot = workspaceRootFor(api, diagram.sourcePath);
  shown.session = openDiagramSession(diagram, workspaceRoot, schema);
  const listed = workspaceRoot ? await listBlueprintFiles(api, workspaceRoot).catch(() => []) : [];
  const blueprints = listed.map(file => ({
    name: file.path,
    content: readableBlueprint(file.content),
  }));
  let ready = false;
  const paint = () => {
    const view = readSessionView(shown.session);
    if (!view) return;
    const update = {
      type: 'show' as const,
      yaml: view.schema ? serializeSchemaToYaml(view.schema) : '',
      hotspots: view.hotspotsOn,
    };
    if (ready) {
      panel.webview.postMessage?.(update);
      return;
    }
    const sources = canvasSources(api, panel);
    panel.webview.html = renderCanvasShell({
      yaml: update.yaml,
      hotspots: update.hotspots,
      theme: configuredMapTheme(api),
      nonce: mapNonce(),
      scriptSrc: sources.scriptSrc,
      styleSrc: sources.styleSrc,
      cspSource: sources.cspSource,
      blueprints,
    });
  };
  panelPainters.set(shown.session, paint);
  paint();
  const messages = panel.webview.onDidReceiveMessage(message => {
    if (isRecord(message) && message.type === 'ready') {
      ready = true;
      return;
    }
    return onPanelMessage(api, shown, message, paint);
  });
  const listener = api.workspace.onDidSaveTextDocument(saved => {
    if (!sameEditorPath(saved.uri.fsPath, shown.path)) return;
    if (saved.getText() === shown.synced) return;
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
  shown: { session: number; path: string; synced?: string },
  message: unknown,
  paint: () => void
): Promise<void> {
  const action = panelAction(message);
  if (!action) return;
  if (action.type === 'sync') {
    await writeSyncedBlueprint(api, shown, action.yaml);
    return;
  }
  const view = readSessionView(shown.session);
  if (!view) return;
  const root = view.workspaceRoot;
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
      currentPath: view.diagram.sourcePath,
    });
    if (decision.kind === 'none') {
      void api.window.showInformationMessage(decision.message, {});
      return;
    }
    const system = view.diagram.systems.find(item => item.entityRef === action.entityRef);
    const targetPath = decision.diagram.sourcePath;
    const prior = view.diagram.breadcrumb ?? [];
    const existing = prior.findIndex(crumb => sameEditorPath(crumb.sourcePath, targetPath));
    const currentRef = view.schema?.entityRef;
    const targetRef = decision.schema.entityRef;
    const zoomingOut =
      existing >= 0 ||
      (typeof currentRef === 'string' &&
        typeof targetRef === 'string' &&
        currentRef.startsWith(`${targetRef}/`));
    const crumb = {
      name: system?.name ?? decision.schema.name,
      sourcePath: targetPath,
    };
    const breadcrumb = zoomingOut
      ? existing >= 0
        ? prior.slice(0, existing + 1)
        : [crumb]
      : [...prior, crumb];
    showInSession(shown.session, decision.diagram, decision.schema, breadcrumb);
    shown.synced = undefined;
    shown.path = decision.diagram.sourcePath;
    paint();
    return;
  }
  const decision = decideBack({
    breadcrumb: view.diagram.breadcrumb ?? [],
    files,
    ...(action.type === 'breadcrumb' ? { sourcePath: action.sourcePath } : {}),
  });
  if (decision.kind === 'stay') return;
  showInSession(shown.session, decision.diagram, decision.schema, decision.breadcrumb);
  shown.synced = undefined;
  shown.path = decision.diagram.sourcePath;
  paint();
}

function schemaFrom(content: string): SystemSchema | undefined {
  try {
    return parseSchemaFromYaml(readableBlueprint(content));
  } catch {
    return undefined;
  }
}

function panelAction(
  message: unknown
):
  | { type: 'drill'; entityRef: string }
  | { type: 'back' }
  | { type: 'breadcrumb'; sourcePath: string }
  | { type: 'sync'; yaml: string }
  | undefined {
  if (!isRecord(message)) return undefined;
  if (message.type === 'drill' && typeof message.entityRef === 'string') {
    return { type: 'drill', entityRef: message.entityRef };
  }
  if (message.type === 'back') return { type: 'back' };
  if (message.type === 'breadcrumb' && typeof message.sourcePath === 'string') {
    return { type: 'breadcrumb', sourcePath: message.sourcePath };
  }
  if (message.type === 'sync' && typeof message.yaml === 'string') {
    return { type: 'sync', yaml: message.yaml };
  }
  return undefined;
}

async function writeSyncedBlueprint<Uri extends FileUri>(
  api: VsCodeLike<Uri>,
  shown: { session: number; path: string; synced?: string },
  yaml: string
): Promise<void> {
  const apply = api.workspace.applyTextDocument;
  const save = api.workspace.saveTextDocument;
  if (!apply || !save || yaml.trim().length === 0) return;
  const schema = schemaFrom(yaml);
  if (!schema) return;
  const uri = api.Uri.file(shown.path);
  const document = await api.workspace.openTextDocument(uri);
  const current = document.getText();
  if (document.isDirty === true && current !== shown.synced) return;
  shown.synced = yaml;
  setSessionSchema(shown.session, schema);
  if (current === yaml) return;
  await apply(uri, yaml);
  await save(uri);
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
