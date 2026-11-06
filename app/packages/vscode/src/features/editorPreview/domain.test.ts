import { describe, expect, it } from 'vitest';
import {
  CANCEL_COPY,
  EMPTY_MAP_COPY,
  GENERATE_OFF_COPY,
  GENERATE_TITLE,
  INTEREST_DISCUSSION_URL,
  TELL_US_COPY,
  TRUST_COPY,
  NO_SOURCE_COPY,
  decideOpenMap,
  decideOpenSource,
  generateDecision,
  resolveSourceFile,
  safeBlueprintsFolder,
} from './domain';

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

const notes = `title: meeting notes
`;

describe('open architecture map', () => {
  it('shows the systems and the link between them', () => {
    const decision = decideOpenMap({
      files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
    });

    expect(decision).toEqual({
      kind: 'diagram',
      diagram: {
        sourcePath: '/repo/blueprints/context.yaml',
        systems: [
          { name: 'Checkout API', entityRef: 'checkout/api' },
          { name: 'Billing', entityRef: 'checkout/billing' },
        ],
        links: [{ fromName: 'Checkout API', toName: 'Billing' }],
      },
    });
  });

  it('prefers context.yaml over another blueprint in the folder', () => {
    const other = checkout.replace('name: Checkout API', 'name: Other API');
    const decision = decideOpenMap({
      files: [
        { path: '/repo/blueprints/other.yaml', content: other },
        { path: '/repo/blueprints/context.yaml', content: checkout },
      ],
    });

    expect(decision.kind === 'diagram' && decision.diagram.systems[0]?.name).toBe('Checkout API');
  });

  it('reports an empty folder when nothing in blueprints validates', () => {
    const decision = decideOpenMap({
      files: [{ path: '/repo/blueprints/notes.yaml', content: notes }],
    });

    expect(decision).toEqual({ kind: 'empty' });
    expect(EMPTY_MAP_COPY).toBe('No map in this folder.');
  });

  it('leaves a selected file that is not a blueprint in the text editor', () => {
    const decision = decideOpenMap({
      files: [
        { path: '/repo/notes.yaml', content: notes },
        { path: '/repo/blueprints/context.yaml', content: checkout },
      ],
      selectedPath: '/repo/notes.yaml',
    });

    expect(decision).toEqual({ kind: 'not-blueprint' });
  });

  it('ignores a blueprint folder name that could escape the workspace', () => {
    expect(safeBlueprintsFolder('blueprints')).toBe('blueprints');
    expect(safeBlueprintsFolder('../secrets')).toBe('blueprints');
    expect(safeBlueprintsFolder('nested/name')).toBe('blueprints');
    expect(safeBlueprintsFolder('')).toBe('blueprints');
  });
});

describe('generate diagram from workspace', () => {
  it('asks the engineer to open the discussion when generation is off', () => {
    expect(
      generateDecision({
        trusted: true,
        enabled: false,
      })
    ).toEqual({
      kind: 'prompt',
      title: GENERATE_TITLE,
      message: GENERATE_OFF_COPY,
      tellLabel: TELL_US_COPY,
      cancelLabel: CANCEL_COPY,
      readsSource: false,
    });
    expect(GENERATE_OFF_COPY).toBe('Generating a diagram from code is turned off in this preview.');
    expect(TELL_US_COPY).toBe('Tell us you want this');
  });

  it('opens the GitHub discussion and does not read source when they ask', () => {
    expect(
      generateDecision({
        trusted: true,
        enabled: false,
        choice: 'tell',
      })
    ).toEqual({
      kind: 'open-discussion',
      url: INTEREST_DISCUSSION_URL,
      readsSource: false,
    });
    expect(INTEREST_DISCUSSION_URL).toBe('https://github.com/mzworthington/archlens/discussions');
  });

  it('closes on Escape or Cancel and does not read source', () => {
    expect(generateDecision({ trusted: true, enabled: false, choice: 'escape' })).toEqual({
      kind: 'closed',
      readsSource: false,
    });
    expect(generateDecision({ trusted: true, enabled: false, choice: 'cancel' })).toEqual({
      kind: 'closed',
      readsSource: false,
    });
  });

  it('still does not read source when the setting is turned on', () => {
    expect(
      generateDecision({
        trusted: true,
        enabled: true,
        choice: 'tell',
      })
    ).toEqual({
      kind: 'open-discussion',
      url: INTEREST_DISCUSSION_URL,
      readsSource: false,
    });
  });

  it('does not offer the discussion while the workspace is untrusted', () => {
    expect(
      generateDecision({
        trusted: false,
        enabled: false,
        choice: 'tell',
      })
    ).toEqual({
      kind: 'untrusted',
      message: TRUST_COPY,
    });
    expect(TRUST_COPY).toBe('ArchLens does not read this folder until the workspace is trusted.');
  });
});

describe('open source', () => {
  it('keeps the filepath a scan stored on the system', () => {
    const withFile = checkout.replace(
      'name: Checkout API',
      'name: Checkout API\n    properties:\n      filepath: src/api.ts'
    );
    const decision = decideOpenMap({
      files: [{ path: '/repo/blueprints/context.yaml', content: withFile }],
    });

    expect(decision.kind === 'diagram' && decision.diagram.systems[0]).toEqual({
      name: 'Checkout API',
      entityRef: 'checkout/api',
      sourceFile: 'src/api.ts',
    });
  });

  it('resolves a source file inside the workspace and rejects one that leaves it', () => {
    expect(resolveSourceFile({ sourceFile: 'src/api.ts', workspaceRoot: '/repo' })).toBe(
      '/repo/src/api.ts'
    );
    expect(resolveSourceFile({ sourceFile: 'src\\api.ts', workspaceRoot: 'C:\\repo' })).toBe(
      'C:/repo/src/api.ts'
    );
    expect(resolveSourceFile({ sourceFile: '/repo/src/api.ts', workspaceRoot: '/repo' })).toBe(
      '/repo/src/api.ts'
    );
    expect(
      resolveSourceFile({ sourceFile: '../secret.ts', workspaceRoot: '/repo' })
    ).toBeUndefined();
    expect(resolveSourceFile({ sourceFile: '/other/secret.ts', workspaceRoot: '/repo' })).toBe(
      undefined
    );
    expect(
      resolveSourceFile({ sourceFile: '/repo-other/secret.ts', workspaceRoot: '/repo' })
    ).toBeUndefined();
  });

  it('names the opened file and the system', () => {
    expect(
      decideOpenSource({
        systemName: 'Checkout API',
        sourceFile: 'src/api.ts',
        resolvedPath: '/repo/src/api.ts',
      })
    ).toEqual({
      kind: 'open',
      path: '/repo/src/api.ts',
      status: 'Opened /repo/src/api.ts from Checkout API.',
    });
  });

  it('stays on the diagram when the system has no file in the workspace', () => {
    expect(decideOpenSource({ systemName: 'Billing' })).toEqual({
      kind: 'missing',
      message: NO_SOURCE_COPY,
    });
    expect(NO_SOURCE_COPY).toBe('This system has no source file in the workspace.');
    expect(
      decideOpenSource({
        systemName: 'Checkout API',
        sourceFile: '../secret.ts',
      })
    ).toEqual({ kind: 'missing', message: NO_SOURCE_COPY });
  });
});
