import * as vscode from 'vscode';
import { activatePreview, type PreviewHost, type PreviewUri } from './adapters/vscodePreview';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(activatePreview(editorHost()));
}

export function deactivate(): void {}

function editorHost(): PreviewHost {
  return {
    workspace: {
      get isTrusted() {
        return vscode.workspace.isTrusted;
      },
      get workspaceFolders() {
        return vscode.workspace.workspaceFolders?.map(folder => ({
          uri: { fsPath: folder.uri.fsPath },
        }));
      },
      getConfiguration(section) {
        const configuration = vscode.workspace.getConfiguration(section);
        return { get: key => configuration.get(key) };
      },
      findFiles(pattern) {
        return vscode.workspace.findFiles(
          new vscode.RelativePattern(pattern.base, pattern.pattern),
          '**/node_modules/**'
        );
      },
      fs: {
        readFile(uri) {
          return vscode.workspace.fs.readFile(vscode.Uri.file(uri.fsPath));
        },
      },
    },
    window: {
      showInformationMessage(message, options, ...items) {
        if (options) {
          return vscode.window.showInformationMessage(message, options, ...items);
        }
        return vscode.window.showInformationMessage(message);
      },
      createWebviewPanel(viewType, title, column, options) {
        const panel = vscode.window.createWebviewPanel(viewType, title, column, options);
        return { webview: panel.webview };
      },
    },
    commands: {
      registerCommand(command, callback) {
        return vscode.commands.registerCommand(command, (resource?: vscode.Uri) => {
          const target: PreviewUri | undefined = resource ? { fsPath: resource.fsPath } : undefined;
          return callback(target);
        });
      },
    },
    env: {
      openExternal(uri) {
        return vscode.env.openExternal(vscode.Uri.parse(uri.toString()));
      },
    },
    Uri: {
      file(path) {
        return { fsPath: path };
      },
      parse(value) {
        const uri = vscode.Uri.parse(value);
        return { toString: () => uri.toString() };
      },
    },
    RelativePattern: class RelativePattern {
      constructor(
        public base: string,
        public pattern: string
      ) {}
    },
    ViewColumn: { Beside: vscode.ViewColumn.Beside },
  };
}
