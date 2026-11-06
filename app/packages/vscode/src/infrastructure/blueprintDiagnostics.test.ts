import { describe, expect, it } from 'vitest';
import { watchBlueprintProblems } from './blueprintDiagnostics';

const cycle = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  name: Checkout
  entityRef: checkout
nodes:
  - entityRef: catalog
    type: software-system
    name: Catalog
  - entityRef: billing
    type: software-system
    name: Billing
dependencies:
  - from: catalog
    to: billing
    type: direct-call
  - from: billing
    to: catalog
    type: direct-call
`;

describe('blueprint diagnostics', () => {
  it('publishes a cycle on open and clears it after the file is fixed', () => {
    let onOpen: ((document: { uri: { fsPath: string }; getText(): string }) => void) | undefined;
    let onSave: ((document: { uri: { fsPath: string }; getText(): string }) => void) | undefined;
    const published = new Map<string, { message: string; line: number }[]>();
    const uri = { fsPath: '/repo/blueprints/context.yaml' };

    watchBlueprintProblems({
      isTrusted: () => true,
      onDidOpenTextDocument: listener => {
        onOpen = listener;
        return { dispose: () => undefined };
      },
      onDidSaveTextDocument: listener => {
        onSave = listener;
        return { dispose: () => undefined };
      },
      collection: {
        set: (target, problems) => {
          published.set(target.fsPath, [...problems]);
        },
        delete: target => {
          published.delete(target.fsPath);
        },
        clear: () => {
          published.clear();
        },
        dispose: () => undefined,
      },
    });

    onOpen?.({ uri, getText: () => cycle });
    expect(published.get(uri.fsPath)?.[0]?.message).toBe(
      'Cycle: Catalog calls Billing and Billing calls Catalog.'
    );

    onSave?.({
      uri,
      getText: () =>
        cycle.replace('  - from: billing\n    to: catalog\n    type: direct-call\n', ''),
    });
    expect(published.get(uri.fsPath)).toEqual([]);
  });

  it('adds nothing for YAML that is not a blueprint and nothing while untrusted', () => {
    let onOpen: ((document: { uri: { fsPath: string }; getText(): string }) => void) | undefined;
    const published = new Map<string, unknown>();
    const deleted: string[] = [];

    watchBlueprintProblems({
      isTrusted: () => false,
      onDidOpenTextDocument: listener => {
        onOpen = listener;
        return { dispose: () => undefined };
      },
      onDidSaveTextDocument: () => ({ dispose: () => undefined }),
      collection: {
        set: (target, problems) => {
          published.set(target.fsPath, problems);
        },
        delete: target => {
          deleted.push(target.fsPath);
        },
        clear: () => undefined,
        dispose: () => undefined,
      },
    });

    onOpen?.({ uri: { fsPath: '/repo/notes.yaml' }, getText: () => 'title: meeting notes\n' });

    expect(published.size).toBe(0);
    expect(deleted).toEqual(['/repo/notes.yaml']);
  });
});
