import { parseSchemaFromYaml } from '@archlens/core';
import { describe, expect, it } from 'vitest';
import {
  CANCEL_COPY,
  EMPTY_MAP_COPY,
  GENERATE_OFF_COPY,
  GENERATE_TITLE,
  INTEREST_DISCUSSION_URL,
  TELL_US_COPY,
  TRUST_COPY,
  NO_CHANGES_COPY,
  UNSAVED_BLUEPRINT_COPY,
  NO_GIT_HOTSPOTS_COPY,
  NO_SOURCE_FILES_COPY,
  REVIEW_NOTE,
  SCAN_FAILED_COPY,
  NO_LOWER_COPY,
  NOTHING_TO_COPY,
  blueprintProblems,
  chooseWorkspaceFolder,
  decideBack,
  decideCopyMermaid,
  decideDrill,
  decideOpenMap,
  decideShowHotspots,
  foundLine,
  generateDecision,
  hasUnsavedBlueprint,
  isInsideEditorPath,
  languagesInPaths,
  presentHotspots,
  blueprintWritePlan,
  reviewRows,
  reviewSummary,
  supportedSourcePaths,
  systemsFromSourcePaths,
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

const dottedScan = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  name: ArchLens
  entityRef: archlens
nodes:
  - entityRef: app/playwright.config
    type: software-system
    name: playwright.config
dependencies: []
`;

describe('open architecture map', () => {
  it('opens a scan whose file name left a dot in the entity ref', () => {
    const decision = decideOpenMap({
      files: [{ path: '/repo/blueprints/archlens/context.yaml', content: dottedScan }],
    });

    expect(decision).toEqual({
      kind: 'diagram',
      diagram: {
        sourcePath: '/repo/blueprints/archlens/context.yaml',
        level: 'context',
        systems: [
          {
            name: 'playwright.config',
            entityRef: 'app/playwright-config',
            type: 'software-system',
          },
        ],
        links: [],
      },
    });
  });

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
          { name: 'Checkout API', entityRef: 'checkout/api', type: 'software-system' },
          { name: 'Billing', entityRef: 'checkout/billing', type: 'software-system' },
        ],
        links: [
          {
            fromName: 'Checkout API',
            toName: 'Billing',
            fromRef: 'checkout/api',
            toRef: 'checkout/billing',
          },
        ],
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
      type: 'software-system',
      sourceFile: 'src/api.ts',
    });
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

  it('names the languages in the folder and ignores dependency output', () => {
    const languages = languagesInPaths([
      '/repo/src/api.ts',
      '/repo/main.go',
      '/repo/infra/main.tf',
      '/repo/node_modules/leftpad/index.js',
      '/repo/dist/app.js',
      '/repo/notes.md',
    ]);

    expect(languages).toEqual(['TypeScript', 'Go', 'Terraform']);
    expect(foundLine(languages)).toBe('Found: TypeScript, Go, Terraform');
    expect(foundLine(languagesInPaths(['/repo/README.md']))).toBe('Found: no supported languages');
    expect(supportedSourcePaths(['/repo/node_modules/leftpad/index.js'])).toEqual([]);
  });

  it('rolls files in one package up to a single system', () => {
    const systems = systemsFromSourcePaths('/repo', [
      '/repo/app/packages/vscode/src/extension.ts',
      '/repo/app/packages/vscode/src/features/editorPreview/domain.ts',
      '/repo/app/packages/canvas/src/App.tsx',
    ]);

    expect(systems.map(system => system.entityRef)).toEqual(['canvas', 'vscode']);
    expect(systems.map(system => system.name)).toEqual(['canvas', 'vscode']);
  });

  it('reviews added, changed and removed systems without treating equal names as changes', () => {
    const rows = reviewRows(
      [
        { entityRef: 'checkout/api', name: 'Checkout API' },
        { entityRef: 'checkout/billing', name: 'Billing' },
      ],
      systemsFromSourcePaths('/repo', ['/repo/checkout/api.ts', '/repo/src/catalog.ts'])
    );

    expect(rows).toEqual([
      { status: 'Added', name: 'checkout' },
      { status: 'Added', name: 'core' },
      { status: 'Removed', name: 'Checkout API' },
      { status: 'Removed', name: 'Billing' },
    ]);
    expect(reviewSummary(rows)).toBe('2 added, 2 removed.');
    expect(reviewSummary(rows)).not.toContain('catalog');
    expect(NO_SOURCE_FILES_COPY).toBe('No supported source files in this folder.');
    expect(SCAN_FAILED_COPY).toBe('The scan did not finish. No blueprint files were written.');
    expect(NO_CHANGES_COPY).toBe('No changes.');
    expect(UNSAVED_BLUEPRINT_COPY).toBe(
      'This blueprint has unsaved editor changes. Save or revert before a compare.'
    );
    expect(
      hasUnsavedBlueprint([
        { path: '/repo/blueprints/context.yaml', dirty: true, content: checkout },
        { path: '/repo/src/api.ts', dirty: true, content: 'export {}' },
      ])
    ).toBe(true);
    expect(
      hasUnsavedBlueprint([
        { path: '/repo/blueprints/context.yaml', dirty: false, content: checkout },
      ])
    ).toBe(false);
    expect(REVIEW_NOTE).toBe('Nothing is written until you choose Write blueprint.');
  });

  it('treats a half-edited file in the blueprints folder as unsaved', () => {
    const halfEdited = 'name: Checkout\n';
    const scope = { roots: ['/repo'], blueprintsFolder: 'blueprints' };

    expect(
      hasUnsavedBlueprint(
        [{ path: '/repo/blueprints/context.yaml', dirty: true, content: halfEdited }],
        scope
      )
    ).toBe(true);
    expect(
      hasUnsavedBlueprint([{ path: '/repo/notes.yaml', dirty: true, content: halfEdited }], scope)
    ).toBe(false);
    expect(
      hasUnsavedBlueprint(
        [{ path: '/repo/blueprints/context.yaml', dirty: false, content: halfEdited }],
        scope
      )
    ).toBe(false);
    expect(
      hasUnsavedBlueprint(
        [{ path: '/repo/blueprints/api.ts', dirty: true, content: 'export {}' }],
        scope
      )
    ).toBe(false);
    expect(
      hasUnsavedBlueprint([{ path: '/repo/maps/context.yml', dirty: true, content: halfEdited }], {
        roots: ['/repo'],
        blueprintsFolder: 'maps',
      })
    ).toBe(true);
  });

  it('writes the review into the blueprints folder and keeps a hand-written note', () => {
    const noted = checkout.replace(
      'entityRef: checkout/api\n    type: software-system\n    name: Checkout API',
      'entityRef: checkout\n    type: software-system\n    name: checkout\n    properties:\n      notes: hand written'
    );
    const component = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: component
metadata:
  name: Billing only
  entityRef: checkout/billing
nodes:
  - entityRef: checkout/billing
    type: software-system
    name: Billing
dependencies: []
`;
    const plan = blueprintWritePlan({
      root: '/repo',
      blueprintsFolder: 'blueprints',
      files: [
        { path: '/repo/blueprints/context.yaml', content: noted },
        { path: '/repo/blueprints/billing.yaml', content: component },
        { path: '/other/secret.yaml', content: noted },
      ],
      scanned: systemsFromSourcePaths('/repo', ['/repo/checkout/api.ts', '/repo/src/catalog.ts']),
    });

    const written = plan.documents.find(
      document => document.path === '/repo/blueprints/context.yaml'
    );
    const schema = parseSchemaFromYaml(written?.content ?? '');
    expect(schema.nodes.map(node => node.name)).toEqual(['checkout', 'core']);
    expect(schema.nodes[0]?.properties?.notes).toBe('hand written');
    expect(schema.nodes[1]?.properties?.filepath).toBeUndefined();
    expect(schema.dependencies).toEqual([]);
    expect(plan.documents.some(document => document.path === '/other/secret.yaml')).toBe(false);
    expect(
      plan.documents.some(
        document =>
          document.path === '/repo/blueprints/billing.yaml' && document.content === undefined
      )
    ).toBe(true);
    expect(plan.diagram.systems.map(system => system.name)).toEqual(['checkout', 'core']);
  });
});

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

describe('blueprint problems', () => {
  it('names both systems in a cycle and points at the dependency', () => {
    const problems = blueprintProblems(cycle);

    expect(problems).toEqual([
      {
        message: 'Cycle: Catalog calls Billing and Billing calls Catalog.',
        line: cycle.split('\n').findIndex(line => line.includes('from: catalog')),
      },
    ]);
  });

  it('adds no problem for YAML that is not a blueprint', () => {
    expect(blueprintProblems('title: meeting notes\n')).toEqual([]);
  });

  it('reports the first failed check for a broken blueprint', () => {
    const broken = checkout.replace('    name: Checkout API', '    name:');
    const problems = blueprintProblems(broken);

    expect(problems).toHaveLength(1);
    expect(problems[0]?.line).toBe(0);
    expect(problems[0]?.message.length).toBeGreaterThan(0);
  });

  it('clears the cycle once the file no longer has one', () => {
    const fixed = cycle.replace('  - from: billing\n    to: catalog\n    type: direct-call\n', '');

    expect(blueprintProblems(fixed)).toEqual([]);
  });
});

describe('diagram navigation', () => {
  it('drills into the child diagram for the focused system', () => {
    const decision = decideDrill({
      files: [
        { path: '/repo/blueprints/context.yaml', content: checkout },
        { path: '/repo/blueprints/api.yaml', content: container },
      ],
      focusedEntityRef: 'checkout/api',
      currentPath: '/repo/blueprints/context.yaml',
    });

    expect(decision.kind).toBe('child');
    if (decision.kind !== 'child') return;
    expect(decision.diagram.systems.map(system => system.name)).toEqual(['Handler']);
    expect(decision.diagram.sourcePath).toBe('/repo/blueprints/api.yaml');
  });

  it('stays put when the focused system has no child diagram', () => {
    expect(
      decideDrill({
        files: [{ path: '/repo/blueprints/context.yaml', content: checkout }],
        focusedEntityRef: 'checkout/billing',
        currentPath: '/repo/blueprints/context.yaml',
      })
    ).toEqual({ kind: 'none', message: NO_LOWER_COPY });
  });

  it('returns the parent diagram from the breadcrumb', () => {
    const decision = decideBack({
      breadcrumb: [
        { name: 'Checkout', sourcePath: '/repo/blueprints/context.yaml' },
        { name: 'Checkout API', sourcePath: '/repo/blueprints/api.yaml' },
      ],
      files: [
        { path: '/repo/blueprints/context.yaml', content: checkout },
        { path: '/repo/blueprints/api.yaml', content: container },
      ],
      sourcePath: '/repo/blueprints/context.yaml',
    });

    expect(decision.kind).toBe('parent');
    if (decision.kind !== 'parent') return;
    expect(decision.diagram.systems.map(system => system.name)).toEqual([
      'Checkout API',
      'Billing',
    ]);
    expect(decision.breadcrumb).toEqual([
      { name: 'Checkout', sourcePath: '/repo/blueprints/context.yaml' },
    ]);
  });
});

describe('copy diagram as mermaid', () => {
  it('copies a flowchart of the systems on screen', () => {
    const decision = decideCopyMermaid({
      name: 'Checkout',
      version: 'v4',
      level: 'context',
      nodes: [
        { entityRef: 'checkout/api', name: 'Checkout API', type: 'software-system' },
        { entityRef: 'checkout/billing', name: 'Billing', type: 'software-system' },
      ],
      dependencies: [{ from: 'checkout/api', to: 'checkout/billing', type: 'direct-call' }],
    });

    expect(decision.kind).toBe('copy');
    if (decision.kind !== 'copy') return;
    expect(decision.text).toContain('graph TD');
    expect(decision.text).toContain('Checkout API');
    expect(decision.text).toContain('Billing');
  });

  it('copies nothing when the diagram has no systems', () => {
    expect(
      decideCopyMermaid({
        name: 'Empty',
        version: 'v4',
        level: 'context',
        nodes: [],
        dependencies: [],
      })
    ).toEqual({ kind: 'empty', message: NOTHING_TO_COPY });
    expect(NOTHING_TO_COPY).toBe('Nothing to copy.');
  });
});

const checkoutDiagram = {
  sourcePath: '/repo/blueprints/context.yaml',
  level: 'context' as const,
  systems: [
    { name: 'Checkout API', entityRef: 'checkout/api' },
    { name: 'Billing', entityRef: 'checkout/billing' },
  ],
  links: [],
};

describe('show hotspots', () => {
  it('marks a recorded hotspot with its most recent change count', () => {
    const shown = presentHotspots(
      checkoutDiagram,
      [
        {
          entityRef: 'checkout/api',
          forensics: {
            classifications: ['hotspot'],
            churn: 12,
            churnByWeek: [2, 4, 6],
          },
        },
        { entityRef: 'checkout/billing', forensics: { churn: 9 } },
      ],
      true
    );

    expect(shown.systems).toEqual([
      { name: 'Checkout API', entityRef: 'checkout/api', hotspotCount: 6 },
      { name: 'Billing', entityRef: 'checkout/billing' },
    ]);
  });

  it('uses the rolled-up hotspot count when the scan stored one', () => {
    const shown = presentHotspots(
      checkoutDiagram,
      [{ entityRef: 'checkout/api', forensics: { hotspotCount: 3 } }],
      true
    );

    expect(shown.systems[0]?.hotspotCount).toBe(3);
    expect(shown.systems[1]?.hotspotCount).toBeUndefined();
  });

  it('leaves the diagram unmarked when hotspots are off', () => {
    const shown = presentHotspots(
      {
        ...checkoutDiagram,
        systems: [{ name: 'Checkout API', entityRef: 'checkout/api', hotspotCount: 6 }],
      },
      [{ entityRef: 'checkout/api', forensics: { classifications: ['hotspot'], churn: 6 } }],
      false
    );

    expect(shown.systems[0]).toEqual({ name: 'Checkout API', entityRef: 'checkout/api' });
  });

  it('refuses a folder with no git history and an untrusted folder', () => {
    expect(decideShowHotspots({ trusted: true, hasGitHistory: false, showing: false })).toEqual({
      kind: 'no-git',
      message: NO_GIT_HOTSPOTS_COPY,
    });
    expect(NO_GIT_HOTSPOTS_COPY).toBe('Hotspots need a git history for this folder.');
    expect(decideShowHotspots({ trusted: false, hasGitHistory: true, showing: false })).toEqual({
      kind: 'untrusted',
      message: TRUST_COPY,
    });
    expect(decideShowHotspots({ trusted: true, hasGitHistory: true, showing: false }).kind).toBe(
      'show'
    );
    expect(decideShowHotspots({ trusted: true, hasGitHistory: false, showing: true }).kind).toBe(
      'hide'
    );
  });
});
