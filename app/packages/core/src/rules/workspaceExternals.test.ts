import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { getNodePosition } from '../lib/nodePosition';
import {
  buildWorkspaceEntityIndex,
  buildWorkspaceFilepathIndex,
  listExternalCandidates,
  materializeExternalNodes,
  suggestExternalDependencies,
  enrichSchemaWithExternals,
  enrichWorkspaceWithExternals,
} from './workspaceExternals';

const containerSchema: SystemSchema = {
  name: 'Cli Containers',
  version: '1.0.0',
  level: 'container',
  entityRef: 'application/cli',
  nodes: [
    { entityRef: 'application/cli/vhs', type: 'container', name: 'Vhs Service' },
    { entityRef: 'application/cli/analysis', type: 'container', name: 'Analysis Service' },
    { entityRef: 'application/cli/writers', type: 'container', name: 'Writers Service' },
  ],
  dependencies: [
    { from: 'application/cli/vhs', to: 'application/cli/analysis', type: 'inter-container' },
    { from: 'application/cli/writers', to: 'application/cli/vhs', type: 'inter-container' },
  ],
};

const vhsComponents: SystemSchema = {
  name: 'Vhs Components',
  version: '1.0.0',
  level: 'component',
  entityRef: 'application/cli/vhs',
  nodes: [
    {
      entityRef: 'application/cli/vhs/cli-demo-test',
      type: 'background-worker',
      name: 'cli-demo.test Service',
    },
  ],
  dependencies: [],
};

const writersComponents: SystemSchema = {
  name: 'Writers Components',
  version: '1.0.0',
  level: 'component',
  entityRef: 'application/cli/writers',
  nodes: [
    {
      entityRef: 'application/cli/writers/context-level-writer',
      type: 'background-worker',
      name: 'Context Level Writer',
    },
  ],
  dependencies: [
    {
      from: 'application/cli/writers/context-level-writer',
      to: 'application/cli/vhs/cli-demo-test',
      type: 'direct-call',
    },
  ],
};

const loadedSystems = [
  { path: 'containers.yaml', name: 'Containers', schema: containerSchema },
  { path: 'vhs-components.yaml', name: 'Vhs', schema: vhsComponents },
  { path: 'writers-components.yaml', name: 'Writers', schema: writersComponents },
];

describe('workspaceExternals', () => {
  describe('buildWorkspaceEntityIndex', () => {
    it('indexes every node across workspace schemas', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      expect(index.byRef.get('application/cli/analysis')).toMatchObject({
        name: 'Analysis Service',
        sourceSchemaLevel: 'container',
        sourcePath: 'containers.yaml',
      });
      expect(index.byRef.get('application/cli/writers/context-level-writer')).toMatchObject({
        sourceSchemaLevel: 'component',
        sourcePath: 'writers-components.yaml',
      });
    });
  });

  describe('buildWorkspaceFilepathIndex', () => {
    it('indexes entities by normalized properties.filepath across workspace schemas', () => {
      const systems = [
        {
          path: 'a.yaml',
          name: 'A',
          schema: {
            name: 'A',
            version: '1.0.0',
            level: 'component' as const,
            entityRef: 'sys/a',
            nodes: [
              {
                entityRef: 'sys/a/one',
                type: 'component' as const,
                name: 'One',
                properties: { filepath: './src/one.ts' },
              },
            ],
            dependencies: [],
          },
        },
        {
          path: 'b.yaml',
          name: 'B',
          schema: {
            name: 'B',
            version: '1.0.0',
            level: 'component' as const,
            entityRef: 'sys/b',
            nodes: [
              {
                entityRef: 'sys/b/two',
                type: 'component' as const,
                name: 'Two',
                properties: { filepath: 'src\\two.ts' },
              },
            ],
            dependencies: [],
          },
        },
      ];

      const index = buildWorkspaceFilepathIndex(systems);
      expect(index.byPath.get('src/one.ts')).toMatchObject({
        entityRef: 'sys/a/one',
        name: 'One',
      });
      expect(index.byPath.get('src/two.ts')).toMatchObject({
        entityRef: 'sys/b/two',
        name: 'Two',
      });
    });
  });

  describe('listExternalCandidates', () => {
    it('lists sibling containers and cross-container components for a component diagram', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const candidates = listExternalCandidates(vhsComponents, index, {});

      const refs = candidates.map(c => c.entityRef);
      expect(refs).toContain('application/cli/analysis');
      expect(refs).toContain('application/cli/writers/context-level-writer');
      expect(refs).not.toContain('application/cli/vhs/cli-demo-test');
      expect(refs).not.toContain('application/cli/vhs');
    });

    it('lists cross-container components on container diagrams', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const active: SystemSchema = {
        ...containerSchema,
        nodes: [containerSchema.nodes[0]],
      };
      const candidates = listExternalCandidates(active, index, {});
      const refs = candidates.map(c => c.entityRef);
      expect(refs).toContain('application/cli/writers/context-level-writer');
      expect(refs).not.toContain('application/cli/vhs');
    });

    it('filters by source schema level', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const containersOnly = listExternalCandidates(vhsComponents, index, {
        sourceSchemaLevels: ['container'],
      });
      expect(containersOnly.every(c => c.sourceSchemaLevel === 'container')).toBe(true);
      expect(containersOnly.map(c => c.entityRef)).toContain('application/cli/analysis');

      const componentsOnly = listExternalCandidates(vhsComponents, index, {
        sourceSchemaLevels: ['component'],
      });
      expect(componentsOnly.every(c => c.sourceSchemaLevel === 'component')).toBe(true);
      expect(componentsOnly.map(c => c.entityRef)).toContain(
        'application/cli/writers/context-level-writer'
      );
    });

    it('filters by node type and search text', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const filtered = listExternalCandidates(vhsComponents, index, {
        types: ['background-worker'],
        search: 'writer',
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].entityRef).toBe('application/cli/writers/context-level-writer');
    });

    it('excludes entities already on the active diagram', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const active: SystemSchema = {
        ...vhsComponents,
        nodes: [
          ...vhsComponents.nodes,
          {
            entityRef: 'application/cli/analysis',
            type: 'container',
            name: 'Analysis Service (External)',
            external: true,
          },
        ],
      };
      const candidates = listExternalCandidates(active, index, {});
      expect(candidates.map(c => c.entityRef)).not.toContain('application/cli/analysis');
    });
  });

  describe('materializeExternalNodes', () => {
    it('creates external proxy nodes with canonical refs and layout positions', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const entity = index.byRef.get('application/cli/analysis')!;
      const [node] = materializeExternalNodes([entity], [{ x: 200, y: 300 }]);

      expect(node).toMatchObject({
        entityRef: 'application/cli/analysis',
        type: 'container',
        external: true,
        position: { x: 200, y: 300 },
      });
      expect(node.name).toContain('Analysis Service');
      expect(node.name).toContain('External');
    });
  });

  describe('suggestExternalDependencies', () => {
    it('suggests related containers from parent container diagram', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const suggested = suggestExternalDependencies(vhsComponents, loadedSystems, index);
      expect(suggested.map(s => s.entityRef)).toContain('application/cli/analysis');
    });

    it('suggests cross-container components referenced from other diagrams', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const suggested = suggestExternalDependencies(vhsComponents, loadedSystems, index);
      expect(suggested.map(s => s.entityRef)).toContain(
        'application/cli/writers/context-level-writer'
      );
    });

    it('suggests unresolved dependency endpoints in the active schema', () => {
      const active: SystemSchema = {
        ...vhsComponents,
        dependencies: [
          {
            from: 'application/cli/vhs/cli-demo-test',
            to: 'application/cli/analysis',
            type: 'direct-call',
          },
        ],
      };
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const suggested = suggestExternalDependencies(active, loadedSystems, index);
      expect(suggested.map(s => s.entityRef)).toContain('application/cli/analysis');
    });
  });

  describe('directional external layout', () => {
    it('assigns saved y positions when enriching a schema with externals', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const enriched = enrichSchemaWithExternals(vhsComponents, loadedSystems, index);
      const externals = enriched.nodes.filter(n => n.external);
      expect(externals.length).toBeGreaterThan(0);
      expect(externals.every(n => Number.isFinite(getNodePosition(n)?.y))).toBe(true);
    });
  });

  describe('enrichSchemaWithExternals', () => {
    it('materializes suggested cross-container components and neighbor containers', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const enriched = enrichSchemaWithExternals(vhsComponents, loadedSystems, index);

      const byRef = new Map(enriched.nodes.map(n => [n.entityRef, n]));
      expect(byRef.get('application/cli/analysis')).toMatchObject({
        external: true,
        type: 'container',
      });
      expect(byRef.get('application/cli/writers/context-level-writer')).toMatchObject({
        external: true,
        type: 'background-worker',
      });
      expect(byRef.get('application/cli/vhs/cli-demo-test')?.external).toBeFalsy();
      expect(enriched.nodes.filter(n => !n.external)).toHaveLength(vhsComponents.nodes.length);
    });

    it('is idempotent when externals are already present', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const once = enrichSchemaWithExternals(vhsComponents, loadedSystems, index);
      const twice = enrichSchemaWithExternals(once, loadedSystems, index);
      expect(twice.nodes.map(n => n.entityRef).sort()).toEqual(
        once.nodes.map(n => n.entityRef).sort()
      );
      expect(twice.nodes.filter(n => n.external).every(n => n.external === true)).toBe(true);
    });

    it('on container diagrams only materializes container-level externals', () => {
      const active: SystemSchema = {
        ...containerSchema,
        nodes: [containerSchema.nodes[0]],
        dependencies: [
          {
            from: 'application/cli/vhs',
            to: 'application/cli/analysis',
            type: 'inter-container',
          },
        ],
      };
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const enriched = enrichSchemaWithExternals(active, loadedSystems, index);

      const externals = enriched.nodes.filter(n => n.external);
      expect(externals.every(n => n.type === 'container')).toBe(true);
      expect(externals.map(n => n.entityRef)).toContain('application/cli/analysis');
      expect(externals.map(n => n.entityRef)).not.toContain(
        'application/cli/writers/context-level-writer'
      );
    });

    it('on context diagrams never materializes component-level noise', () => {
      const contextSchema: SystemSchema = {
        entityRef: 'blueprint',
        name: 'Blueprint',
        version: '1.0.0',
        level: 'context',
        nodes: [
          {
            entityRef: 'application/cli',
            type: 'software-system',
            name: 'Cli System',
          },
        ],
        dependencies: [
          {
            from: 'application/cli',
            to: 'application/cli/vhs/cli-demo-test',
            type: 'direct-call',
          },
        ],
      };
      const loaded = [
        ...loadedSystems,
        { path: 'context.yaml', name: 'Context', schema: contextSchema },
      ];
      const index = buildWorkspaceEntityIndex(loaded);
      const enriched = enrichSchemaWithExternals(contextSchema, loaded, index);

      expect(enriched.nodes.every(n => !n.external || n.type === 'software-system')).toBe(true);
      expect(enriched.nodes.map(n => n.entityRef)).not.toContain(
        'application/cli/vhs/cli-demo-test'
      );
    });

    it('unresolved mode only adds dangling dependency endpoints', () => {
      const active: SystemSchema = {
        ...vhsComponents,
        dependencies: [
          {
            from: 'application/cli/vhs/cli-demo-test',
            to: 'application/cli/analysis',
            type: 'direct-call',
          },
        ],
      };
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const enriched = enrichSchemaWithExternals(active, loadedSystems, index, {
        mode: 'unresolved',
      });

      const externalRefs = enriched.nodes.filter(n => n.external).map(n => n.entityRef);
      expect(externalRefs).toEqual(['application/cli/analysis']);
    });

    it('skips context schemas when enrichLevels excludes them', () => {
      const contextSchema: SystemSchema = {
        entityRef: 'blueprint',
        name: 'Blueprint',
        version: '1.0.0',
        level: 'context',
        nodes: [{ entityRef: 'application/cli', type: 'software-system', name: 'Cli' }],
        dependencies: [],
      };
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const enriched = enrichSchemaWithExternals(contextSchema, loadedSystems, index, {
        enrichLevels: ['component', 'container'],
      });
      expect(enriched).toBe(contextSchema);
    });
  });

  describe('enrichWorkspaceWithExternals', () => {
    it('enriches every schema using a shared workspace index', () => {
      const result = enrichWorkspaceWithExternals(loadedSystems);
      const writers = result.find(s => s.path === 'writers-components.yaml')!.schema;
      const vhs = result.find(s => s.path === 'vhs-components.yaml')!.schema;

      expect(writers.nodes.some(n => n.entityRef === 'application/cli/vhs/cli-demo-test')).toBe(
        true
      );
      expect(
        writers.nodes.find(n => n.entityRef === 'application/cli/vhs/cli-demo-test')?.external
      ).toBe(true);
      expect(vhs.nodes.some(n => n.entityRef === 'application/cli/analysis' && n.external)).toBe(
        true
      );
    });

    it('rolls component-level cross-container deps up onto the container diagram', () => {
      const sparseContainers: SystemSchema = {
        ...containerSchema,
        nodes: [containerSchema.nodes[0]],
        dependencies: [],
      };
      const systems = [
        { path: 'containers.yaml', name: 'Containers', schema: sparseContainers },
        { path: 'vhs-components.yaml', name: 'Vhs', schema: vhsComponents },
        { path: 'writers-components.yaml', name: 'Writers', schema: writersComponents },
      ];

      const result = enrichWorkspaceWithExternals(systems, {
        mode: 'unresolved',
        enrichLevels: ['component', 'container'],
      });
      const containers = result.find(s => s.path === 'containers.yaml')!.schema;

      const edge = containers.dependencies.find(
        d => d.from === 'application/cli/writers' && d.to === 'application/cli/vhs'
      );
      expect(edge).toMatchObject({
        type: 'inter-container',
      });
      expect(edge?.description).toContain('Context Level Writer');
      expect(edge?.description).toContain('cli-demo.test Service');
      expect(containers.nodes.find(n => n.entityRef === 'application/cli/writers')).toMatchObject({
        external: true,
        type: 'container',
      });
    });

    it('adds service-level coupling edges and external component proxies on container diagrams', () => {
      const storefrontContainers: SystemSchema = {
        entityRef: 'chaoslens-stress/external-scope',
        name: 'Storefront Containers',
        version: '1.0.0',
        level: 'container',
        nodes: [
          {
            entityRef: 'chaoslens-stress/external-scope/web',
            type: 'web-app',
            name: 'Web Storefront',
          },
          {
            entityRef: 'chaoslens-stress/external-scope/api',
            type: 'rest-api',
            name: 'API Gateway',
          },
        ],
        dependencies: [],
      };

      const storefrontComponents: SystemSchema = {
        entityRef: 'chaoslens-stress/external-scope',
        name: 'Storefront Components',
        version: '1.0.0',
        level: 'component',
        nodes: [
          {
            entityRef: 'chaoslens-stress/external-scope/api/gateway',
            type: 'rest-api',
            name: 'Gateway Handler',
          },
        ],
        dependencies: [
          {
            from: 'chaoslens-stress/external-scope/api/gateway',
            to: 'chaoslens-stress/external-auth/auth',
            type: 'direct-call',
          },
        ],
      };

      const authComponents: SystemSchema = {
        entityRef: 'chaoslens-stress/external-auth',
        name: 'Auth Components',
        version: '1.0.0',
        level: 'component',
        nodes: [
          {
            entityRef: 'chaoslens-stress/external-auth/auth',
            type: 'microservice',
            name: 'Auth Service',
          },
        ],
        dependencies: [],
      };

      const systems = [
        {
          path: 'chaoslens-stress/external-scope-containers.yaml',
          name: 'Storefront',
          schema: storefrontContainers,
        },
        {
          path: 'chaoslens-stress/external-scope-components.yaml',
          name: 'Storefront Components',
          schema: storefrontComponents,
        },
        {
          path: 'chaoslens-stress/external-auth-components.yaml',
          name: 'Auth Components',
          schema: authComponents,
        },
      ];

      const result = enrichWorkspaceWithExternals(systems, {
        mode: 'unresolved',
        enrichLevels: ['component', 'container'],
      });
      const storefront = result.find(
        s => s.path === 'chaoslens-stress/external-scope-containers.yaml'
      )!.schema;

      expect(storefront.dependencies).toContainEqual(
        expect.objectContaining({
          from: 'chaoslens-stress/external-scope/api',
          to: 'chaoslens-stress/external-auth/auth',
          type: 'direct-call',
        })
      );
      expect(
        storefront.nodes.find(
          n => n.entityRef === 'chaoslens-stress/external-auth/auth' && n.external
        )
      ).toMatchObject({
        name: expect.stringContaining('External'),
      });
    });
  });
});
