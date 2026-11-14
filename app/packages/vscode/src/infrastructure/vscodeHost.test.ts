import { describe, expect, it } from 'vitest';
import {
  EMPTY_MAP_COPY,
  NO_CHANGES_COPY,
  NO_GIT_HOTSPOTS_COPY,
  NO_LOWER_COPY,
  REVIEW_NOTE,
  TRUST_COPY,
  UNSAVED_BLUEPRINT_COPY,
} from '../features/editorPreview/domain';
import {
  copyDiagram,
  compareWithScan,
  generateFromWorkspace,
  openArchitectureMap,
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
  leaked?: { path: string; content: string }[];
  enabled?: boolean;
  directory?: string;
  activePath?: string;
  git?: boolean;
  scope?: 'workspace';
  confirmGenerate?: boolean;
  cancelScan?: boolean;
  writeBlueprint?: boolean;
  failWrite?: boolean;
  dirtyBlueprint?: boolean;
  dirtyText?: string;
}) {
  const calls: string[] = [];
  const html: string[] = [];
  const posted: unknown[] = [];
  const opened: string[] = [];
  const copied: string[] = [];
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
        const matched = files.filter(file => matchesBlueprintSearch(file.path, pattern));
        return [...matched, ...(input.leaked ?? [])].map(file => ({
          fsPath: file.path,
          toString: () => file.path,
        }));
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
          if (!file) throw new Error(`missing ${uri.fsPath}`);
          return new TextEncoder().encode(file.content);
        },
        writeFile: async (uri, content) => {
          calls.push(`blueprint:${uri.fsPath}`);
          if (input.failWrite) throw new Error('disk');
          const text = new TextDecoder().decode(content);
          const found = files.find(file => file.path === uri.fsPath);
          if (found) found.content = text;
          else files.push({ path: uri.fsPath, content: text });
        },
        delete: async uri => {
          calls.push(`delete:${uri.fsPath}`);
          const index = files.findIndex(file => file.path === uri.fsPath);
          if (index >= 0) files.splice(index, 1);
        },
        createDirectory: async uri => {
          calls.push(`mkdir:${uri.fsPath}`);
        },
      },
      openTextDocument: async uri => ({
        uri,
        isDirty: false,
        getText: () => files.find(file => file.path === uri.fsPath)?.content ?? '',
      }),
      onDidSaveTextDocument: listener => {
        onSave = listener;
        return { dispose: () => undefined };
      },
      applyTextDocument: async (uri, content) => {
        calls.push(`edit:${uri.fsPath}`);
        const found = files.find(file => file.path === uri.fsPath);
        if (found) found.content = content;
        else files.push({ path: uri.fsPath, content });
      },
      saveTextDocument: async uri => {
        calls.push(`save:${uri.fsPath}`);
        const content = files.find(file => file.path === uri.fsPath)?.content ?? '';
        onSave?.({ uri, getText: () => content });
        return true;
      },
      textDocuments: input.dirtyBlueprint
        ? [
            {
              uri: {
                fsPath: '/repo/blueprints/context.yaml',
                toString: () => '/repo/blueprints/context.yaml',
              },
              isDirty: true,
              getText: () => input.dirtyText ?? checkout,
            },
          ]
        : [],
    },
    window: {
      activeTextEditor: input.activePath
        ? {
            document: {
              uri: { fsPath: input.activePath, toString: () => input.activePath ?? '' },
              getText: () => '',
            },
          }
        : undefined,
      showInformationMessage: async (message, options, ...items) => {
        calls.push(`message:${message}`);
        if (options.detail) calls.push(`detail:${options.detail}`);
        if (message === 'Generate diagram' && input.confirmGenerate) return items[0];
        if (message === 'Review blueprint changes') {
          return input.writeBlueprint ? items[1] : items[0];
        }
        if (input.choice === 'escape') return undefined;
        return input.choice ?? items[1];
      },
      showQuickPick: async items => {
        if (input.scope === 'workspace') return items.find(item => item.path === 'workspace');
        return undefined;
      },
      showInputBox: async () => undefined,
      withProgress: async (_options, task) =>
        task({ isCancellationRequested: input.cancelScan ?? false }),
      showTextDocument: async (document, column) => {
        calls.push(`text:${column}`);
        calls.push(`show:${document.uri.fsPath}`);
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
            postMessage: (message: unknown) => {
              posted.push(message);
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
    posted,
    files,
    opened,
    copied,
    patterns,
    send: (message: unknown) => panels.at(-1)?.onMessage?.(message),
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
  if (relative.split('/').includes('node_modules')) return false;
  if (search.pattern === '**/*.tf.json') return relative.endsWith('.tf.json');
  if (search.pattern === '**/Pulumi*.{yaml,yml}') {
    const name = relative.split('/').pop() ?? '';
    return name === 'Pulumi.yaml' || name === 'Pulumi.yml' || /^Pulumi\..+\.ya?ml$/.test(name);
  }
  const extensions = /^\*\*\/\*\.\{([^}]+)\}$/.exec(search.pattern)?.[1];
  if (extensions) {
    return extensions.split(',').some(extension => relative.endsWith(`.${extension}`));
  }
  if (!search.pattern.endsWith(suffix)) return true;
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

  it('opens an empty map panel when the trusted folder has no blueprint', async () => {
    const fake = editor({ trusted: true, files: [] });
    const host = await createEditorHost(fake.api);

    await openArchitectureMap(host);

    expect(fake.calls).toContain('panel:2');
    expect(fake.calls).toContain('scripts:false');
    expect(fake.html.at(-1)).toContain(EMPTY_MAP_COPY);
    expect(fake.html.at(-1)).not.toContain('<article');
    expect(fake.calls.some(call => call.startsWith('show:'))).toBe(false);
  });

  it('opens the diagram beside the blueprint in a trusted folder', async () => {
    const fake = editor({
      trusted: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    const host = await createEditorHost(fake.api);

    await openArchitectureMap(host);

    expect(fake.calls).toContain('findFiles');
    expect(fake.patterns).toEqual([
      { base: '/repo', pattern: 'blueprints/**/*.{yaml,yml}' },
      { base: '/repo', pattern: 'blueprints/**/*.{yaml,yml}' },
    ]);
    expect(fake.calls).toContain('read:/repo/blueprints/context.yaml');
    expect(fake.calls).toContain('text:1');
    expect(fake.calls).toContain('panel:2');
    expect(fake.html[0]).toContain('Checkout API');
    expect(fake.html[0]).toContain('canvas-preview.js');
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

    expect(fake.patterns).toEqual([
      { base: folder, pattern: '**/*.{yaml,yml}' },
      { base: '/repo', pattern: 'blueprints/**/*.{yaml,yml}' },
    ]);
    expect(fake.calls).toContain('read:/repo/blueprints/context.yaml');
    expect(fake.html[0]).toContain('Checkout API');
  });

  it('opens the YAML file that is already focused', async () => {
    const fake = editor({
      trusted: true,
      activePath: '/repo/blueprints/context.yaml',
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    const host = await createEditorHost(fake.api);

    await openArchitectureMap(host);

    expect(fake.calls).toContain('read:/repo/blueprints/context.yaml');
    expect(fake.patterns).toEqual([{ base: '/repo', pattern: 'blueprints/**/*.{yaml,yml}' }]);
    expect(fake.html[0]).toContain('Checkout API');
  });

  it('ignores a blueprint path outside the chosen folder', async () => {
    const fake = editor({
      trusted: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
      leaked: [{ path: '/other/secret.yaml', content: checkout.replace('Checkout API', 'Secret') }],
    });
    const host = await createEditorHost(fake.api);

    await openArchitectureMap(host);

    expect(fake.calls).not.toContain('read:/other/secret.yaml');
    expect(fake.html[0]).not.toContain('Secret');
    expect(fake.html[0]).toContain('Checkout API');
  });

  it('refreshes the diagram when the save path uses backslashes', async () => {
    const fake = editor({
      trusted: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    const host = await createEditorHost(fake.api);
    await openArchitectureMap(host);

    fake.save(
      '\\repo\\blueprints\\context.yaml',
      checkout.replace('name: Billing', 'name: Payments')
    );

    expect(fake.html.at(-1)).toContain('Payments');
  });

  it('keeps the diagram when a save is no longer a blueprint', async () => {
    const fake = editor({
      trusted: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    const host = await createEditorHost(fake.api);
    await openArchitectureMap(host);
    const before = fake.html.length;

    fake.save('/repo/blueprints/context.yaml', 'title: notes\n');

    expect(fake.html).toHaveLength(before);
    expect(fake.html.at(-1)).toContain('Checkout API');
  });

  it('writes a diagram edit into the open blueprint without reloading the map', async () => {
    const fake = editor({
      trusted: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    const host = await createEditorHost(fake.api);
    await openArchitectureMap(host);
    const panels = fake.html.length;
    const next = checkout.replace('name: Billing', 'name: Payments');

    await fake.send({ type: 'sync', yaml: next });

    expect(fake.files.find(file => file.path === '/repo/blueprints/context.yaml')?.content).toBe(
      next
    );
    expect(fake.html).toHaveLength(panels);
    expect(fake.calls).toContain('edit:/repo/blueprints/context.yaml');
    expect(fake.calls).toContain('save:/repo/blueprints/context.yaml');
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

  it('keeps the canvas page and posts the next diagram once the map is ready', async () => {
    const fake = editor({
      trusted: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });
    const host = await createEditorHost(fake.api);
    await openArchitectureMap(host);
    await fake.send({ type: 'ready' });
    const pages = fake.html.length;

    fake.save('/repo/blueprints/context.yaml', checkout.replace('name: Billing', 'name: Payments'));

    expect(fake.html).toHaveLength(pages);
    expect(fake.posted.at(-1)).toMatchObject({ type: 'show', hotspots: false });
    expect(JSON.stringify(fake.posted.at(-1))).toContain('name: Payments');
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

    expect(fake.html.at(-1)).toContain('canvas-preview.js');
    expect(fake.html.at(-1)).toContain('name: Checkout API');
    expect(fake.html.at(-1)).toContain('Handler');
    const visible = (fake.html.at(-1) ?? '').split('id="blueprints"')[0] ?? '';
    expect(visible).not.toContain('Billing');

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

    expect(fake.html.at(-1)).toContain('data-hotspots="on"');
    expect(fake.html.at(-1)).toContain('hotspot');
    expect(fake.html[0]).not.toContain('data-hotspots="on"');
  });

  it('marks hotspots again after a broken blueprint save is fixed', async () => {
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

    fake.save('/repo/blueprints/context.yaml', 'notes: not a blueprint');
    expect(fake.html.at(-1)).toContain('Checkout API');
    expect(fake.html.at(-1)).not.toContain(EMPTY_MAP_COPY);

    fake.save('/repo/blueprints/context.yaml', withHotspot);
    expect(fake.html.at(-1)).toContain('Checkout API');
    expect(fake.html.at(-1)).not.toContain('<p>Hotspot</p>');

    await showHotspots(host);

    expect(fake.html.at(-1)).toContain('data-hotspots="on"');
    expect(fake.html.at(-1)).toContain('hotspot');
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

  it('reviews the workspace when a generate setting would say off', async () => {
    const fake = editor({
      trusted: true,
      enabled: false,
      scope: 'workspace',
      confirmGenerate: true,
      files: [
        { path: '/repo/blueprints/context.yaml', content: checkout },
        { path: '/repo/src/catalog.ts', content: 'export {}' },
      ],
    });
    const host = await createEditorHost(fake.api);

    await generateFromWorkspace(host);

    expect(fake.calls).toContain('message:Review blueprint changes');
    expect(fake.opened).toEqual([]);
  });

  it('reviews source files when generation is on and writes nothing', async () => {
    const fake = editor({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      confirmGenerate: true,
      files: [
        { path: '/repo/blueprints/context.yaml', content: checkout },
        { path: '/repo/src/catalog.ts', content: 'export {}' },
      ],
    });
    const host = await createEditorHost(fake.api);

    await generateFromWorkspace(host);

    expect(fake.calls).toContain('message:Review blueprint changes');
    expect(fake.calls.some(call => call.includes('1 added'))).toBe(true);
    expect(fake.calls.some(call => call.includes('Added catalog'))).toBe(false);
    expect(fake.calls.some(call => call.includes(REVIEW_NOTE))).toBe(true);
    expect(fake.calls.some(call => call.startsWith('blueprint:'))).toBe(false);
  });

  it('writes the blueprint when the review is accepted and shows the new systems', async () => {
    const fake = editor({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      confirmGenerate: true,
      writeBlueprint: true,
      files: [
        { path: '/repo/blueprints/context.yaml', content: checkout },
        { path: '/repo/src/catalog.ts', content: 'export {}' },
      ],
    });
    const host = await createEditorHost(fake.api);

    await generateFromWorkspace(host);

    expect(fake.calls).toContain('blueprint:/repo/blueprints/context.yaml');
    expect(fake.html.at(-1)).toContain('name: core');
    expect(fake.html.at(-1)).not.toContain('Billing');
  });

  it('restores the previous blueprint when the write fails', async () => {
    const fake = editor({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      confirmGenerate: true,
      writeBlueprint: true,
      failWrite: true,
      files: [
        { path: '/repo/blueprints/context.yaml', content: checkout },
        { path: '/repo/src/catalog.ts', content: 'export {}' },
      ],
    });
    const host = await createEditorHost(fake.api);

    await generateFromWorkspace(host);

    expect(fake.calls.some(call => call.startsWith('message:Could not write'))).toBe(true);
    expect(fake.files.find(file => file.path === '/repo/blueprints/context.yaml')?.content).toBe(
      checkout
    );
    expect(fake.html).toEqual([]);
  });

  it('compares with a fresh scan when a generate setting would say off', async () => {
    const fake = editor({ trusted: true, enabled: false, choice: 'escape' });
    const host = await createEditorHost(fake.api);

    await compareWithScan(host);

    expect(fake.calls).toContain('findFiles');
    expect(fake.calls).not.toContain('message:Generate diagram from workspace');
  });

  it('does not scan a compare while the open blueprint is unsaved', async () => {
    const fake = editor({
      trusted: true,
      enabled: true,
      dirtyBlueprint: true,
      files: [{ path: '/repo/src/catalog.ts', content: 'export {}' }],
    });
    const host = await createEditorHost(fake.api);

    await compareWithScan(host);

    expect(fake.calls).toContain(`message:${UNSAVED_BLUEPRINT_COPY}`);
    expect(fake.calls).not.toContain('findFiles');
  });

  it('does not scan a compare while a blueprints file is half edited', async () => {
    const fake = editor({
      trusted: true,
      enabled: true,
      dirtyBlueprint: true,
      dirtyText: 'name: Checkout\n',
      files: [
        { path: '/repo/blueprints/context.yaml', content: checkout },
        { path: '/repo/src/catalog.ts', content: 'export {}' },
      ],
    });
    const host = await createEditorHost(fake.api);

    await compareWithScan(host);

    expect(fake.calls).toContain(`message:${UNSAVED_BLUEPRINT_COPY}`);
    expect(fake.calls).not.toContain('findFiles');
    expect(fake.calls.some(call => call.startsWith('blueprint:'))).toBe(false);
  });

  it('says there are no changes when the compare matches the blueprint', async () => {
    const matching = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  name: Checkout
  entityRef: checkout
nodes:
  - entityRef: repo/checkout
    type: software-system
    name: checkout
dependencies: []
`;
    const fake = editor({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      files: [
        { path: '/repo/blueprints/context.yaml', content: matching },
        { path: '/repo/checkout/api.ts', content: 'export {}' },
      ],
    });
    const host = await createEditorHost(fake.api);

    await compareWithScan(host);

    expect(fake.calls).toContain(`message:${NO_CHANGES_COPY}`);
    expect(fake.calls.some(call => call.startsWith('message:Review'))).toBe(false);
  });

  it('includes Terraform JSON in a default workspace scan', async () => {
    const fake = editor({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      confirmGenerate: true,
      files: [{ path: '/repo/infra/stack.tf.json', content: '{}' }],
    });
    const host = await createEditorHost(fake.api);

    await generateFromWorkspace(host);

    expect(fake.patterns).toContainEqual({ base: '/repo', pattern: '**/*.tf.json' });
    expect(fake.calls.some(call => call.includes('1 added'))).toBe(true);
    expect(fake.calls.some(call => call.includes('Added stack'))).toBe(false);
  });

  it('does not scan when the scope picker is dismissed', async () => {
    const fake = editor({
      trusted: true,
      enabled: true,
      files: [{ path: '/repo/src/api.ts', content: 'export {}' }],
    });
    const host = await createEditorHost(fake.api);

    await generateFromWorkspace(host);

    expect(fake.calls.some(call => call.startsWith('message:Scanning'))).toBe(false);
    expect(fake.calls.some(call => call.startsWith('message:Review'))).toBe(false);
  });

  it('does not open the interest discussion when generating', async () => {
    const fake = editor({ trusted: true, choice: 'Tell us you want this' });
    const host = await createEditorHost(fake.api);

    await generateFromWorkspace(host);

    expect(fake.opened).toEqual([]);
    expect(fake.calls).toContain('findFiles');
  });

  it('does not open the interest discussion when the scope picker is dismissed', async () => {
    const fake = editor({ trusted: true, choice: 'escape' });
    const host = await createEditorHost(fake.api);

    await generateFromWorkspace(host);

    expect(fake.opened).toEqual([]);
    expect(fake.calls).toContain('findFiles');
  });

  it('does not read the folder when Generate runs untrusted', async () => {
    const fake = editor({ trusted: false, choice: 'Tell us you want this' });
    const host = await createEditorHost(fake.api);

    await generateFromWorkspace(host);

    expect(fake.calls).toEqual([`message:${TRUST_COPY}`]);
    expect(fake.opened).toEqual([]);
  });
});
