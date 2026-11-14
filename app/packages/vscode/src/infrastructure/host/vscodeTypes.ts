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
