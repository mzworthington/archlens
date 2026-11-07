import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import {
  EMPTY_MAP_COPY,
  INTEREST_DISCUSSION_URL,
  NO_GIT_HOTSPOTS_COPY,
  NO_SOURCE_FILES_COPY,
  NO_SOURCE_COPY,
  REVIEW_TITLE,
  SCAN_FAILED_COPY,
  WRITE_FAILED_COPY,
  NOTHING_TO_COPY,
  TRUST_COPY,
  foundLine,
} from './domain';
import {
  copyDiagram,
  generateFromWorkspace,
  openArchitectureMap,
  openSource,
  showHotspots,
} from './handler';
import type {
  BlueprintFile,
  EditorHost,
  FocusedSystem,
  ReviewChoice,
  ScanOutcome,
  ScanScopeChoice,
  WorkspaceFolder,
} from './ports';
import type { ReviewRow } from './domain';

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

interface RecordedHost extends EditorHost {
  readonly calls: string[];
  readonly messages: string[];
  readonly diagrams: string[];
  readonly discussions: string[];
  readonly opened: string[];
  readonly statuses: string[];
  readonly clipboard: string[];
  readonly reviews: ReviewRow[][];
}

function host(input: {
  trusted: boolean;
  enabled?: boolean;
  files?: readonly BlueprintFile[];
  folders?: readonly WorkspaceFolder[];
  selectedPath?: string;
  selectedFolder?: string;
  hintPath?: string;
  picked?: string;
  choice?: 'tell' | 'cancel' | 'escape';
  focused?: FocusedSystem;
  existing?: readonly string[];
  schema?: SystemSchema;
  hotspotsOn?: boolean;
  workspaceRoot?: string;
  git?: boolean;
  map?: boolean;
  sourceFiles?: readonly string[];
  scope?: ScanScopeChoice;
  glob?: string;
  confirm?: 'generate' | 'cancel';
  scan?: ScanOutcome;
  review?: ReviewChoice;
  writeResult?: 'written' | 'failed';
}): RecordedHost {
  const calls: string[] = [];
  const messages: string[] = [];
  const diagrams: string[] = [];
  const discussions: string[] = [];
  const opened: string[] = [];
  const statuses: string[] = [];
  const clipboard: string[] = [];
  const reviews: ReviewRow[][] = [];
  const files = input.files ?? [];
  return {
    calls,
    messages,
    diagrams,
    discussions,
    opened,
    statuses,
    clipboard,
    reviews,
    isTrusted: () => input.trusted,
    generateEnabled: () => {
      calls.push('read-setting');
      return input.enabled ?? false;
    },
    selectedPath: () => input.selectedPath,
    selectedFolder: () => input.selectedFolder,
    hintPath: () => input.hintPath,
    workspaceFolders: () => input.folders ?? [{ name: 'repo', path: '/repo' }],
    pickFolder: async () => {
      calls.push('pick-folder');
      return input.picked;
    },
    readSelectedFile: async () => {
      calls.push('read-selected');
      return files;
    },
    listBlueprintFiles: async folderPath => {
      calls.push(`list:${folderPath}`);
      const root = folderPath.replaceAll('\\', '/').replace(/\/+$/, '');
      return files.filter(file => file.path.replaceAll('\\', '/').startsWith(`${root}/`));
    },
    blueprintsFolder: () => 'blueprints',
    showMessage: message => {
      messages.push(message);
    },
    showDiagram: async diagram => {
      diagrams.push(diagram.systems.map(system => system.name).join(', '));
    },
    askGenerateInterest: async () => {
      calls.push('prompt');
      return input.choice ?? 'cancel';
    },
    openDiscussion: async url => {
      discussions.push(url);
    },
    focusedSystem: () => input.focused,
    fileExists: async path => (input.existing ?? []).includes(path),
    openFile: async path => {
      opened.push(path);
    },
    setStatus: message => {
      statuses.push(message);
    },
    visibleSchema: () => input.schema,
    writeClipboard: async text => {
      clipboard.push(text);
    },
    visibleMap: () =>
      input.map
        ? {
            hotspotsOn: input.hotspotsOn ?? false,
            ...(input.workspaceRoot ? { workspaceRoot: input.workspaceRoot } : {}),
          }
        : undefined,
    hasGitHistory: async root => {
      calls.push(`git:${root}`);
      return input.git ?? false;
    },
    setHotspots: on => {
      calls.push(`hotspots:${on}`);
    },
    listSourceFiles: async root => {
      calls.push(`sources:${root}`);
      return input.sourceFiles ?? [];
    },
    askScanScope: async found => {
      calls.push(`found:${found}`);
      return input.scope ?? 'escape';
    },
    askScanGlob: async () => input.glob,
    confirmGenerate: async () => input.confirm ?? 'cancel',
    scanFolder: async root => {
      calls.push(`scan:${root}`);
      return input.scan ?? 'ready';
    },
    showReview: async rows => {
      reviews.push([...rows]);
      calls.push(REVIEW_TITLE);
      return input.review ?? 'keep';
    },
    applyBlueprintWrite: async documents => {
      calls.push(`blueprint:${documents.map(document => document.path).join(',')}`);
      return input.writeResult ?? 'written';
    },
  };
}

describe('open architecture map command', () => {
  it('does not read a blueprint while the workspace is untrusted', async () => {
    const editor = host({
      trusted: false,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });

    await openArchitectureMap(editor);

    expect(editor.messages).toEqual([TRUST_COPY]);
    expect(editor.calls).toEqual([]);
    expect(editor.diagrams).toEqual([]);
  });

  it('shows the systems from the blueprint in a trusted folder', async () => {
    const editor = host({
      trusted: true,
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });

    await openArchitectureMap(editor);

    expect(editor.diagrams).toEqual(['Checkout API, Billing']);
    expect(editor.calls).toContain('list:/repo');
  });

  it('says there is no map when the trusted folder has no blueprint', async () => {
    const editor = host({ trusted: true, files: [] });

    await openArchitectureMap(editor);

    expect(editor.messages).toEqual([EMPTY_MAP_COPY]);
    expect(editor.diagrams).toEqual([]);
  });

  it('does not merge several workspace folders into one map', async () => {
    const editor = host({
      trusted: true,
      folders: [
        { name: 'api', path: '/api' },
        { name: 'web', path: '/web' },
      ],
      picked: '/web',
      files: [{ path: '/web/blueprints/context.yaml', content: checkout }],
    });

    await openArchitectureMap(editor);

    expect(editor.calls).toContain('pick-folder');
    expect(editor.calls).toContain('list:/web');
    expect(editor.calls).not.toContain('list:/api');
  });
});

describe('open source command', () => {
  it('does not open a file while the workspace is untrusted', async () => {
    const editor = host({
      trusted: false,
      focused: { name: 'Checkout API', sourceFile: 'src/api.ts', workspaceRoot: '/repo' },
      existing: ['/repo/src/api.ts'],
    });

    await openSource(editor);

    expect(editor.messages).toEqual([TRUST_COPY]);
    expect(editor.opened).toEqual([]);
  });

  it('opens the file the focused system points at and names it in the status', async () => {
    const editor = host({
      trusted: true,
      focused: { name: 'Checkout API', sourceFile: 'src/api.ts', workspaceRoot: '/repo' },
      existing: ['/repo/src/api.ts'],
    });

    await openSource(editor);

    expect(editor.opened).toEqual(['/repo/src/api.ts']);
    expect(editor.statuses).toEqual(['Opened /repo/src/api.ts from Checkout API.']);
  });

  it('leaves the diagram in place when the focused system has no source file', async () => {
    const editor = host({
      trusted: true,
      focused: { name: 'Billing', workspaceRoot: '/repo' },
    });

    await openSource(editor);

    expect(editor.messages).toEqual([NO_SOURCE_COPY]);
    expect(editor.opened).toEqual([]);
  });

  it('does not open a path outside the workspace', async () => {
    const editor = host({
      trusted: true,
      focused: { name: 'Checkout API', sourceFile: '../secret.ts', workspaceRoot: '/repo' },
      existing: ['/secret.ts'],
    });

    await openSource(editor);

    expect(editor.messages).toEqual([NO_SOURCE_COPY]);
    expect(editor.opened).toEqual([]);
  });
});

describe('copy diagram command', () => {
  it('copies a flowchart and does not change the blueprint', async () => {
    const editor = host({
      trusted: true,
      schema: {
        name: 'Checkout',
        version: 'v4',
        level: 'context',
        nodes: [
          { entityRef: 'checkout/api', name: 'Checkout API', type: 'software-system' },
          { entityRef: 'checkout/billing', name: 'Billing', type: 'software-system' },
        ],
        dependencies: [{ from: 'checkout/api', to: 'checkout/billing', type: 'direct-call' }],
      },
    });

    await copyDiagram(editor);

    expect(editor.clipboard[0]).toContain('graph TD');
    expect(editor.clipboard[0]).toContain('Checkout API');
    expect(editor.clipboard[0]).toContain('Billing');
    expect(editor.calls).not.toContain('list:/repo');
  });

  it('leaves the clipboard alone when the diagram has no systems', async () => {
    const editor = host({
      trusted: true,
      schema: { name: 'Empty', version: 'v4', level: 'context', nodes: [], dependencies: [] },
    });

    await copyDiagram(editor);

    expect(editor.messages).toEqual([NOTHING_TO_COPY]);
    expect(editor.clipboard).toEqual([]);
  });

  it('does not copy while the workspace is untrusted', async () => {
    const editor = host({
      trusted: false,
      schema: {
        name: 'Checkout',
        version: 'v4',
        level: 'context',
        nodes: [{ entityRef: 'checkout/api', name: 'Checkout API', type: 'software-system' }],
        dependencies: [],
      },
    });

    await copyDiagram(editor);

    expect(editor.messages).toEqual([TRUST_COPY]);
    expect(editor.clipboard).toEqual([]);
  });
});

describe('generate diagram command', () => {
  it('does not read the folder while the workspace is untrusted', async () => {
    const editor = host({ trusted: false, choice: 'tell' });

    await generateFromWorkspace(editor);

    expect(editor.messages).toEqual([TRUST_COPY]);
    expect(editor.calls).toEqual([]);
    expect(editor.discussions).toEqual([]);
  });

  it('lists the workspace root that contains the focused file', async () => {
    const editor = host({
      trusted: true,
      hintPath: 'C:\\checkout\\src\\api.ts',
      folders: [
        { name: 'billing', path: 'C:\\billing' },
        { name: 'checkout', path: 'C:\\checkout' },
      ],
      files: [],
    });

    await openArchitectureMap(editor);

    expect(editor.calls).toContain('list:C:\\checkout');
    expect(editor.calls).not.toContain('pick-folder');
  });

  it('opens the discussion from Tell us you want this and lists no files', async () => {
    const editor = host({ trusted: true, enabled: false, choice: 'tell' });

    await generateFromWorkspace(editor);

    expect(editor.discussions).toEqual([INTEREST_DISCUSSION_URL]);
    expect(editor.calls).not.toContain('list:/repo');
    expect(editor.calls).not.toContain('read-selected');
  });

  it('writes nothing when the prompt is dismissed', async () => {
    const editor = host({ trusted: true, choice: 'escape' });

    await generateFromWorkspace(editor);

    expect(editor.discussions).toEqual([]);
    expect(editor.calls).not.toContain('list:/repo');
  });

  it('closes the scope picker on Escape and does not scan', async () => {
    const editor = host({ trusted: true, enabled: true, scope: 'escape' });

    await generateFromWorkspace(editor);

    expect(editor.calls).toContain('read-setting');
    expect(editor.calls).toContain('sources:/repo');
    expect(editor.calls.some(call => call.startsWith('scan:'))).toBe(false);
    expect(editor.reviews).toEqual([]);
    expect(editor.discussions).toEqual([]);
  });

  it('shows added, changed and removed rows and writes nothing', async () => {
    const editor = host({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      confirm: 'generate',
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
      sourceFiles: ['/repo/checkout/api.ts', '/repo/src/catalog.ts'],
    });

    await generateFromWorkspace(editor);

    expect(editor.reviews).toEqual([
      [
        { status: 'Changed', name: 'api' },
        { status: 'Added', name: 'catalog' },
        { status: 'Removed', name: 'Billing' },
      ],
    ]);
    expect(editor.discussions).toEqual([]);
    expect(editor.calls.some(call => call.startsWith('blueprint:'))).toBe(false);
    expect(editor.diagrams).toEqual([]);
  });

  it('keeps the current files when the review is dismissed', async () => {
    const editor = host({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      confirm: 'generate',
      review: 'escape',
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
      sourceFiles: ['/repo/src/catalog.ts'],
    });

    await generateFromWorkspace(editor);

    expect(editor.calls.some(call => call.startsWith('blueprint:'))).toBe(false);
    expect(editor.diagrams).toEqual([]);
  });

  it('writes the review and shows those systems', async () => {
    const editor = host({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      confirm: 'generate',
      review: 'write',
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
      sourceFiles: ['/repo/checkout/api.ts', '/repo/src/catalog.ts'],
    });

    await generateFromWorkspace(editor);

    expect(editor.calls).toContain('blueprint:/repo/blueprints/context.yaml');
    expect(editor.diagrams).toEqual(['api, catalog']);
    expect(editor.messages).toEqual([]);
  });

  it('leaves the previous files when the write fails', async () => {
    const editor = host({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      confirm: 'generate',
      review: 'write',
      writeResult: 'failed',
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
      sourceFiles: ['/repo/src/catalog.ts'],
    });

    await generateFromWorkspace(editor);

    expect(editor.messages).toEqual([WRITE_FAILED_COPY]);
    expect(editor.diagrams).toEqual([]);
  });

  it('reports an empty folder and writes nothing', async () => {
    const editor = host({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      confirm: 'generate',
      sourceFiles: ['/repo/README.md'],
    });

    await generateFromWorkspace(editor);

    expect(editor.messages).toEqual([NO_SOURCE_FILES_COPY]);
    expect(editor.calls).toContain(`found:${foundLine([])}`);
    expect(editor.reviews).toEqual([]);
  });

  it('keeps existing files when the scan is cancelled', async () => {
    const editor = host({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      confirm: 'generate',
      scan: 'cancelled',
      sourceFiles: ['/repo/src/api.ts'],
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });

    await generateFromWorkspace(editor);

    expect(editor.messages).toEqual([SCAN_FAILED_COPY]);
    expect(editor.reviews).toEqual([]);
  });

  it('reviews a nested folder against the workspace map', async () => {
    const editor = host({
      trusted: true,
      enabled: true,
      scope: 'folder',
      confirm: 'generate',
      selectedFolder: '/repo/checkout',
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
      sourceFiles: ['/repo/checkout/api.ts'],
    });

    await generateFromWorkspace(editor);

    expect(editor.calls).toContain('list:/repo');
    expect(editor.calls).not.toContain('list:/repo/checkout');
    expect(editor.calls).toContain('scan:/repo/checkout');
    expect(editor.reviews).toEqual([
      [
        { status: 'Changed', name: 'api' },
        { status: 'Removed', name: 'Billing' },
      ],
    ]);
  });

  it('does not scan a custom glob that was dismissed', async () => {
    const editor = host({
      trusted: true,
      enabled: true,
      scope: 'custom',
      sourceFiles: ['/repo/src/api.ts'],
    });

    await generateFromWorkspace(editor);

    expect(editor.calls.filter(call => call.startsWith('scan:'))).toEqual([]);
    expect(editor.reviews).toEqual([]);
  });
});

describe('show hotspots command', () => {
  it('does not look for git history while the workspace is untrusted', async () => {
    const editor = host({ trusted: false, map: true, workspaceRoot: '/repo', git: true });

    await showHotspots(editor);

    expect(editor.messages).toEqual([TRUST_COPY]);
    expect(editor.calls).not.toContain('git:/repo');
    expect(editor.calls).not.toContain('hotspots:true');
  });

  it('leaves the diagram alone when the folder has no git history', async () => {
    const editor = host({ trusted: true, map: true, workspaceRoot: '/repo', git: false });

    await showHotspots(editor);

    expect(editor.messages).toEqual([NO_GIT_HOTSPOTS_COPY]);
    expect(editor.calls).toContain('git:/repo');
    expect(editor.calls).not.toContain('hotspots:true');
  });

  it('turns hotspot marks on when the folder has git history', async () => {
    const editor = host({ trusted: true, map: true, workspaceRoot: '/repo', git: true });

    await showHotspots(editor);

    expect(editor.messages).toEqual([]);
    expect(editor.calls).toContain('hotspots:true');
  });

  it('turns hotspot marks off without reading git again', async () => {
    const editor = host({
      trusted: true,
      map: true,
      workspaceRoot: '/repo',
      git: true,
      hotspotsOn: true,
    });

    await showHotspots(editor);

    expect(editor.calls).toContain('hotspots:false');
    expect(editor.calls).not.toContain('git:/repo');
  });
});
