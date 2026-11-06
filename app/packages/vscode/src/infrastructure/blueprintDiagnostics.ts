import { blueprintProblems, type BlueprintProblem } from '../features/editorPreview/domain';

interface ProblemDocument {
  getText(): string;
  uri: { fsPath: string };
}

export interface ProblemCollection<Uri> {
  set(uri: Uri, problems: readonly BlueprintProblem[]): void;
  delete(uri: Uri): void;
  clear(): void;
  dispose(): void;
}

/** Publish blueprint problems when a YAML file opens or is saved. Other YAML stays clean. */
export function watchBlueprintProblems<Uri extends { fsPath: string } = { fsPath: string }>(api: {
  isTrusted(): boolean;
  onDidOpenTextDocument(listener: (document: ProblemDocument & { uri: Uri }) => void): {
    dispose(): void;
  };
  onDidSaveTextDocument(listener: (document: ProblemDocument & { uri: Uri }) => void): {
    dispose(): void;
  };
  collection: ProblemCollection<Uri>;
}): { dispose(): void } {
  const refresh = (document: ProblemDocument & { uri: Uri }) => {
    if (!isYamlPath(document.uri.fsPath)) return;
    if (!api.isTrusted()) {
      api.collection.delete(document.uri);
      return;
    }
    api.collection.set(document.uri, blueprintProblems(document.getText()));
  };
  const opened = api.onDidOpenTextDocument(refresh);
  const saved = api.onDidSaveTextDocument(refresh);
  return {
    dispose() {
      opened.dispose();
      saved.dispose();
      api.collection.dispose();
    },
  };
}

function isYamlPath(file: string): boolean {
  const path = file.toLowerCase();
  return path.endsWith('.yaml') || path.endsWith('.yml');
}
