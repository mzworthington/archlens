import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentLevelWriter } from './componentLevelWriter.ts';
import type { SystemNode, SystemDependency } from '@archlens/core';
import { MockFileSystem, MockLogger } from '../test/fakes.ts';

describe('ComponentLevelWriter', () => {
  let fileSystem: MockFileSystem;
  let logger: MockLogger;
  let writer: ComponentLevelWriter;

  beforeEach(() => {
    fileSystem = new MockFileSystem();
    logger = new MockLogger();
    writer = new ComponentLevelWriter(fileSystem, logger);
  });

  it('writes one component schema per container with expected path, entityRef, slugified ids and filtered nodes', async () => {
    const componentNodesMap = new Map<string, SystemNode>([
      [
        'component-a',
        {
          entityRef: 'my-context/my-system/frontend-ui/component-a',
          name: 'Component A',
          type: 'component',
          properties: { containerId: 'Frontend UI' },
        },
      ],
      [
        'component-b',
        {
          entityRef: 'my-context/my-system/domain-logic/component-b',
          name: 'Component B',
          type: 'component',
          properties: { containerId: 'domain-logic' },
        },
      ],
    ]);
    const containerNodesMap = new Map<string, SystemNode>([
      [
        'Frontend UI',
        { entityRef: 'my-context/my-system/frontend-ui', name: 'Frontend UI', type: 'web-app' },
      ],
      [
        'domain-logic',
        {
          entityRef: 'my-context/my-system/domain-logic',
          name: 'Domain Logic',
          type: 'microservice',
        },
      ],
    ]);

    await writer.write(
      '/workspace/blueprints/my-context/my-system',
      'My Context',
      'my-system',
      componentNodesMap,
      [],
      containerNodesMap
    );

    const frontendPath = '/workspace/blueprints/my-context/my-system/frontend-ui-components.yaml';
    const domainPath = '/workspace/blueprints/my-context/my-system/domain-logic-components.yaml';

    expect(Array.from(fileSystem.writtenFiles.keys())).toEqual(
      expect.arrayContaining([frontendPath, domainPath])
    );

    const frontendYaml = fileSystem.writtenFiles.get(frontendPath)!;
    expect(frontendYaml).toContain('entityRef: my-context/my-system/frontend-ui');
    expect(frontendYaml).toContain('name: Frontend UI Components');
    expect(frontendYaml).toContain('level: component');
    expect(frontendYaml).toContain('name: Component A');
    expect(frontendYaml).not.toContain('name: Component B');

    const domainYaml = fileSystem.writtenFiles.get(domainPath)!;
    expect(domainYaml).toContain('entityRef: my-context/my-system/domain-logic');
    expect(domainYaml).toContain('name: Domain Logic Components');
    expect(domainYaml).toContain('name: Component B');
    expect(domainYaml).not.toContain('name: Component A');
  });

  it('includes dependencies touching the container, including cross-container edges', async () => {
    const componentNodesMap = new Map<string, SystemNode>([
      [
        'my-context/my-system/frontend-ui/component-a',
        {
          entityRef: 'my-context/my-system/frontend-ui/component-a',
          name: 'Component A',
          type: 'component',
          properties: { containerId: 'frontend-ui' },
        },
      ],
      [
        'my-context/my-system/frontend-ui/component-b',
        {
          entityRef: 'my-context/my-system/frontend-ui/component-b',
          name: 'Component B',
          type: 'component',
          properties: { containerId: 'frontend-ui' },
        },
      ],
      [
        'my-context/my-system/domain-logic/component-c',
        {
          entityRef: 'my-context/my-system/domain-logic/component-c',
          name: 'Component C',
          type: 'component',
          properties: { containerId: 'domain-logic' },
        },
      ],
    ]);
    const componentDependencies: SystemDependency[] = [
      {
        from: 'my-context/my-system/frontend-ui/component-a',
        to: 'my-context/my-system/frontend-ui/component-b',
        type: 'direct-call',
      },
      {
        from: 'my-context/my-system/frontend-ui/component-a',
        to: 'my-context/my-system/domain-logic/component-c',
        type: 'direct-call',
      },
    ];
    const containerNodesMap = new Map<string, SystemNode>([
      [
        'frontend-ui',
        { entityRef: 'my-context/my-system/frontend-ui', name: 'Frontend UI', type: 'web-app' },
      ],
    ]);

    await writer.write(
      '/workspace/blueprints/my-context/my-system',
      'my-context',
      'my-system',
      componentNodesMap,
      componentDependencies,
      containerNodesMap
    );

    const yamlContent = fileSystem.writtenFiles.get(
      '/workspace/blueprints/my-context/my-system/frontend-ui-components.yaml'
    )!;
    expect(yamlContent).toContain('from: my-context/my-system/frontend-ui/component-a');
    expect(yamlContent).toContain('to: my-context/my-system/frontend-ui/component-b');
    expect(yamlContent).toContain('to: my-context/my-system/domain-logic/component-c');
  });

  it('emits rollup drill-down schemas from rollupDrillDown', async () => {
    const componentNodesMap = new Map<string, SystemNode>([
      [
        'cli/writers',
        {
          entityRef: 'my-context/my-system/cli/writers',
          name: 'Writers',
          type: 'background-worker',
          properties: {
            containerId: 'cli',
            memberFilepaths: [
              'app/packages/cli/src/writers/baseWriter.ts',
              'app/packages/cli/src/writers/contextLevelWriter.ts',
            ],
          },
        },
      ],
    ]);
    const fileLevelNodesMap = new Map<string, SystemNode>([
      [
        'my-context/my-system/cli/writers/base-writer',
        {
          entityRef: 'my-context/my-system/cli/writers/base-writer',
          name: 'Base Writer',
          type: 'background-worker',
          properties: {
            containerId: 'cli',
            filepath: 'app/packages/cli/src/writers/baseWriter.ts',
          },
        },
      ],
      [
        'my-context/my-system/cli/writers/context-level-writer',
        {
          entityRef: 'my-context/my-system/cli/writers/context-level-writer',
          name: 'Context Level Writer',
          type: 'background-worker',
          properties: {
            containerId: 'cli',
            filepath: 'app/packages/cli/src/writers/contextLevelWriter.ts',
          },
        },
      ],
    ]);
    const containerNodesMap = new Map<string, SystemNode>([
      ['cli', { entityRef: 'my-context/my-system/cli', name: 'Cli Service', type: 'container' }],
    ]);

    await writer.write(
      '/workspace/blueprints/my-context/my-system',
      'my-context',
      'my-system',
      componentNodesMap,
      [],
      containerNodesMap,
      undefined,
      fileLevelNodesMap,
      []
    );

    const writtenPaths = Array.from(fileSystem.writtenFiles.keys());
    expect(writtenPaths).toContain(
      '/workspace/blueprints/my-context/my-system/cli-components.yaml'
    );
    expect(writtenPaths).toContain(
      '/workspace/blueprints/my-context/my-system/cli/writers-components.yaml'
    );

    const drillDownYaml = fileSystem.writtenFiles.get(
      '/workspace/blueprints/my-context/my-system/cli/writers-components.yaml'
    )!;
    expect(drillDownYaml).toContain('entityRef: my-context/my-system/cli/writers');
    expect(drillDownYaml).toContain('level: component');
  });

  it('strips representative filepaths from parent rollups that have drill-down diagrams', async () => {
    const componentNodesMap = new Map<string, SystemNode>([
      [
        'cli/writers',
        {
          entityRef: 'my-context/my-system/cli/writers',
          name: 'Writers',
          type: 'background-worker',
          properties: {
            containerId: 'cli',
            filepath: 'app/packages/cli/src/writers/baseWriter.ts',
            memberFilepaths: [
              'app/packages/cli/src/writers/baseWriter.ts',
              'app/packages/cli/src/writers/contextLevelWriter.ts',
            ],
          },
        },
      ],
      [
        'cli/emitbuildversion',
        {
          entityRef: 'my-context/my-system/cli/emitbuildversion',
          name: 'Emitbuildversion',
          type: 'background-worker',
          properties: {
            containerId: 'cli',
            filepath: 'app/packages/cli/scripts/emitBuildVersion.ts',
          },
        },
      ],
    ]);
    const fileLevelNodesMap = new Map<string, SystemNode>([
      [
        'my-context/my-system/cli/writers/base-writer',
        {
          entityRef: 'my-context/my-system/cli/writers/base-writer',
          name: 'Base Writer',
          type: 'background-worker',
          properties: {
            containerId: 'cli',
            filepath: 'app/packages/cli/src/writers/baseWriter.ts',
          },
        },
      ],
      [
        'my-context/my-system/cli/writers/context-level-writer',
        {
          entityRef: 'my-context/my-system/cli/writers/context-level-writer',
          name: 'Context Level Writer',
          type: 'background-worker',
          properties: {
            containerId: 'cli',
            filepath: 'app/packages/cli/src/writers/contextLevelWriter.ts',
          },
        },
      ],
    ]);
    const containerNodesMap = new Map<string, SystemNode>([
      ['cli', { entityRef: 'my-context/my-system/cli', name: 'Cli Service', type: 'container' }],
    ]);

    await writer.write(
      '/workspace/blueprints/my-context/my-system',
      'my-context',
      'my-system',
      componentNodesMap,
      [],
      containerNodesMap,
      undefined,
      fileLevelNodesMap,
      []
    );

    const parentYaml = fileSystem.writtenFiles.get(
      '/workspace/blueprints/my-context/my-system/cli-components.yaml'
    )!;
    expect(parentYaml).toContain('entityRef: my-context/my-system/cli/writers');
    expect(parentYaml).not.toContain('filepath: app/packages/cli/src/writers/baseWriter.ts');
    expect(parentYaml).toContain('filepath: app/packages/cli/scripts/emitBuildVersion.ts');
  });
});
