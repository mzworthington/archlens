import axe from 'axe-core';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import {
  generateFromWorkspace,
  openArchitectureMap,
  renderArchitectureMapPanel,
} from './editorPreview';

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

describe('Open architecture map', () => {
  it('shows the systems and the links from a blueprint in a trusted folder', async () => {
    const result = await openArchitectureMap({
      trusted: true,
      listBlueprints: async () => [{ path: 'blueprints/shop/context.yaml', content: SHOP }],
    });

    expect(result).toEqual({
      kind: 'map',
      map: {
        name: 'Shop',
        systems: [
          { name: 'Catalog', entityRef: 'shop/catalog' },
          { name: 'Billing', entityRef: 'shop/billing' },
        ],
        links: [{ fromName: 'Catalog', toName: 'Billing' }],
      },
    });
  });

  it('does not read a blueprint while the workspace is untrusted', async () => {
    const reads: string[] = [];
    const result = await openArchitectureMap({
      trusted: false,
      listBlueprints: async () => {
        reads.push('list');
        return [{ path: 'blueprints/shop/context.yaml', content: SHOP }];
      },
    });

    expect(result).toEqual({
      kind: 'untrusted',
      message: 'ArchLens does not read this folder until the workspace is trusted.',
    });
    expect(reads).toEqual([]);
  });

  it('says there is no map when the trusted folder has no blueprint', async () => {
    const result = await openArchitectureMap({
      trusted: true,
      listBlueprints: async () => [],
    });

    expect(result).toEqual({ kind: 'empty', message: 'No map in this folder.' });
  });

  it('leaves a YAML file that is not a blueprint out of the map', async () => {
    const result = await openArchitectureMap({
      trusted: true,
      listBlueprints: async () => [{ path: 'notes.yaml', content: 'title: not a blueprint\n' }],
    });

    expect(result).toEqual({ kind: 'empty', message: 'No map in this folder.' });
  });

  it('opens the context blueprint when the folder has more than one diagram', async () => {
    const container = SHOP.replace('level: context', 'level: container').replace(
      'name: Shop',
      'name: Shop containers'
    );
    const result = await openArchitectureMap({
      trusted: true,
      listBlueprints: async () => [
        { path: 'blueprints/shop/containers.yaml', content: container },
        { path: 'blueprints/shop/context.yaml', content: SHOP },
      ],
    });

    expect(result.kind).toBe('map');
    if (result.kind !== 'map') return;
    expect(result.map.name).toBe('Shop');
  });
});

describe('Architecture map panel', () => {
  it('names each system so keyboard focus lands on that name', async () => {
    const opened = await openArchitectureMap({
      trusted: true,
      listBlueprints: async () => [{ path: 'blueprints/shop/context.yaml', content: SHOP }],
    });
    if (opened.kind !== 'map') throw new Error('expected a map');

    const html = renderArchitectureMapPanel(opened);
    const document = dom(html);
    const systems = [...document.querySelectorAll('button')].map(button => button.textContent);

    expect(systems).toEqual(['Catalog', 'Billing']);
    expect(document.body.textContent).toContain('Catalog → Billing');
    expect(html).not.toContain('<script');
  });

  it('escapes system names so a blueprint cannot inject markup', () => {
    const html = renderArchitectureMapPanel({
      kind: 'map',
      map: {
        name: '<Shop>',
        systems: [{ name: '<img src=x onerror=alert(1)>', entityRef: 'shop/catalog' }],
        links: [{ fromName: '<img src=x onerror=alert(1)>', toName: 'Billing' }],
      },
    });

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('shows the empty copy and no systems when the folder has no map', () => {
    const html = renderArchitectureMapPanel({ kind: 'empty', message: 'No map in this folder.' });
    const document = dom(html);

    expect(document.body.textContent).toContain('No map in this folder.');
    expect(document.querySelectorAll('button')).toHaveLength(0);
  });

  it('meets WCAG AA for the map and the empty state', async () => {
    const opened = await openArchitectureMap({
      trusted: true,
      listBlueprints: async () => [{ path: 'blueprints/shop/context.yaml', content: SHOP }],
    });
    if (opened.kind !== 'map') throw new Error('expected a map');

    expect(await axeViolations(renderArchitectureMapPanel(opened))).toEqual([]);
    expect(
      await axeViolations(
        renderArchitectureMapPanel({ kind: 'empty', message: 'No map in this folder.' })
      )
    ).toEqual([]);
  });
});

describe('Generate diagram from workspace', () => {
  it('does not read a blueprint while the workspace is untrusted', async () => {
    const reads: string[] = [];
    const result = await generateFromWorkspace({
      trusted: false,
      enabled: false,
      listBlueprints: async () => {
        reads.push('list');
        return [{ path: 'blueprints/shop/context.yaml', content: SHOP }];
      },
      scan: () => {
        throw new Error('scan ran');
      },
      write: () => {
        throw new Error('write ran');
      },
      ask: () => {
        throw new Error('prompt opened');
      },
      openDiscussion: () => {
        throw new Error('discussion opened');
      },
    });

    expect(result).toEqual({
      kind: 'untrusted',
      message: 'ArchLens does not read this folder until the workspace is trusted.',
    });
    expect(reads).toEqual([]);
  });

  it('shows that generation is turned off and can open the GitHub discussion', async () => {
    const sideEffects = recordSideEffects();
    const result = await generateFromWorkspace({
      trusted: true,
      enabled: false,
      ...sideEffects.ports,
      ask: async prompt => {
        sideEffects.noteAsked(prompt);
        return 'tell-us';
      },
    });

    expect(sideEffects.asked).toEqual({
      title: 'Generate diagram from workspace',
      body: 'Generating a diagram from code is turned off in this preview.',
      tellUsLabel: 'Tell us you want this',
      cancelLabel: 'Cancel',
    });
    expect(result).toEqual({
      kind: 'discussion-opened',
      url: 'https://github.com/mzworthington/archlens/discussions',
    });
    expect(sideEffects.scanned).toBe(0);
    expect(sideEffects.written).toBe(0);
    expect(sideEffects.opened).toEqual(['https://github.com/mzworthington/archlens/discussions']);
  });

  it('closes the generate prompt on Escape and writes nothing', async () => {
    const sideEffects = recordSideEffects();
    const result = await generateFromWorkspace({
      trusted: true,
      enabled: false,
      ...sideEffects.ports,
      ask: async () => 'escape',
    });

    expect(result).toEqual({ kind: 'dismissed' });
    expect(sideEffects.scanned).toBe(0);
    expect(sideEffects.written).toBe(0);
    expect(sideEffects.opened).toEqual([]);
  });

  it('closes the generate prompt on Cancel and writes nothing', async () => {
    const sideEffects = recordSideEffects();
    const result = await generateFromWorkspace({
      trusted: true,
      enabled: false,
      ...sideEffects.ports,
      ask: async () => 'cancel',
    });

    expect(result).toEqual({ kind: 'dismissed' });
    expect(sideEffects.written).toBe(0);
    expect(sideEffects.opened).toEqual([]);
  });

  it('does not scan or write when generate-from-workspace is turned on', async () => {
    const sideEffects = recordSideEffects();
    const result = await generateFromWorkspace({
      trusted: true,
      enabled: true,
      ...sideEffects.ports,
      ask: () => {
        throw new Error('interest prompt opened');
      },
    });

    expect(result).toEqual({ kind: 'enabled-without-scan' });
    expect(sideEffects.scanned).toBe(0);
    expect(sideEffects.written).toBe(0);
    expect(sideEffects.opened).toEqual([]);
  });
});

function dom(html: string): Document {
  return new JSDOM(html).window.document;
}

async function axeViolations(html: string): Promise<string[]> {
  const { window } = new JSDOM(html);
  const previousWindow = Reflect.get(globalThis, 'window');
  const previousDocument = Reflect.get(globalThis, 'document');
  Reflect.set(globalThis, 'window', window);
  Reflect.set(globalThis, 'document', window.document);
  try {
    const results = await axe.run(window.document.documentElement, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    return results.violations.map(violation => `${violation.id}: ${violation.help}`);
  } finally {
    restoreGlobal('window', previousWindow);
    restoreGlobal('document', previousDocument);
  }
}

function restoreGlobal(key: string, value: unknown): void {
  if (value === undefined) {
    Reflect.deleteProperty(globalThis, key);
    return;
  }
  Reflect.set(globalThis, key, value);
}

function recordSideEffects() {
  const opened: string[] = [];
  let scanned = 0;
  let written = 0;
  let asked: unknown;
  return {
    get scanned() {
      return scanned;
    },
    get written() {
      return written;
    },
    get asked() {
      return asked;
    },
    opened,
    noteAsked(prompt: unknown) {
      asked = prompt;
    },
    ports: {
      listBlueprints: async () => {
        throw new Error('blueprint read');
      },
      scan: () => {
        scanned += 1;
      },
      write: () => {
        written += 1;
      },
      ask: async () => 'cancel' as const,
      openDiscussion: async (url: string) => {
        opened.push(url);
      },
    },
  };
}
