import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import { CHOOSE_FOLDER_TITLE, INTEREST_DISCUSSION_URL } from './copy';
import {
  httpsDiscussionUrl,
  planGenerateFromWorkspace,
  type InterestChoice,
} from './features/generate-interest/planGenerate';
import { blueprintsFolderName } from './features/open-map/blueprintsFolder';
import {
  collectBlueprintFiles,
  type WorkspaceFiles,
} from './features/open-map/collectBlueprintFiles';
import { isInsideFolder, isYamlPath } from './features/open-map/chooseFolder';
import {
  openArchitectureMap,
  previewAfterSave,
  type DiagramView,
  type MapSelection,
  type OpenMapResult,
} from './features/open-map/openMap';
import { renderPreviewDocument } from './features/open-map/renderPreview';

let previewPanel: vscode.WebviewPanel | undefined;
let openView: DiagramView | undefined;

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('archlens.openArchitectureMap', (resource?: vscode.Uri) => {
      void runOpen(context, resource).catch(reportError);
    }),
    vscode.commands.registerCommand('archlens.generateDiagramFromWorkspace', () => {
      void runGenerate().catch(reportError);
    }),
    vscode.workspace.onDidSaveTextDocument(document => {
      void refreshSaved(document).catch(reportError);
    })
  );
}

export function deactivate(): void {
  previewPanel = undefined;
  openView = undefined;
}

async function runOpen(context: vscode.ExtensionContext, resource?: vscode.Uri): Promise<void> {
  const invokedPath = yamlPath(resource);
  const activePath = vscode.window.activeTextEditor?.document.uri.fsPath;
  const selection: MapSelection = { invokedPath, activePath };
  const result = await openArchitectureMap(
    {
      isTrusted: () => vscode.workspace.isTrusted,
      readCandidates: () =>
        collectBlueprintFiles(workspaceFiles(), {
          invokedPath,
          activePath,
          blueprintsFolderSetting: vscode.workspace
            .getConfiguration('archlens')
            .get('blueprintsFolder'),
        }),
    },
    selection
  );
  presentOpenResult(context, result);
}

function presentOpenResult(context: vscode.ExtensionContext, result: OpenMapResult): void {
  switch (result.kind) {
    case 'blocked':
      void vscode.window.showInformationMessage(result.message);
      return;
    case 'cancelled':
    case 'not-blueprint':
      return;
    case 'empty':
      openView = undefined;
      showPreview(context, 'Architecture map', renderPreviewDocument({ kind: 'empty' }, nonce()));
      return;
    case 'diagram':
      openView = result.view;
      showPreview(
        context,
        result.view.diagramName,
        renderPreviewDocument({ kind: 'diagram', view: result.view }, nonce())
      );
      return;
    default: {
      const neverResult: never = result;
      throw new Error(`Unexpected map result: ${JSON.stringify(neverResult)}`);
    }
  }
}

async function refreshSaved(document: vscode.TextDocument): Promise<void> {
  if (!previewPanel || !openView || !vscode.workspace.isTrusted) return;
  const next = previewAfterSave(openView, {
    path: document.uri.fsPath,
    content: document.getText(),
  });
  if (next.kind === 'unchanged') return;
  openView = next.view;
  previewPanel.title = next.view.diagramName;
  previewPanel.webview.html = renderPreviewDocument({ kind: 'diagram', view: next.view }, nonce());
}

async function runGenerate(): Promise<void> {
  const result = await planGenerateFromWorkspace({
    isTrusted: () => vscode.workspace.isTrusted,
    isGenerateEnabled: () =>
      vscode.workspace.getConfiguration('archlens').get<boolean>('generateFromWorkspace.enabled') ??
      false,
    discussionUrl: () => INTEREST_DISCUSSION_URL,
    askInterest: async prompt => askInterest(prompt.body, prompt.tellUs, prompt.cancel),
    openDiscussion: async url => {
      const safe = httpsDiscussionUrl(url);
      if (!safe) return;
      await vscode.env.openExternal(vscode.Uri.parse(safe));
    },
  });
  if (result.kind === 'blocked') {
    void vscode.window.showInformationMessage(result.message);
  }
}

async function askInterest(body: string, tellUs: string, cancel: string): Promise<InterestChoice> {
  const choice = await vscode.window.showInformationMessage(body, { modal: true }, tellUs, cancel);
  if (choice === tellUs) return 'tell-us';
  if (choice === cancel) return 'cancel';
  return 'escape';
}

function workspaceFiles(): WorkspaceFiles {
  return {
    workspaceFolders: () =>
      vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath) ?? [],
    findYaml: (folder, blueprintsFolder) =>
      findYaml(folder, blueprintsFolderName(blueprintsFolder)),
    readText: readWorkspaceText,
    pickFolder: pickFolder,
  };
}

async function findYaml(folder: string, blueprintsFolder: string): Promise<string[]> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.find(
    item => item.uri.fsPath === folder
  );
  if (!workspaceFolder) return [];
  const exclude = '**/{node_modules,dist,build,.git}/**';
  const yaml = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, `${blueprintsFolder}/**/*.yaml`),
    exclude
  );
  const yml = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, `${blueprintsFolder}/**/*.yml`),
    exclude
  );
  return [...yaml, ...yml]
    .map(uri => uri.fsPath)
    .filter(file => isInsideFolder(file, folder) && isYamlPath(file));
}

async function readWorkspaceText(filePath: string): Promise<string> {
  const folders = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath) ?? [];
  if (!folders.some(folder => isInsideFolder(filePath, folder))) {
    throw new Error('ArchLens only reads files inside the workspace.');
  }
  const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
  return new TextDecoder('utf-8').decode(bytes);
}

async function pickFolder(folders: string[]): Promise<string | undefined> {
  const picked = await vscode.window.showQuickPick(
    folders.map(folder => ({
      label: folder.split(/[/\\]/).pop() ?? folder,
      description: folder,
      folder,
    })),
    { title: CHOOSE_FOLDER_TITLE, placeHolder: CHOOSE_FOLDER_TITLE }
  );
  return picked?.folder;
}

function showPreview(context: vscode.ExtensionContext, title: string, html: string): void {
  if (previewPanel) {
    previewPanel.title = title;
    previewPanel.webview.html = html;
    previewPanel.reveal(vscode.ViewColumn.Beside);
    return;
  }
  previewPanel = vscode.window.createWebviewPanel(
    'archlens.architectureMap',
    title,
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  const panel = previewPanel;
  context.subscriptions.push(
    panel.onDidDispose(() => {
      if (previewPanel === panel) {
        previewPanel = undefined;
        openView = undefined;
      }
    })
  );
  panel.webview.html = html;
}

function yamlPath(resource: vscode.Uri | undefined): string | undefined {
  if (!resource || !isYamlPath(resource.fsPath)) return undefined;
  return resource.fsPath;
}

function nonce(): string {
  return randomBytes(16).toString('base64');
}

function reportError(error: unknown): void {
  const message =
    error instanceof Error ? error.message : 'ArchLens could not open the architecture map.';
  void vscode.window.showErrorMessage(message);
}
