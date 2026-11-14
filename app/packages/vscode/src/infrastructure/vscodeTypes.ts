export interface WebviewPanel<Uri extends FileUri = FileUri> {
  webview: {
    html: string;
    cspSource?: string;
    postMessage?(message: unknown): void;
    asWebviewUri?(uri: Uri): Uri;
    onDidReceiveMessage(listener: (message: unknown) => void | Promise<void>): {
      dispose(): void;
    };
  };
  onDidDispose(listener: () => void): void;
}

export interface FolderPickItem {
  label: string;
  description: string;
  path: string;
}

export type FileUri = { fsPath: string; toString(): string };
export type OpenDocument<Uri extends FileUri> = {
  getText(): string;
  uri: Uri;
  isDirty?: boolean;
};

export interface VsCodeHostLike<
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
