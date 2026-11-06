import { describe, expect, it } from 'vitest';
import {
  INTEREST_DISCUSSION_URL,
  NO_GIT_HOTSPOTS_COPY,
  NO_LOWER_COPY,
  NO_SOURCE_COPY,
  TRUST_COPY,
} from '../features/editorPreview/domain';
import {
  copyDiagram,
  generateFromWorkspace,
  openArchitectureMap,
  openSource,
  showHotspots,
} from '../features/editorPreview/handler';
import { resetDiagramSession } from './diagramSession';
import { createEditorHost, type VsCodeLike } from './vscodeHost';

const checkout = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  name: Checkout
  entityRef: checkout
nodes:
  - entityRef: checkout/api
    type: software-system
    name: Checkout API
  - entityRef: checkout/billing
    type: software-system
    name: Billing
dependencies:
  - from: checkout/api
    to: checkout/billing
    type: direct-call
`;

const container = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: container
metadata:
  name: Checkout API
  entityRef: checkout/api
nodes:
  - entityRef: checkout/api/handler
    type: component
    name: Handler
dependencies: []
`;

function editor(input: {
  trusted: boolean;
  choice?: string;
  files?: { path: string; content: string }[];
  enabled?: boolean;
  directory?: string;
  git?: boolean;
}) {
  const calls: string[] = [];
  const html: string[] = [];
  const opened: string[] = [];
  const copied: string[] = [];
  const statuses: string[] = [];
  const statusTimeouts: number[] = [];
  const patterns: { base: string; pattern: string }[] = [];
  const panels: {
    onMessage?: (message: unknown) => void;
    onDispose?: () => void;
  }[] = [];
  let onSave: ((document: { uri: { fsPath: string }; getText(): string }) => void) | undefined;
  resetDiagramSession();
  const files = input.files ?? [];
  const api: VsCodeLike = {
    FileType: { File: 1, Directory: 2 },
    ViewColumn: { Active: 1, Beside: 2 },
    Uri: {
      file: path => ({ fsPath: path, toString: () => path }),
      parse: value => ({ fsPath: value, toString: () => value }),
    },
    workspace: {
      isTrusted: input.trusted,
      workspaceFolders: [{ name: 'repo', uri: { fsPath: '/repo', toString: () => '/repo' } }],
      getConfiguration: () => ({
        get: <T>(_key: string, defaultValue: T) => {
          if (_key === 'generateFromWorkspace.enabled') return (input.enabled ?? false) as T;
          return defaultValue;
        },
      }),
      findFiles: async pattern => {
        calls.push('findFiles');
        patterns.push(pattern);
        return files
          .filter(file => matchesBlueprintSearch(file.path, pattern))
          .map(file => ({ fsPath: file.path, toString: () => file.path }));
      },
      fs: {
        stat: async uri => {
          calls.push('stat');
          if (input.git && uri.fsPath === '/repo/.git') return { type: 2 };
          if (input.directory === uri.fsPath) return { type: 2 };
          if (files.some(file => file.path === uri.fsPath)) return { type: 1 };
          throw new Error(`missing ${uri.fsPath}`);
        },
        readFile: async uri => {
          calls.push(`read:${uri.fsPath}`);
          const file = files.find(candidate => candidate.path === uri.fsPath);
          return new TextEncoder().encode(file?.content ?? '');
        },
      },
      openTextDocument: async uri => ({
        uri,
        getText: () => files.find(file => file.path === uri.fsPath)?.content ?? '',
      }),
      onDidSaveTextDocument: listener => {
        onSave = listener;
        return { dispose: () => undefined };
      },
    },
    window: {
      showInformationMessage: async (message, _options, ...items) => {
        calls.push(`message:${message}`);
        if (input.choice === 'escape') return undefined;
        return input.choice ?? items[1];
      },
      showQuickPick: async () => undefined,
      showTextDocument: async (document, column) => {
        calls.push(`text:${column}`);
        calls.push(`show:${document.uri.fsPath}`);
      },
      setStatusBarMessage: (message, hideAfterTimeout) => {
        statuses.push(message);
        statusTimeouts.push(hideAfterTimeout);
      },
      createWebviewPanel: (_viewType, _title, column, options) => {
        calls.push(`panel:${column}`);
        calls.push(`scripts:${options.enableScripts}`);
        const panel: {
          onMessage?: (message: unknown) => void;
          onDispose?: () => void;
        } = {};
        panels.push(panel);
        return {
          webview: {
            set html(value: string) {
              html.push(value);
            },
            get html() {
              return html[html.length - 1] ?? '';
            },
            onDidReceiveMessage: listener => {
              panel.onMessage = message => listener(message);
              return { dispose: () => undefined };
            },
          },
          onDidDispose: listener => {
            panel.onDispose = listener;
          },
        };
      },
    },
    env: {
      openExternal: async uri => {
        opened.push(uri.toString());
        return true;
      },
      clipboard: {
        writeText: async value => {
          copied.push(value);
        },
      },
    },
  };

  return {
    api,
    calls,
    html,
    opened,
    copied,
    statuses,
    statusTimeouts,
    patterns,
    focus: (entityRef: string) => {
      panels.at(-1)?.onMessage?.({ type: 'focus-system', entityRef });
    },
    send: (message: unknown) => panels.at(-1)?.onMessage?.(message),
    focusPanel: (index: number, entityRef: string) => {
      panels[index]?.onMessage?.({ type: 'focus-system', entityRef });
    },
    closePanel: (index: number) => {
      panels[index]?.onDispose?.();
    },
    save: (path: string, content: string) => {
      onSave?.({ uri: { fsPath: path }, getText: () => content });
    },
  };
}

function matchesBlueprintSearch(
  filePath: string,
  search: { base: string; pattern: string }
): boolean {
  const base = search.base.replace(/\\/g, '/').replace(/\/+$/, '');
  const file = filePath.replace(/\\/g, '/');
  const prefix = `${base}/`;
  if (!file.startsWith(prefix)) return false;
  const relative = file.slice(prefix.length);
  const suffix = '**/*.{yaml,yml}';
  if (!search.pattern.endsWith(suffix)) return false;
  const folder = search.pattern.slice(0, -suffix.length).replace(/\/$/, '');
  if (folder.length > 0 && !relative.startsWith(`${folder}/`)) return false;
  return relative.endsWith('.yaml') || relative.endsWith('.yml');
}

describe('editor host', () => {
  it('does not read the folder when Open architecture map runs untrusted', async () => {
    const fake = editor({
      trusted: false,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    const host = await createEditorHost(fake.api);

    await openArchitectureMap(host);

    expect(fake.calls).toEqual([`message:${TRUST_COPY}`]);
    expect(fake.html).toEqual([]);
  });

  it('opens the diagram beside the blueprint in a trusted folder', async () => {
    const fake = editor({
      trusted: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    const host = await createEditorHost(fake.api);

    await openArchitectureMap(host);

    expect(fake.calls).toContain('findFiles');
    expect(fake.patterns).toEqual([{ base: '/repo', pattern: 'blueprints/**/*.{yaml,yml}' }]);
    expect(fake.calls).toContain('read:/repo/blueprints/context.yaml');
    expect(fake.calls).toContain('text:1');
    expect(fake.calls).toContain('panel:2');
    expect(fake.html[0]).toContain('Checkout API');
    expect(fake.html[0]).toContain('Checkout API → Billing');
  });

  it('reads blueprints in the folder that was right-clicked', async () => {
    const folder = '/repo/blueprints';
    const fake = editor({
      trusted: true,
      directory: folder,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    const host = await createEditorHost(fake.api, { fsPath: folder, toString: () => folder });

    await openArchitectureMap(host);

    expect(fake.patterns).toEqual([{ base: folder, pattern: '**/*.{yaml,yml}' }]);
    expect(fake.calls).toContain('read:/repo/blueprints/context.yaml');
    expect(fake.html[0]).toContain('Checkout API');
  });

  it('refreshes the diagram when the blueprint is saved', async () => {
    const fake = editor({
      trusted: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    const host = await createEditorHost(fake.api);
    await openArchitectureMap(host);

    fake.save('/repo/blueprints/context.yaml', checkout.replace('name: Billing', 'name: Payments'));

    expect(fake.html.at(-1)).toContain('Payments');
    expect(fake.html.at(-1)).not.toContain('>Billing<');
  });

  it('drills into a child diagram and returns with Alt+Left', async () => {
    const fake = editor({
      trusted: true,
      files: [
        { path: '/repo/blueprints/context.yaml', content: checkout },
        { path: '/repo/blueprints/api.yaml', content: container },
      ],
    });
    const host = await createEditorHost(fake.api);
    await openArchitectureMap(host);

    await fake.send({ type: 'drill', entityRef: 'checkout/api' });

    expect(fake.html.at(-1)).toContain('Checkout</button>');
    expect(fake.html.at(-1)).toContain('Checkout API</span>');
    expect(fake.html.at(-1)).toContain('Handler');
    expect(fake.html.at(-1)).not.toContain('Billing');

    await fake.send({ type: 'back' });

    expect(fake.html.at(-1)).toContain('Checkout API');
    expect(fake.html.at(-1)).toContain('Billing');
    expect(fake.html.at(-1)).not.toContain('<nav');
  });

  it('stays on the diagram when Enter has no child', async () => {
    const fake = editor({
      trusted: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    const host = await createEditorHost(fake.api);
    await openArchitectureMap(host);

    await fake.send({ type: 'drill', entityRef: 'checkout/billing' });

    expect(fake.calls).toContain(`message:${NO_LOWER_COPY}`);
    expect(fake.html.at(-1)).toContain('Billing');
    expect(fake.html.at(-1)).not.toContain('Handler');
  });

  it('copies the open diagram as Mermaid without writing the YAML', async () => {
    const fake = editor({
      trusted: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    const host = await createEditorHost(fake.api);
    await openArchitectureMap(host);

    await copyDiagram(host);

    expect(fake.copied).toHaveLength(1);
    expect(fake.copied[0]).toContain('graph TD');
    expect(fake.copied[0]).toContain('Checkout API');
    expect(fake.copied[0]).toContain('Billing');
    expect(fake.calls.some(call => call.startsWith('write'))).toBe(false);
  });

  it('marks a recorded hotspot when the folder has git history', async () => {
    const withHotspot = checkout.replace(
      '    name: Checkout API',
      `    name: Checkout API
    forensics:
      classifications:
        - hotspot
      churn: 12
      churnByWeek:
        - 2
        - 6`
    );
    const fake = editor({
      trusted: true,
      git: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: withHotspot }],
    });
    const host = await createEditorHost(fake.api);
    await openArchitectureMap(host);

    await showHotspots(host);

    expect(fake.html.at(-1)).toContain('<p>Hotspot</p>');
    expect(fake.html.at(-1)).toContain('<dd>6</dd>');
    expect(fake.html[0]).not.toContain('<p>Hotspot</p>');
  });

  it('leaves the diagram unchanged when the folder has no git history', async () => {
    const fake = editor({
      trusted: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    const host = await createEditorHost(fake.api);
    await openArchitectureMap(host);
    const before = fake.html.at(-1);

    await showHotspots(host);

    expect(fake.calls).toContain(`message:${NO_GIT_HOTSPOTS_COPY}`);
    expect(fake.html.at(-1)).toBe(before);
    expect(fake.html.at(-1)).not.toContain('Hotspot');
  });

  it('opens the discussion from Tell us you want this and reads no blueprint', async () => {
    const fake = editor({ trusted: true, choice: 'Tell us you want this' });
    const host = await createEditorHost(fake.api);

    await generateFromWorkspace(host);

    expect(fake.opened).toEqual([INTEREST_DISCUSSION_URL]);
    expect(fake.calls).not.toContain('findFiles');
  });

  it('does not open the discussion when the prompt is dismissed', async () => {
    const fake = editor({ trusted: true, choice: 'escape' });
    const host = await createEditorHost(fake.api);

    await generateFromWorkspace(host);

    expect(fake.opened).toEqual([]);
    expect(fake.calls).not.toContain('findFiles');
  });

  it('opens the source file for the focused system', async () => {
    const source = checkout.replace(
      'name: Checkout API',
      'name: Checkout API\n    properties:\n      filepath: src/api.ts'
    );
    const fake = editor({
      trusted: true,
      files: [
        { path: '/repo/blueprints/context.yaml', content: source },
        { path: '/repo/src/api.ts', content: 'export {}' },
      ],
    });
    await openArchitectureMap(await createEditorHost(fake.api));
    fake.focus('checkout/api');

    await openSource(await createEditorHost(fake.api));

    expect(fake.calls).toContain('scripts:true');
    expect(fake.calls).toContain('show:/repo/src/api.ts');
    expect(fake.statuses).toEqual(['Opened /repo/src/api.ts from Checkout API.']);
    expect(fake.statusTimeouts).toEqual([5000]);
  });

  it('opens the source for the map that was focused when another map is open', async () => {
    const fake = editor({
      trusted: true,
      files: [
        { path: '/repo/src/checkout.ts', content: 'export {}' },
        { path: '/repo/src/billing.ts', content: 'export {}' },
      ],
    });
    const host = await createEditorHost(fake.api);
    await host.showDiagram({
      sourcePath: '/repo/blueprints/checkout.yaml',
      systems: [{ name: 'Checkout API', entityRef: 'shared', sourceFile: 'src/checkout.ts' }],
      links: [],
    });
    await host.showDiagram({
      sourcePath: '/repo/blueprints/billing.yaml',
      systems: [{ name: 'Billing API', entityRef: 'shared', sourceFile: 'src/billing.ts' }],
      links: [],
    });

    fake.focusPanel(0, 'shared');
    await openSource(host);
    fake.focusPanel(1, 'shared');
    await openSource(host);
    fake.closePanel(1);
    await openSource(host);

    expect(fake.calls.filter(call => call.startsWith('show:/repo/src/'))).toEqual([
      'show:/repo/src/checkout.ts',
      'show:/repo/src/billing.ts',
      'show:/repo/src/checkout.ts',
    ]);
  });

  it('does not open a stale source after the focused blueprint is saved', async () => {
    const source = checkout.replace(
      'name: Checkout API',
      'name: Checkout API\n    properties:\n      filepath: src/api.ts'
    );
    const fake = editor({
      trusted: true,
      files: [
        { path: '/repo/blueprints/context.yaml', content: source },
        { path: '/repo/src/api.ts', content: 'export {}' },
      ],
    });
    const host = await createEditorHost(fake.api);
    await openArchitectureMap(host);
    fake.focus('checkout/api');
    fake.save(
      '/repo/blueprints/context.yaml',
      source
        .replace('name: Checkout API', 'name: Payments API')
        .replace('filepath: src/api.ts', 'filepath: src/next.ts')
    );

    await openSource(host);

    expect(fake.html.at(-1)).toContain('Payments API');
    expect(fake.calls).toContain(`message:${NO_SOURCE_COPY}`);
    expect(fake.calls.filter(call => call.startsWith('show:/repo/src/'))).toEqual([]);
  });

  it('does not open a file when the focused system has none', async () => {
    const fake = editor({
      trusted: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    await openArchitectureMap(await createEditorHost(fake.api));
    fake.focus('checkout/billing');

    await openSource(await createEditorHost(fake.api));

    expect(fake.calls).toContain(`message:${NO_SOURCE_COPY}`);
    expect(fake.calls.filter(call => call.startsWith('show:'))).toEqual([
      'show:/repo/blueprints/context.yaml',
    ]);
  });

  it('does not read the folder when Generate runs untrusted', async () => {
    const fake = editor({ trusted: false, choice: 'Tell us you want this' });
    const host = await createEditorHost(fake.api);

    await generateFromWorkspace(host);

    expect(fake.calls).toEqual([`message:${TRUST_COPY}`]);
    expect(fake.opened).toEqual([]);
  });
});
