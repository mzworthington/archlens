import { describe, it, expect } from 'vitest';
import {
  resolveWorkspaceEntityRefs,
  isEntityRef,
  getSchemaEntityRef,
  resolveShortEntityRef,
  buildBreadcrumbSegments,
  deriveSharedContextNamespace,
  entityRefParentPrefix,
  NEXT_C4_LEVEL,
} from './entityRef';
import type { SystemSchema } from '../models/schema';

describe('entityRef Rules', () => {
  describe('isEntityRef', () => {
    it('should identify valid entity references and filter out file paths', () => {
      expect(isEntityRef('backstage/catalog')).toBe(true);
      expect(isEntityRef('eshop/eshop-ordering')).toBe(true);
      expect(isEntityRef('./catalog-components.yaml')).toBe(false);
      expect(isEntityRef('../containers.yaml')).toBe(false);
      expect(isEntityRef('/usr/local/bin')).toBe(false);
      expect(isEntityRef(undefined)).toBe(false);
    });
  });

  describe('getSchemaEntityRef', () => {
    it('should return id/entityRef if it is set', () => {
      const componentSchema: SystemSchema = {
        name: 'My Component',
        version: '1.0.0',
        level: 'component',
        entityRef: 'backstage/catalog',
        nodes: [],
        dependencies: [],
      };
      expect(getSchemaEntityRef(componentSchema)).toBe('backstage/catalog');
    });

    it('should fallback to workspaceName or schema.name when entityRef/id is default', () => {
      const schema: SystemSchema = {
        name: 'Test Project',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      };
      expect(getSchemaEntityRef(schema, 'My Workspace')).toBe('my-workspace');
      expect(getSchemaEntityRef(schema)).toBe('test-project');
    });
  });

  describe('resolveShortEntityRef', () => {
    it('should append short refs under a scoped systemId', () => {
      expect(resolveShortEntityRef('catalog', 'backstage/catalog')).toBe(
        'backstage/catalog/catalog'
      );
      expect(resolveShortEntityRef('catalog', 'mycontext/backstage')).toBe(
        'mycontext/backstage/catalog'
      );
    });

    it('should not double-prefix when systemId is the context root', () => {
      expect(resolveShortEntityRef('customer', 'blueprint', 'blueprint')).toBe(
        'blueprint/customer'
      );
    });

    it('should prefix with context when systemId is a local container slug', () => {
      expect(resolveShortEntityRef('catalog', 'backstage', 'mycontext')).toBe(
        'mycontext/backstage/catalog'
      );
    });

    it('should pass through existing FQNs', () => {
      expect(resolveShortEntityRef('application/customer', 'blueprint', 'blueprint')).toBe(
        'application/customer'
      );
    });
  });

  describe('entityRefParentPrefix', () => {
    it('returns the parent prefix for nested entityRefs', () => {
      expect(entityRefParentPrefix('backstage/packages/core', 'blueprint')).toBe(
        'backstage/packages'
      );
    });

    it('returns the context root for top-level container entityRefs', () => {
      expect(entityRefParentPrefix('enterprise/main-app', 'enterprise')).toBe('enterprise');
    });

    it('returns undefined for the context diagram itself', () => {
      expect(entityRefParentPrefix('enterprise', 'enterprise')).toBeUndefined();
    });
  });

  describe('deriveSharedContextNamespace', () => {
    it('returns the sole context entityRef when only one context diagram exists', () => {
      expect(deriveSharedContextNamespace(['application'])).toBe('application');
    });

    it('returns undefined when sibling contexts have no shared namespace prefix', () => {
      expect(
        deriveSharedContextNamespace(['application', 'infrastructure', 'golden-paths'])
      ).toBeUndefined();
    });
  });

  describe('buildBreadcrumbSegments', () => {
    it('builds ancestor and current segments from entityRef prefixes', () => {
      expect(
        buildBreadcrumbSegments({
          entityRef: 'backstage/packages/core',
          currentName: 'Core Service Components',
          currentPath: 'packages/core-components.yaml',
          currentLevel: 'component',
          namesByEntityRef: {
            blueprint: 'Blueprint',
            'backstage/packages': 'Packages System',
          },
        }).map(seg => seg.entityRef)
      ).toEqual(['backstage', 'backstage/packages', 'backstage/packages/core']);
    });

    it('assigns C4 levels from entityRef depth', () => {
      expect(
        buildBreadcrumbSegments({
          entityRef: 'backstage/packages/core',
          currentName: 'Core',
          currentPath: 'core.yaml',
          currentLevel: 'component',
        }).map(seg => seg.level)
      ).toEqual(['context', 'container', 'component']);
    });

    it('appends a zoom preview segment when provided', () => {
      const segments = buildBreadcrumbSegments({
        entityRef: 'blueprint',
        currentName: 'Context',
        currentPath: 'context.yaml',
        currentLevel: 'context',
        zoomPreview: {
          name: 'Cli System',
          entityRef: 'application/cli',
          path: 'containers.yaml',
          level: 'container',
        },
      });
      expect(segments.at(-1)).toMatchObject({
        entityRef: 'application/cli',
        isZoomPreview: true,
      });
    });
  });

  describe('NEXT_C4_LEVEL', () => {
    it('maps each C4 level to the next', () => {
      expect(NEXT_C4_LEVEL.context).toBe('container');
      expect(NEXT_C4_LEVEL.container).toBe('component');
      expect(NEXT_C4_LEVEL.component).toBe('code');
    });
  });

  describe('resolveWorkspaceEntityRefs', () => {
    it('should correctly resolve FQN references across container and component hierarchies', () => {
      // 1. Container-level schema
      const containerSchema: SystemSchema = {
        name: 'Backstage - Container Level',
        version: '1.0.0',
        level: 'container',
        entityRef: 'backstage',
        nodes: [
          {
            entityRef: 'catalog',
            type: 'background-worker',
            name: 'Catalog Service',
          },
          {
            entityRef: 'search',
            type: 'background-worker',
            name: 'Search Service',
          },
        ],
        dependencies: [],
      };

      // 2. Component-level schema for Catalog
      const catalogSchema: SystemSchema = {
        name: 'Backstage - catalog Components',
        version: '1.0.0',
        level: 'component',
        entityRef: 'backstage/catalog',
        nodes: [
          {
            entityRef: 'immediateentityprovider',
            type: 'rest-api',
            name: 'ImmediateEntityProvider REST Endpoint',
          },
          { entityRef: 'catalogclient', type: 'background-worker', name: 'CatalogClient service' },
        ],
        dependencies: [
          { from: 'catalogclient', to: 'immediateentityprovider', type: 'direct-call' },
        ],
      };

      // 3. Loose/Orphan component-level schema
      const orphanSchema: SystemSchema = {
        name: 'Orphan Components',
        version: '1.0.0',
        level: 'component',
        entityRef: 'backstage/orphan',
        nodes: [{ entityRef: 'helper', type: 'background-worker', name: 'Helper service' }],
        dependencies: [
          { from: 'helper', to: 'catalogclient', type: 'direct-call' }, // external dep
        ],
      };

      const workspaceFiles = [
        { path: 'blueprints/backstage/containers.yaml', schema: containerSchema },
        { path: 'blueprints/backstage/catalog-components.yaml', schema: catalogSchema },
        { path: 'blueprints/backstage/orphan-components.yaml', schema: orphanSchema },
      ];

      const result = resolveWorkspaceEntityRefs(workspaceFiles);

      // Verify node FQN mappings
      const catalogNodes = result.schemas['blueprints/backstage/catalog-components.yaml'].nodes;
      expect(catalogNodes[0].entityRef).toBe('backstage/catalog/immediateentityprovider');
      expect(catalogNodes[1].entityRef).toBe('backstage/catalog/catalogclient');

      const containerNodes = result.schemas['blueprints/backstage/containers.yaml'].nodes;
      expect(containerNodes[0].entityRef).toBe('backstage/catalog');
      expect(containerNodes[1].entityRef).toBe('backstage/search');

      const orphanNodes = result.schemas['blueprints/backstage/orphan-components.yaml'].nodes;
      expect(orphanNodes[0].entityRef).toBe('backstage/orphan/helper');

      // Verify node FQN lookup map
      expect(
        result.nodeRefMap['blueprints/backstage/catalog-components.yaml']['catalogclient']
      ).toBe('backstage/catalog/catalogclient');
      expect(result.nodeRefMap['blueprints/backstage/orphan-components.yaml']['helper']).toBe(
        'backstage/orphan/helper'
      );
    });

    it('should correctly resolve FQN references using schema entityRef parent linkage', () => {
      // 1. Container-level schema
      const containerSchema: SystemSchema = {
        name: 'Backstage - Container Level',
        version: '1.0.0',
        level: 'container',
        entityRef: 'backstage',
        nodes: [
          { entityRef: 'catalog', type: 'background-worker', name: 'Catalog Service' },
          { entityRef: 'search', type: 'background-worker', name: 'Search Service' },
        ],
        dependencies: [],
      };

      // 2. Component-level schema for Catalog
      const catalogSchema: SystemSchema = {
        name: 'Backstage - catalog Components',
        version: '1.0.0',
        level: 'component',
        entityRef: 'backstage/catalog',
        nodes: [
          {
            entityRef: 'immediateentityprovider',
            type: 'rest-api',
            name: 'ImmediateEntityProvider REST Endpoint',
          },
          { entityRef: 'catalogclient', type: 'background-worker', name: 'CatalogClient service' },
        ],
        dependencies: [
          { from: 'catalogclient', to: 'immediateentityprovider', type: 'direct-call' },
        ],
      };

      const workspaceFiles = [
        { path: 'blueprints/backstage/containers.yaml', schema: containerSchema },
        { path: 'blueprints/backstage/catalog-components.yaml', schema: catalogSchema },
      ];

      const result = resolveWorkspaceEntityRefs(workspaceFiles);

      // Verify node FQN mappings
      const catalogNodes = result.schemas['blueprints/backstage/catalog-components.yaml'].nodes;
      expect(catalogNodes[0].entityRef).toBe('backstage/catalog/immediateentityprovider');
      expect(catalogNodes[1].entityRef).toBe('backstage/catalog/catalogclient');

      const containerNodes = result.schemas['blueprints/backstage/containers.yaml'].nodes;
      expect(containerNodes[0].entityRef).toBe('backstage/catalog');
      expect(containerNodes[1].entityRef).toBe('backstage/search');
    });

    it('should prefix all levels with context slug when a context file is present', () => {
      const contextSchema: SystemSchema = {
        name: 'My Workspace Context',
        version: '1.0.0',
        level: 'context',
        entityRef: 'mycontext',
        nodes: [{ entityRef: 'backstage', type: 'software-system', name: 'Backstage' }],
        dependencies: [],
      };

      const containerSchema: SystemSchema = {
        name: 'Backstage - Container Level',
        version: '1.0.0',
        level: 'container',
        entityRef: 'mycontext/backstage',
        nodes: [{ entityRef: 'catalog', type: 'background-worker', name: 'Catalog Service' }],
        dependencies: [],
      };

      const catalogSchema: SystemSchema = {
        name: 'Backstage - catalog Components',
        version: '1.0.0',
        level: 'component',
        entityRef: 'mycontext/backstage/catalog',
        nodes: [{ entityRef: 'catalogclient', type: 'background-worker', name: 'CatalogClient' }],
        dependencies: [],
      };

      const workspaceFiles = [
        { path: 'blueprints/MyContext-Context.yaml', schema: contextSchema },
        { path: 'blueprints/backstage/containers.yaml', schema: containerSchema },
        { path: 'blueprints/backstage/catalog-components.yaml', schema: catalogSchema },
      ];

      const result = resolveWorkspaceEntityRefs(workspaceFiles);

      const contextNodes = result.schemas['blueprints/MyContext-Context.yaml'].nodes;
      expect(contextNodes[0].entityRef).toBe('mycontext/backstage');

      const containerNodes = result.schemas['blueprints/backstage/containers.yaml'].nodes;
      expect(containerNodes[0].entityRef).toBe('mycontext/backstage/catalog');

      const catalogNodes = result.schemas['blueprints/backstage/catalog-components.yaml'].nodes;
      expect(catalogNodes[0].entityRef).toBe('mycontext/backstage/catalog/catalogclient');
    });

    it('should not double-prefix stale dependency refs on context diagrams', () => {
      const contextSchema: SystemSchema = {
        name: 'Blueprint',
        version: '1.0.0',
        level: 'context',
        entityRef: 'blueprint',
        nodes: [
          { entityRef: 'application/customer', type: 'person', name: 'Customer' },
          { entityRef: 'eshop', type: 'software-system', name: 'EShop' },
        ],
        dependencies: [{ from: 'person-5380', to: 'eshop', type: 'direct-call' }],
      };

      const result = resolveWorkspaceEntityRefs(
        [{ path: 'context.yaml', schema: contextSchema }],
        'Blueprint'
      );

      expect(result.schemas['context.yaml'].dependencies[0]?.from).toBe('blueprint/person-5380');
    });
  });
});
