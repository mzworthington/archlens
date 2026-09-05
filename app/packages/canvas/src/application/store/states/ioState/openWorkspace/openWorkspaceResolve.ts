import type { SystemSchema, WorkspaceCatalogEntry } from '@archlens/core';
import { resolveWorkspaceEntityRefs, systemSchemaPublicUrl } from '@archlens/core';
import type { LoadedSystem } from './openWorkspaceTypes';

export function resolveEntryAgainstCatalog(
  path: string,
  schema: SystemSchema,
  catalog: WorkspaceCatalogEntry[],
  workspaceName: string,
  loadedSystems: LoadedSystem[] = []
) {
  const filesForResolve: Array<{ path: string; schema: SystemSchema }> = [
    ...loadedSystems.map(s => ({ path: s.path, schema: s.schema })),
    { path, schema },
  ];

  const catalogEntry = catalog.find(e => e.path === path);
  const contextEntry =
    (catalogEntry?.parentEntityRef
      ? catalog.find(e => e.level === 'context' && e.entityRef === catalogEntry.parentEntityRef)
      : undefined) ||
    catalog.find(e => e.level === 'context' && path.startsWith(`${e.path.split('/')[0]}/`)) ||
    catalog.find(e => e.level === 'context');
  if (
    contextEntry &&
    !filesForResolve.some(f => f.path === contextEntry.path) &&
    path !== contextEntry.path
  ) {
    filesForResolve.unshift({
      path: contextEntry.path,
      schema: {
        name: contextEntry.name,
        version: systemSchemaPublicUrl(),
        level: 'context',
        entityRef: contextEntry.entityRef,
        nodes: contextEntry.nodeEntityRefs.map(entityRef => ({
          entityRef,
          type: 'software-system',
          name: entityRef,
        })),
        dependencies: [],
      },
    });
  }

  return resolveWorkspaceEntityRefs(filesForResolve, workspaceName);
}
