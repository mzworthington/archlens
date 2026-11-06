import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_MAP_MESSAGE, UNTRUSTED_FOLDER_MESSAGE } from '../../copy';
import { openArchitectureMap, previewAfterSave, selectBlueprint, type MapHost } from './openMap';

const checkoutYaml = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: checkout
  name: Checkout
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

const containersYaml = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: container
metadata:
  entityRef: checkout/api
  name: Checkout API containers
nodes:
  - entityRef: checkout/api/orders
    type: component
    name: Orders
dependencies: []
`;

function host(overrides: Partial<MapHost> & Pick<MapHost, 'isTrusted'>): MapHost {
  return {
    readCandidates: async () => ({ status: 'ok', files: [] }),
    ...overrides,
  };
}

describe('openArchitectureMap', () => {
  it('does not read the folder when the workspace is untrusted', async () => {
    const readCandidates = vi.fn<MapHost['readCandidates']>(async () => {
      throw new Error('read');
    });
    const result = await openArchitectureMap(host({ isTrusted: () => false, readCandidates }));
    expect(result).toEqual({ kind: 'blocked', message: UNTRUSTED_FOLDER_MESSAGE });
    expect(readCandidates).not.toHaveBeenCalled();
  });

  it('shows the systems and the links from a blueprint', async () => {
    const result = await openArchitectureMap(
      host({
        isTrusted: () => true,
        readCandidates: async () => ({
          status: 'ok',
          files: [{ path: '/repo/blueprints/context.yaml', content: checkoutYaml }],
        }),
      })
    );
    expect(result).toMatchObject({
      kind: 'diagram',
      view: {
        diagramName: 'Checkout',
        systems: [
          { name: 'Checkout API', entityRef: 'checkout/api' },
          { name: 'Billing', entityRef: 'checkout/billing' },
        ],
        links: [{ fromName: 'Checkout API', toName: 'Billing' }],
      },
    });
  });

  it('says there is no map when the folder has no blueprint', async () => {
    const result = await openArchitectureMap(
      host({
        isTrusted: () => true,
        readCandidates: async () => ({ status: 'ok', files: [] }),
      })
    );
    expect(result).toEqual({ kind: 'empty', message: EMPTY_MAP_MESSAGE });
  });

  it('leaves a yaml file that is not a blueprint in the text editor', async () => {
    const result = await openArchitectureMap(
      host({
        isTrusted: () => true,
        readCandidates: async () => ({
          status: 'ok',
          files: [{ path: '/repo/notes.yaml', content: 'title: notes\n' }],
        }),
      }),
      { invokedPath: '/repo/notes.yaml' }
    );
    expect(result).toEqual({ kind: 'not-blueprint' });
  });

  it('opens the blueprint the command was invoked on', () => {
    const result = selectBlueprint(
      [
        { path: '/repo/blueprints/context.yaml', content: checkoutYaml },
        { path: '/repo/blueprints/containers.yaml', content: containersYaml },
      ],
      { invokedPath: '/repo/blueprints/containers.yaml' }
    );
    expect(result).toMatchObject({
      kind: 'diagram',
      view: { diagramName: 'Checkout API containers', systems: [{ name: 'Orders' }] },
    });
  });

  it('prefers the context diagram when the folder has several blueprints', () => {
    const result = selectBlueprint([
      { path: '/repo/blueprints/containers.yaml', content: containersYaml },
      { path: '/repo/blueprints/context.yaml', content: checkoutYaml },
    ]);
    expect(result).toMatchObject({ kind: 'diagram', view: { diagramName: 'Checkout' } });
  });

  it('reads the ArchLens context blueprint from disk', async () => {
    const contextPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../../../../blueprints/archlens/context.yaml'
    );
    const content = fs.readFileSync(contextPath, 'utf8');
    const result = await openArchitectureMap(
      host({
        isTrusted: () => true,
        readCandidates: async () => ({ status: 'ok', files: [{ path: contextPath, content }] }),
      }),
      { invokedPath: contextPath }
    );
    expect(result.kind).toBe('diagram');
    if (result.kind !== 'diagram') return;
    expect(result.view.systems.map(system => system.name)).toEqual(
      expect.arrayContaining(['ArchLens', 'Architect'])
    );
    expect(result.view.links.map(link => `${link.fromName} to ${link.toName}`)).toContain(
      'Architect to ArchLens'
    );
  });

  it('does not open a panel when the folder pick is cancelled', async () => {
    const result = await openArchitectureMap(
      host({
        isTrusted: () => true,
        readCandidates: async () => ({ status: 'cancelled' }),
      })
    );
    expect(result).toEqual({ kind: 'cancelled' });
  });
});

describe('previewAfterSave', () => {
  it('refreshes the diagram when the open blueprint is saved', async () => {
    const opened = await openArchitectureMap(
      host({
        isTrusted: () => true,
        readCandidates: async () => ({
          status: 'ok',
          files: [{ path: '/repo/blueprints/context.yaml', content: checkoutYaml }],
        }),
      })
    );
    if (opened.kind !== 'diagram') throw new Error('expected a diagram');
    const renamed = checkoutYaml.replace('name: Billing', 'name: Payments');
    const next = previewAfterSave(opened.view, {
      path: '/repo/blueprints/context.yaml',
      content: renamed,
    });
    expect(next.view.systems.map(system => system.name)).toContain('Payments');
  });

  it('keeps the current diagram when the save is not a blueprint', async () => {
    const opened = await openArchitectureMap(
      host({
        isTrusted: () => true,
        readCandidates: async () => ({
          status: 'ok',
          files: [{ path: '/repo/blueprints/context.yaml', content: checkoutYaml }],
        }),
      })
    );
    if (opened.kind !== 'diagram') throw new Error('expected a diagram');
    const next = previewAfterSave(opened.view, {
      path: '/repo/blueprints/context.yaml',
      content: 'title: notes\n',
    });
    expect(next.kind).toBe('unchanged');
    expect(next.view.systems.map(system => system.name)).toContain('Billing');
  });

  it('ignores a save of a different file', async () => {
    const opened = await openArchitectureMap(
      host({
        isTrusted: () => true,
        readCandidates: async () => ({
          status: 'ok',
          files: [{ path: '/repo/blueprints/context.yaml', content: checkoutYaml }],
        }),
      })
    );
    if (opened.kind !== 'diagram') throw new Error('expected a diagram');
    const next = previewAfterSave(opened.view, {
      path: '/repo/other.yaml',
      content: containersYaml,
    });
    expect(next).toEqual({ kind: 'unchanged', view: opened.view });
  });
});
