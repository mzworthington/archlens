import { describe, expect, it } from 'vitest';
import { EMPTY_MAP_COPY, INTEREST_DISCUSSION_URL, TRUST_COPY } from './domain';
import { generateFromWorkspace, openArchitectureMap } from './handler';
import type { BlueprintFile, EditorHost, WorkspaceFolder } from './ports';

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
}

function host(input: {
  trusted: boolean;
  enabled?: boolean;
  files?: readonly BlueprintFile[];
  folders?: readonly WorkspaceFolder[];
  selectedPath?: string;
  selectedFolder?: string;
  picked?: string;
  choice?: 'tell' | 'cancel' | 'escape';
}): RecordedHost {
  const calls: string[] = [];
  const messages: string[] = [];
  const diagrams: string[] = [];
  const discussions: string[] = [];
  const files = input.files ?? [];
  return {
    calls,
    messages,
    diagrams,
    discussions,
    isTrusted: () => input.trusted,
    generateEnabled: () => {
      calls.push('read-setting');
      return input.enabled ?? false;
    },
    selectedPath: () => input.selectedPath,
    selectedFolder: () => input.selectedFolder,
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
      return files;
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

describe('generate diagram command', () => {
  it('does not read the folder while the workspace is untrusted', async () => {
    const editor = host({ trusted: false, choice: 'tell' });

    await generateFromWorkspace(editor);

    expect(editor.messages).toEqual([TRUST_COPY]);
    expect(editor.calls).toEqual([]);
    expect(editor.discussions).toEqual([]);
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

  it('does not scan when generate-from-workspace is turned on', async () => {
    const editor = host({ trusted: true, enabled: true, choice: 'cancel' });

    await generateFromWorkspace(editor);

    expect(editor.calls).toContain('read-setting');
    expect(editor.calls).not.toContain('list:/repo');
    expect(editor.discussions).toEqual([]);
  });
});
