import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import {
  INTEREST_DISCUSSION_URL,
  NO_CHANGES_COPY,
  NO_GIT_HOTSPOTS_COPY,
  NO_SOURCE_FILES_COPY,
  REVIEW_TITLE,
  SCAN_FAILED_COPY,
  WRITE_FAILED_COPY,
  NOTHING_TO_COPY,
  TRUST_COPY,
  UNSAVED_BLUEPRINT_COPY,
  foundLine,
} from './domain';
import {
  compareWithScan,
  copyDiagram,
  generateFromWorkspace,
  openArchitectureMap,
  showHotspots,
} from './handler';
import type { BlueprintDocument } from './domain';
import type {
  BlueprintFile,
  EditorHost,
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
  readonly clipboard: string[];
  readonly reviews: ReviewRow[][];
  readonly written: BlueprintDocument[];
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
  schema?: SystemSchema;
  hotspotsOn?: boolean;
  workspaceRoot?: string;
  git?: boolean;
  map?: boolean;
  sourceFiles?: readonly string[];
  gitignore?: string;
  scope?: ScanScopeChoice;
  glob?: string;
  confirm?: 'generate' | 'cancel';
  scan?: ScanOutcome;
  review?: ReviewChoice;
  writeResult?: 'written' | 'failed';
  unsaved?: boolean;
  sourceText?: Readonly<Record<string, string>>;
}): RecordedHost {
  const calls: string[] = [];
  const messages: string[] = [];
  const diagrams: string[] = [];
  const discussions: string[] = [];
  const clipboard: string[] = [];
  const reviews: ReviewRow[][] = [];
  const written: BlueprintDocument[] = [];
  const files = input.files ?? [];
  return {
    calls,
    messages,
    diagrams,
    discussions,
    clipboard,
    reviews,
    written,
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
    showEmptyMap: () => {
      calls.push('empty-panel');
    },
    askGenerateInterest: async () => {
      calls.push('prompt');
      return input.choice ?? 'cancel';
    },
    openDiscussion: async url => {
      discussions.push(url);
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
    readGitignore: async () => input.gitignore ?? '',
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
    unsavedBlueprint: () => input.unsaved ?? false,
    showReview: async rows => {
      reviews.push([...rows]);
      calls.push(REVIEW_TITLE);
      return input.review ?? 'keep';
    },
    applyBlueprintWrite: async documents => {
      written.push(...documents);
      calls.push(`blueprint:${documents.map(document => document.path).join(',')}`);
      return input.writeResult ?? 'written';
    },
    readSource: async path => input.sourceText?.[path] ?? null,
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

    expect(editor.calls).toContain('empty-panel');
    expect(editor.messages).toEqual([]);
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

  it('writes a call edge when one source file imports another', async () => {
    const domain = '/repo/app/packages/vscode/src/features/editorPreview/domain.ts';
    const handlerPath = '/repo/app/packages/vscode/src/features/editorPreview/handler.ts';
    const editor = host({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      confirm: 'generate',
      review: 'write',
      sourceFiles: [domain, handlerPath],
      sourceText: {
        [domain]: 'export const ready = true;\n',
        [handlerPath]: "import { ready } from './domain';\n",
      },
    });

    await generateFromWorkspace(editor);

    expect(editor.written.map(document => document.content).join('\n')).toContain(
      'Calls module / service'
    );
  });

  it('leaves gitignored and structural paths out of the review', async () => {
    const editor = host({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      confirm: 'generate',
      gitignore: '.pnpm-store/\n',
      sourceFiles: [
        '/repo/src/catalog.ts',
        '/repo/.pnpm-store/v11/projects/store/index.ts',
        '/repo/.github/workflows/codeql.test.cjs',
      ],
    });

    await generateFromWorkspace(editor);

    expect(editor.reviews).toEqual([[{ status: 'Added', name: 'core' }]]);
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
        { status: 'Added', name: 'checkout' },
        { status: 'Added', name: 'core' },
        { status: 'Removed', name: 'Checkout API' },
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

    expect(
      editor.calls.some(
        call => call.startsWith('blueprint:') && call.includes('/repo/blueprints/context.yaml')
      )
    ).toBe(true);
    expect(editor.diagrams).toEqual(['checkout, core']);
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
        { status: 'Added', name: 'checkout' },
        { status: 'Removed', name: 'Checkout API' },
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

describe('compare with a fresh scan', () => {
  it('uses the interest prompt while generation is off and does not scan', async () => {
    const editor = host({ trusted: true, enabled: false, choice: 'cancel' });

    await compareWithScan(editor);

    expect(editor.calls).toContain('prompt');
    expect(editor.calls.some(call => call.startsWith('sources:'))).toBe(false);
    expect(editor.reviews).toEqual([]);
  });

  it('stops before a scan when the open blueprint is unsaved', async () => {
    const editor = host({
      trusted: true,
      enabled: true,
      unsaved: true,
      sourceFiles: ['/repo/src/catalog.ts'],
    });

    await compareWithScan(editor);

    expect(editor.messages).toEqual([UNSAVED_BLUEPRINT_COPY]);
    expect(editor.calls.some(call => call.startsWith('sources:'))).toBe(false);
    expect(editor.reviews).toEqual([]);
  });

  it('shows an added system in the same review and writes nothing until Write blueprint', async () => {
    const editor = host({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      review: 'keep',
      files: [
        {
          path: '/repo/blueprints/context.yaml',
          content: checkout
            .replace('name: Checkout API', 'name: api')
            .replace('name: Billing', 'name: billing'),
        },
      ],
      sourceFiles: ['/repo/src/catalog.ts', '/repo/checkout/api.ts', '/repo/checkout/billing.ts'],
    });

    await compareWithScan(editor);

    expect(editor.reviews).toEqual([
      [
        { status: 'Added', name: 'checkout' },
        { status: 'Added', name: 'core' },
        { status: 'Removed', name: 'api' },
        { status: 'Removed', name: 'billing' },
      ],
    ]);
    expect(editor.calls.some(call => call.startsWith('blueprint:'))).toBe(false);
  });

  it('says there are no changes when the blueprint already matches', async () => {
    const matching = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  name: Repo
  entityRef: repo
nodes:
  - entityRef: repo/core
    type: software-system
    name: core
dependencies: []
`;
    const editor = host({
      trusted: true,
      enabled: true,
      scope: 'workspace',
      files: [{ path: '/repo/blueprints/context.yaml', content: matching }],
      sourceFiles: ['/repo/src/catalog.ts'],
    });

    await compareWithScan(editor);

    expect(editor.messages).toEqual([NO_CHANGES_COPY]);
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
