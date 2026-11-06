import * as vscode from 'vscode';
import { generateFromWorkspace, openArchitectureMap } from './features/editorPreview';
import { createEditorHost, type VsCodeLike } from './infrastructure/vscodeHost';

function vscodeApi(): VsCodeLike<vscode.Uri, vscode.TextDocument> {
  return {
    FileType: vscode.FileType,
    ViewColumn: {
      Active: vscode.ViewColumn.Active,
      Beside: vscode.ViewColumn.Beside,
    },
    Uri: {
      file: filePath => vscode.Uri.file(filePath),
      parse: value => vscode.Uri.parse(value),
    },
    workspace: {
      get isTrusted() {
        return vscode.workspace.isTrusted;
      },
      get workspaceFolders() {
        return vscode.workspace.workspaceFolders;
      },
      getConfiguration: section => vscode.workspace.getConfiguration(section),
      findFiles: pattern =>
        vscode.workspace.findFiles(new vscode.RelativePattern(pattern.base, pattern.pattern)),
      fs: vscode.workspace.fs,
      openTextDocument: uri => vscode.workspace.openTextDocument(uri),
      onDidSaveTextDocument: listener => vscode.workspace.onDidSaveTextDocument(listener),
    },
    window: {
      showInformationMessage: (message, options, ...items) =>
        vscode.window.showInformationMessage(message, options, ...items),
      showQuickPick: (items, options) => vscode.window.showQuickPick(items, options),
      get activeTextEditor() {
        return vscode.window.activeTextEditor;
      },
      showTextDocument: (document, column) => vscode.window.showTextDocument(document, column),
      createWebviewPanel: (viewType, title, column, options) =>
        vscode.window.createWebviewPanel(viewType, title, column, options),
    },
    env: {
      openExternal: uri => vscode.env.openExternal(uri),
    },
  };
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('archlens.openArchitectureMap', (resource?: vscode.Uri) => {
      void run(() => openArchitectureMap, resource);
    }),
    vscode.commands.registerCommand('archlens.generateFromWorkspace', (resource?: vscode.Uri) => {
      void run(() => generateFromWorkspace, resource);
    })
  );
}

async function run(
  command: () => (host: Awaited<ReturnType<typeof createEditorHost>>) => Promise<void>,
  resource: vscode.Uri | undefined
): Promise<void> {
  try {
    const host = await createEditorHost(vscodeApi(), resource);
    await command()(host);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(message);
  }
}

export function deactivate(): void {}
