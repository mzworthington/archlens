import { describe, expect, it } from 'vitest';
import { activatePreview, type PreviewHost } from './vscodePreview';

const SHOP = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: shop
  name: Shop
nodes:
  - entityRef: shop/catalog
    type: software-system
    name: Catalog
  - entityRef: shop/billing
    type: software-system
    name: Billing
dependencies:
  - from: shop/catalog
    to: shop/billing
    type: direct-call
`;

describe('Visual Studio Code preview commands', () => {
  it('opens a panel with the systems and the links for a trusted folder', async () => {
    const host = fakeHost({ trusted: true, files: { '/repo/blueprints/shop/context.yaml': SHOP } });
    const commands = captureCommands(host);

    await commands.open();

    expect(host.panels).toHaveLength(1);
    expect(host.panels[0]?.title).toBe('Shop');
    expect(host.panels[0]?.html).toContain('Catalog');
    expect(host.panels[0]?.html).toContain('Billing');
    expect(host.panels[0]?.html).toContain('Catalog → Billing');
    expect(host.panels[0]?.scripts).toBe(false);
    expect(host.reads).toEqual(['/repo/blueprints/shop/context.yaml']);
  });

  it('opens the blueprint file the command was invoked on', async () => {
    const host = fakeHost({
      trusted: true,
      files: {
        '/repo/blueprints/shop/context.yaml': SHOP,
        '/repo/blueprints/shop/other.yaml': SHOP.replace('name: Shop', 'name: Other'),
      },
    });
    activatePreview(host);
    const open = host.registered.get('archlens.openArchitectureMap');
    if (!open) throw new Error('open command was not registered');

    await open({ fsPath: '/repo/blueprints/shop/other.yaml' });

    expect(host.finds).toBe(0);
    expect(host.reads).toEqual(['/repo/blueprints/shop/other.yaml']);
    expect(host.panels[0]?.title).toBe('Other');
  });

  it('does not read a blueprint from Restricted Mode', async () => {
    const host = fakeHost({
      trusted: false,
      files: { '/repo/blueprints/shop/context.yaml': SHOP },
    });
    const commands = captureCommands(host);

    await commands.open();
    await commands.generate();

    expect(host.messages.map(message => message.message)).toEqual([
      'ArchLens does not read this folder until the workspace is trusted.',
      'ArchLens does not read this folder until the workspace is trusted.',
    ]);
    expect(host.reads).toEqual([]);
    expect(host.finds).toBe(0);
    expect(host.panels).toEqual([]);
    expect(host.external).toEqual([]);
  });

  it('opens the GitHub discussion from Tell us you want this and does not scan', async () => {
    const host = fakeHost({
      trusted: true,
      files: { '/repo/blueprints/shop/context.yaml': SHOP },
      choice: 'Tell us you want this',
    });
    const commands = captureCommands(host);

    await commands.generate();

    expect(host.messages).toEqual([
      {
        message: 'Generate diagram from workspace',
        detail: 'Generating a diagram from code is turned off in this preview.',
        items: ['Tell us you want this', 'Cancel'],
      },
    ]);
    expect(host.external).toEqual(['https://github.com/mzworthington/archlens/discussions']);
    expect(host.reads).toEqual([]);
    expect(host.finds).toBe(0);
    expect(host.writes).toEqual([]);
  });

  it('closes the generate prompt on Escape and writes nothing', async () => {
    const host = fakeHost({ trusted: true, files: {}, choice: undefined });
    const commands = captureCommands(host);

    await commands.generate();

    expect(host.external).toEqual([]);
    expect(host.writes).toEqual([]);
    expect(host.reads).toEqual([]);
  });

  it('does not open the interest prompt or read files when generation is turned on', async () => {
    const host = fakeHost({
      trusted: true,
      files: { '/repo/src/app.ts': 'export {}' },
      enabled: true,
    });
    const commands = captureCommands(host);

    await commands.generate();

    expect(host.messages).toEqual([]);
    expect(host.external).toEqual([]);
    expect(host.reads).toEqual([]);
    expect(host.writes).toEqual([]);
  });
});

function captureCommands(host: ReturnType<typeof fakeHost>) {
  activatePreview(host);
  const open = host.registered.get('archlens.openArchitectureMap');
  const generate = host.registered.get('archlens.generateFromWorkspace');
  if (!open || !generate) throw new Error('preview commands were not registered');
  return {
    open: () => open(),
    generate: () => generate(),
  };
}

function fakeHost(options: {
  trusted: boolean;
  files: Record<string, string>;
  choice?: string;
  enabled?: boolean;
}): PreviewHost & {
  panels: Array<{ title: string; html: string; scripts: boolean }>;
  messages: Array<{ message: string; detail?: string; items: string[] }>;
  reads: string[];
  writes: string[];
  finds: number;
  external: string[];
  registered: Map<string, (resource?: { fsPath: string }) => Promise<void>>;
} {
  const panels: Array<{ title: string; html: string; scripts: boolean }> = [];
  const messages: Array<{ message: string; detail?: string; items: string[] }> = [];
  const reads: string[] = [];
  const writes: string[] = [];
  const external: string[] = [];
  const registered = new Map<string, (resource?: { fsPath: string }) => Promise<void>>();
  let finds = 0;
  const host = {
    panels,
    messages,
    reads,
    writes,
    external,
    registered,
    get finds() {
      return finds;
    },
    workspace: {
      isTrusted: options.trusted,
      workspaceFolders: [{ uri: { fsPath: '/repo' } }],
      getConfiguration(section: string) {
        return {
          get(key: string) {
            if (section === 'archlens.generateFromWorkspace' && key === 'enabled') {
              return options.enabled === true;
            }
            return undefined;
          },
        };
      },
      async findFiles() {
        finds += 1;
        return Object.keys(options.files)
          .filter(path => path.includes('/blueprints/') && /\.ya?ml$/.test(path))
          .map(fsPath => ({ fsPath }));
      },
      fs: {
        async readFile(uri: { fsPath: string }) {
          reads.push(uri.fsPath);
          const content = options.files[uri.fsPath];
          if (content === undefined) throw new Error(`missing ${uri.fsPath}`);
          return new TextEncoder().encode(content);
        },
        async writeFile(uri: { fsPath: string }) {
          writes.push(uri.fsPath);
        },
      },
    },
    window: {
      async showInformationMessage(
        message: string,
        dialog?: { modal?: boolean; detail?: string },
        ...items: string[]
      ) {
        messages.push({ message, detail: dialog?.detail, items });
        return options.choice;
      },
      createWebviewPanel(
        _viewType: string,
        title: string,
        _column: number,
        panelOptions: { enableScripts: boolean }
      ) {
        const panel = { title, html: '', scripts: panelOptions.enableScripts };
        panels.push(panel);
        return { webview: panel };
      },
    },
    commands: {
      registerCommand(command: string, callback: (resource?: { fsPath: string }) => Promise<void>) {
        registered.set(command, callback);
        return { dispose() {} };
      },
    },
    env: {
      async openExternal(uri: { toString(): string }) {
        external.push(uri.toString());
        return true;
      },
    },
    Uri: {
      file(path: string) {
        return { fsPath: path };
      },
      parse(value: string) {
        return {
          toString() {
            return value;
          },
        };
      },
    },
    RelativePattern: class RelativePattern {
      constructor(
        readonly base: string,
        readonly pattern: string
      ) {}
    },
    ViewColumn: { Beside: -2 },
  };
  return host;
}
