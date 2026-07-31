import { describe, it, expect } from 'vitest';
import {
  buildWorkspaceCatalog,
  buildCatalogAncestorChain,
  listChildDiagramExternals,
  mergeWorkspaceCatalogEntries,
  resolveChildDiagramEntry,
  resolveEntityHome,
} from './workspaceCatalog';
import type { SystemSchema } from '../models/schema';

describe('workspaceCatalog', () => {
  it('treats sibling context diagrams as peers without a shared parent context', () => {
    const application: SystemSchema = {
      name: 'Application',
      version: '1.0.0',
      level: 'context',
      entityRef: 'application',
      nodes: [{ entityRef: 'eshop', type: 'software-system', name: 'Eshop' }],
      dependencies: [],
    };
    const goldenPaths: SystemSchema = {
      name: 'Golden Paths',
      version: '1.0.0',
      level: 'context',
      entityRef: 'golden-paths',
      nodes: [],
      dependencies: [],
    };
    const infrastructure: SystemSchema = {
      name: 'Infrastructure',
      version: '1.0.0',
      level: 'context',
      entityRef: 'infrastructure',
      nodes: [],
      dependencies: [],
    };
    const eshopContainers: SystemSchema = {
      name: 'Eshop Containers',
      version: '1.0.0',
      level: 'container',
      entityRef: 'eshop',
      nodes: [],
      dependencies: [],
    };

    const catalog = buildWorkspaceCatalog([
      { path: 'application/context.yaml', schema: application },
      { path: 'golden-journey/context.yaml', schema: goldenPaths },
      { path: 'infrastructure/context.yaml', schema: infrastructure },
      { path: 'eshop/containers.yaml', schema: eshopContainers },
    ]);

    expect(catalog.find(e => e.entityRef === 'golden-paths')?.parentEntityRef).toBeUndefined();
    expect(catalog.find(e => e.entityRef === 'infrastructure')?.parentEntityRef).toBeUndefined();
    expect(catalog.find(e => e.entityRef === 'application')?.parentEntityRef).toBeUndefined();
    expect(catalog.find(e => e.entityRef === 'eshop')?.parentEntityRef).toBe('application');
  });

  it('builds ancestor chains from catalog parent links', () => {
    const application: SystemSchema = {
      name: 'Application',
      version: '1.0.0',
      level: 'context',
      entityRef: 'application',
      nodes: [{ entityRef: 'eshop', type: 'software-system', name: 'Eshop' }],
      dependencies: [],
    };
    const eshopContainers: SystemSchema = {
      name: 'Eshop Containers',
      version: '1.0.0',
      level: 'container',
      entityRef: 'eshop',
      nodes: [],
      dependencies: [],
    };
    const catalog = buildWorkspaceCatalog([
      { path: 'application/context.yaml', schema: application },
      { path: 'eshop/containers.yaml', schema: eshopContainers },
    ]);

    expect(buildCatalogAncestorChain(catalog, 'eshop').map(entry => entry.entityRef)).toEqual([
      'application',
      'eshop',
    ]);
  });

  it('derives entityRef from schema name when missing', () => {
    const orphan: SystemSchema = {
      name: 'Orphan System',
      version: '1.0.0',
      level: 'container',
      nodes: [],
      dependencies: [],
    };
    const catalog = buildWorkspaceCatalog([{ path: 'orphan.yaml', schema: orphan }]);
    expect(catalog[0]?.entityRef).toBe('orphan-system');
  });

  describe('resolveEntityHome', () => {
    const context: SystemSchema = {
      name: 'Context',
      version: '1.0.0',
      level: 'context',
      nodes: [{ entityRef: 'billing', type: 'software-system', name: 'Billing' }],
      dependencies: [],
    };
    const containers: SystemSchema = {
      name: 'Billing Containers',
      version: '1.0.0',
      level: 'container',
      entityRef: 'billing',
      nodes: [{ entityRef: 'billing/api', type: 'microservice', name: 'API' }],
      dependencies: [],
    };
    const catalog = buildWorkspaceCatalog([
      { path: 'context.yaml', schema: context },
      { path: 'containers.yaml', schema: containers },
    ]);

    it('returns the diagram entry when entityRef is a diagram identity', () => {
      expect(resolveEntityHome(catalog, 'billing')?.path).toBe('containers.yaml');
    });

    it('returns the owning diagram when entityRef is a native node', () => {
      expect(resolveEntityHome(catalog, 'billing/api')?.path).toBe('containers.yaml');
    });

    it('returns undefined when entityRef is not in the workspace', () => {
      expect(resolveEntityHome(catalog, 'missing/service')).toBeUndefined();
      expect(resolveEntityHome(catalog, '')).toBeUndefined();
    });

    it('ignores external proxy nodes when resolving the canonical home diagram', () => {
      const notifications: SystemSchema = {
        name: 'Notifications Components',
        version: '1.0.0',
        level: 'component',
        entityRef: 'backstage/plugins/notifications',
        nodes: [
          {
            entityRef: 'backstage/plugins/techdocs-react/api',
            type: 'component',
            name: 'api Service (External)',
            external: true,
          },
        ],
        dependencies: [],
      };
      const techdocs: SystemSchema = {
        name: 'Techdocs Components',
        version: '1.0.0',
        level: 'component',
        entityRef: 'backstage/plugins/techdocs-react',
        nodes: [
          {
            entityRef: 'backstage/plugins/techdocs-react/api',
            type: 'component',
            name: 'api Service',
          },
        ],
        dependencies: [],
      };

      const proxyCatalog = buildWorkspaceCatalog([
        { path: 'plugins/notifications-components.yaml', schema: notifications },
        { path: 'plugins/techdocs-react-components.yaml', schema: techdocs },
      ]);

      expect(resolveEntityHome(proxyCatalog, 'backstage/plugins/techdocs-react/api')?.path).toBe(
        'plugins/techdocs-react-components.yaml'
      );
    });
  });

  describe('resolveChildDiagramEntry', () => {
    const context: SystemSchema = {
      name: 'Context',
      version: '1.0.0',
      level: 'context',
      nodes: [{ entityRef: 'billing', type: 'software-system', name: 'Billing' }],
      dependencies: [],
    };
    const containers: SystemSchema = {
      name: 'Billing Containers',
      version: '1.0.0',
      level: 'container',
      entityRef: 'billing',
      nodes: [
        { entityRef: 'billing/api', type: 'microservice', name: 'API' },
        {
          entityRef: 'billing/legacy',
          type: 'microservice',
          name: 'Legacy (External)',
          external: true,
        },
      ],
      dependencies: [],
    };
    const catalog = buildWorkspaceCatalog([
      { path: 'context.yaml', schema: context },
      { path: 'containers.yaml', schema: containers },
    ]);
    const loadedSystems = [
      { path: 'context.yaml', schema: context },
      { path: 'containers.yaml', schema: containers },
    ];

    it('returns the child diagram entry for a parent node entityRef', () => {
      expect(resolveChildDiagramEntry(catalog, 'billing')?.path).toBe('containers.yaml');
    });

    it('returns undefined when no child diagram exists', () => {
      expect(resolveChildDiagramEntry(catalog, 'missing')).toBeUndefined();
    });

    it('lists external nodes on the child diagram', () => {
      expect(listChildDiagramExternals(catalog, loadedSystems, 'billing')).toEqual([
        {
          entityRef: 'billing/legacy',
          name: 'Legacy (External)',
          type: 'microservice',
        },
      ]);
    });

    it('returns an empty list when the child diagram has no externals', () => {
      const emptyChild: SystemSchema = {
        ...containers,
        nodes: [{ entityRef: 'billing/api', type: 'microservice', name: 'API' }],
      };
      const systems = [
        { path: 'context.yaml', schema: context },
        { path: 'containers.yaml', schema: emptyChild },
      ];
      expect(listChildDiagramExternals(catalog, systems, 'billing')).toEqual([]);
    });
  });

  describe('mergeWorkspaceCatalogEntries', () => {
    it('keeps path stubs when lazy load only has a subset of diagrams', () => {
      const base = [
        {
          path: 'context.yaml',
          name: 'Context',
          level: 'context' as const,
          entityRef: 'billing',
          nodeEntityRefs: [],
        },
        {
          path: 'containers.yaml',
          name: 'Containers',
          level: 'container' as const,
          entityRef: 'billing/api',
          nodeEntityRefs: [],
        },
      ];
      const loaded = [
        {
          path: 'context.yaml',
          name: 'Context',
          level: 'context' as const,
          entityRef: 'billing',
          nodeEntityRefs: ['billing/api'],
        },
      ];

      const merged = mergeWorkspaceCatalogEntries(base, loaded);
      expect(merged).toHaveLength(2);
      expect(merged.find(e => e.path === 'containers.yaml')?.entityRef).toBe('billing/api');
      expect(merged.find(e => e.path === 'context.yaml')?.nodeEntityRefs).toEqual(['billing/api']);
    });
  });
});
