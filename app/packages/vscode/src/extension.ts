import * as vscode from 'vscode';
import {
  compareWithScan,
  copyDiagram,
  generateFromWorkspace,
  openArchitectureMap,
  openSource,
  showHotspots,
} from './features/editorPreview';
import { watchBlueprintProblems } from './infrastructure/blueprintDiagnostics';
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
      get textDocuments() {
        return vscode.workspace.textDocuments;
      },
    },
    window: {
      showInformationMessage: (message, options, ...items) =>
        vscode.window.showInformationMessage(message, options, ...items),
      showQuickPick: (items, options) => vscode.window.showQuickPick(items, options),
      showInputBox: options => vscode.window.showInputBox(options),
      withProgress: (options, task) =>
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: options.title,
            cancellable: options.cancellable,
          },
          (_progress, token) => task(token)
        ),
      get activeTextEditor() {
        return vscode.window.activeTextEditor;
      },
      showTextDocument: (document, column) => vscode.window.showTextDocument(document, column),
      setStatusBarMessage: (message, hideAfterTimeout) => {
        void vscode.window.setStatusBarMessage(message, hideAfterTimeout);
      },
      createWebviewPanel: (viewType, title, column, options) =>
        vscode.window.createWebviewPanel(viewType, title, column, options),
    },
    env: {
      openExternal: uri => vscode.env.openExternal(uri),
      clipboard: {
        writeText: value => vscode.env.clipboard.writeText(value),
      },
    },
  };
}

export function activate(context: vscode.ExtensionContext): void {
  const problems = vscode.languages.createDiagnosticCollection('archlens');
  context.subscriptions.push(
    problems,
    watchBlueprintProblems<vscode.Uri>({
      isTrusted: () => vscode.workspace.isTrusted,
      onDidOpenTextDocument: listener =>
        vscode.workspace.onDidOpenTextDocument(document => {
          listener(document);
        }),
      onDidSaveTextDocument: listener =>
        vscode.workspace.onDidSaveTextDocument(document => {
          listener(document);
        }),
      collection: {
        set: (uri, items) => {
          problems.set(
            uri,
            items.map(
              item =>
                new vscode.Diagnostic(
                  new vscode.Range(item.line, 0, item.line, 0),
                  item.message,
                  vscode.DiagnosticSeverity.Warning
                )
            )
          );
        },
        delete: uri => {
          problems.delete(uri);
        },
        clear: () => {
          problems.clear();
        },
        dispose: () => {
          problems.dispose();
        },
      },
    }),
    vscode.commands.registerCommand('archlens.openArchitectureMap', (resource?: vscode.Uri) => {
      void run(() => openArchitectureMap, resource);
    }),
    vscode.commands.registerCommand('archlens.generateFromWorkspace', (resource?: vscode.Uri) => {
      void run(() => generateFromWorkspace, resource);
    }),
    vscode.commands.registerCommand('archlens.compareWithScan', (resource?: vscode.Uri) => {
      void run(() => compareWithScan, resource);
    }),
    vscode.commands.registerCommand('archlens.openSource', () => {
      void run(() => openSource, undefined);
    }),
    vscode.commands.registerCommand('archlens.copyDiagram', () => {
      void run(() => copyDiagram, undefined);
    }),
    vscode.commands.registerCommand('archlens.showHotspots', () => {
      void run(() => showHotspots, undefined);
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
