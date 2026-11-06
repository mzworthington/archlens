import { describe, expect, it } from 'vitest';
import {
  CANCEL_COPY,
  EMPTY_MAP_COPY,
  GENERATE_OFF_COPY,
  GENERATE_TITLE,
  INTEREST_DISCUSSION_URL,
  TELL_US_COPY,
  TRUST_COPY,
  chooseWorkspaceFolder,
  decideOpenMap,
  generateDecision,
  isInsideEditorPath,
  safeBlueprintsFolder,
  sameEditorPath,
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
        level: 'context',
        systems: [
          { name: 'Checkout API', entityRef: 'checkout/api' },
          { name: 'Billing', entityRef: 'checkout/billing' },
        ],
        links: [{ fromName: 'Checkout API', toName: 'Billing' }],
      },
    });
  });

  it('treats Windows and forward-slash paths as the same file', () => {
    const decision = decideOpenMap({
      files: [{ path: 'C:/repo/blueprints/context.yaml', content: checkout }],
      selectedPath: 'C:\\repo\\blueprints\\context.yaml',
    });

    expect(decision.kind).toBe('diagram');
    expect(sameEditorPath('C:\\repo\\', 'C:/repo')).toBe(true);
    expect(isInsideEditorPath('C:\\repo\\blueprints\\context.yaml', 'C:/repo')).toBe(true);
    expect(isInsideEditorPath('C:/other/context.yaml', 'C:/repo')).toBe(false);
  });

  it('prefers a context-level diagram over a file named context.yaml', () => {
    const component = checkout
      .replace('level: context', 'level: component')
      .replace('name: Checkout API', 'name: Inner API');
    const estate = checkout.replace('name: Checkout API', 'name: Estate API');
    const decision = decideOpenMap({
      files: [
        { path: '/repo/blueprints/context.yaml', content: component },
        { path: '/repo/blueprints/estate.yaml', content: estate },
      ],
    });

    expect(decision.kind === 'diagram' && decision.diagram.systems[0]?.name).toBe('Estate API');
  });

  it('opens the workspace root that contains the focused file', () => {
    expect(
      chooseWorkspaceFolder({
        folders: ['C:\\billing', 'C:\\checkout'],
        hintPath: 'C:\\checkout\\src\\api.ts',
      })
    ).toEqual({ kind: 'folder', path: 'C:/checkout' });
  });

  it('asks for a folder when several roots are open and none contains the hint', () => {
    expect(
      chooseWorkspaceFolder({
        folders: ['/billing', '/checkout'],
        hintPath: '/other/notes.md',
      })
    ).toEqual({ kind: 'pick', paths: ['/billing', '/checkout'] });
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
