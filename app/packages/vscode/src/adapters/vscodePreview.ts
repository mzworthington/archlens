import {
  GENERATE_PROMPT,
  generateFromWorkspace,
  openArchitectureMap,
  renderArchitectureMapPanel,
  type GeneratePromptAction,
} from '../features/editorPreview/editorPreview';

export interface PreviewUri {
  fsPath: string;
}

export interface PreviewWebview {
  html: string;
}

export interface PreviewHost {
  workspace: {
    isTrusted: boolean;
    workspaceFolders: readonly { uri: PreviewUri }[] | undefined;
    getConfiguration(section: string): { get(key: string): unknown };
    findFiles(pattern: { base: string; pattern: string }): Thenable<readonly PreviewUri[]>;
    fs: {
      readFile(uri: PreviewUri): Thenable<Uint8Array>;
    };
  };
  window: {
    showInformationMessage(
      message: string,
      options?: { modal?: boolean; detail?: string },
      ...items: string[]
    ): Thenable<string | undefined>;
    createWebviewPanel(
      viewType: string,
      title: string,
      column: number,
      options: { enableScripts: boolean }
    ): { webview: PreviewWebview };
  };
  commands: {
    registerCommand(
      command: string,
      callback: (resource?: PreviewUri) => Thenable<void> | void
    ): { dispose(): void };
  };
  env: {
    openExternal(uri: { toString(): string }): Thenable<boolean>;
  };
  Uri: {
    file(path: string): PreviewUri;
    parse(value: string): { toString(): string };
  };
  RelativePattern: new (base: string, pattern: string) => { base: string; pattern: string };
  ViewColumn: { Beside: number };
}

export function activatePreview(host: PreviewHost): { dispose(): void } {
  const openMap = host.commands.registerCommand('archlens.openArchitectureMap', resource =>
    showArchitectureMap(host, resource)
  );
  const generate = host.commands.registerCommand('archlens.generateFromWorkspace', () =>
    showGeneratePrompt(host)
  );
  return {
    dispose() {
      openMap.dispose();
      generate.dispose();
    },
  };
}

async function showArchitectureMap(
  host: PreviewHost,
  resource: PreviewUri | undefined
): Promise<void> {
  const result = await openArchitectureMap({
    trusted: host.workspace.isTrusted,
    listBlueprints: () => blueprintsFor(host, resource),
  });
  switch (result.kind) {
    case 'untrusted':
      await host.window.showInformationMessage(result.message);
      return;
    case 'empty':
    case 'map': {
      const title = result.kind === 'map' ? result.map.name : 'Architecture map';
      const panel = host.window.createWebviewPanel(
        'archlens.architectureMap',
        title,
        host.ViewColumn.Beside,
        { enableScripts: false }
      );
      panel.webview.html = renderArchitectureMapPanel(result);
      return;
    }
    default:
      assertNever(result);
  }
}

async function showGeneratePrompt(host: PreviewHost): Promise<void> {
  const enabled =
    host.workspace.getConfiguration('archlens.generateFromWorkspace').get('enabled') === true;
  const result = await generateFromWorkspace({
    trusted: host.workspace.isTrusted,
    enabled,
    listBlueprints: () => blueprintsFor(host, undefined),
    scan() {
      throw new Error('scan ran');
    },
    write() {
      throw new Error('write ran');
    },
    ask: prompt => askInterest(host, prompt),
    openDiscussion: async url => {
      await host.env.openExternal(host.Uri.parse(url));
    },
  });
  switch (result.kind) {
    case 'untrusted':
      await host.window.showInformationMessage(result.message);
      return;
    case 'discussion-opened':
    case 'dismissed':
    case 'enabled-without-scan':
      return;
    default:
      assertNever(result);
  }
}

async function askInterest(
  host: PreviewHost,
  prompt: typeof GENERATE_PROMPT
): Promise<GeneratePromptAction> {
  const choice = await host.window.showInformationMessage(
    prompt.title,
    { modal: true, detail: prompt.body },
    prompt.tellUsLabel,
    prompt.cancelLabel
  );
  if (choice === prompt.tellUsLabel) return 'tell-us';
  if (choice === prompt.cancelLabel) return 'cancel';
  return 'escape';
}

async function blueprintsFor(host: PreviewHost, resource: PreviewUri | undefined) {
  if (resource && isYamlPath(resource.fsPath)) {
    return [{ path: resource.fsPath, content: await readText(host, resource) }];
  }
  const folder = host.workspace.workspaceFolders?.[0];
  if (!folder) return [];
  const pattern = new host.RelativePattern(folder.uri.fsPath, 'blueprints/**/*.{yaml,yml}');
  const files = await host.workspace.findFiles(pattern);
  const documents = [];
  for (const file of files) {
    if (!isYamlPath(file.fsPath)) continue;
    documents.push({ path: file.fsPath, content: await readText(host, file) });
  }
  return documents;
}

async function readText(host: PreviewHost, uri: PreviewUri): Promise<string> {
  const bytes = await host.workspace.fs.readFile(uri);
  return new TextDecoder().decode(bytes);
}

function isYamlPath(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith('.yaml') || lower.endsWith('.yml');
}

function assertNever(value: never): never {
  throw new Error(`Unexpected preview result: ${JSON.stringify(value)}`);
}
