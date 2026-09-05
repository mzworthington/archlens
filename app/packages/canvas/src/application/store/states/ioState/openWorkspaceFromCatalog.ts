import type { SystemSchema, WorkspaceCatalogEntry } from '@archlens/core';
import {
  parseSchemaFromYaml,
  resolveWorkspaceEntityRefs,
  systemSchemaPublicUrl,
} from '@archlens/core';
import { isWorkspaceOpenCurrent } from '../../workspaceOpenSession';
import {
  finalizeWorkspaceOpen,
  type LoadedSystem,
  type WorkspaceOpenSink,
} from './openWorkspaceShared';

export type LoadWorkspaceFromCatalogDeps = WorkspaceOpenSink & {
  catalog: WorkspaceCatalogEntry[];
  entryPath: string;
  readFile: (relativePath: string) => Promise<string>;
  getDirectoryName: () => string;
  isSampleWorkspace?: boolean;
  /** When set, finalize is skipped if a newer open started. */
  openGeneration?: number;
  /** Extra store fields applied atomically with finalize (e.g. workspace ports). */
  committedPorts?: Record<string, unknown>;
};

/** Resolve one diagram against already-loaded schemas + optional catalog context stub. */
function resolveEntryAgainstCatalog(
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

/**
 * Open a workspace from a prebuilt navigation catalog + a single entry YAML fetch.
 * Used by remote/published catalogs so open does not download every blueprint file.
 */
export async function loadWorkspaceFromCatalog(
  deps: LoadWorkspaceFromCatalogDeps
): Promise<boolean> {
  const {
    catalog,
    entryPath,
    logger,
    setNotification,
    initSchema,
    set,
    isSampleWorkspace = false,
    openGeneration,
    committedPorts,
  } = deps;

  logger.info('Opening workspace from prebuilt catalog', {
    catalogSize: catalog.length,
    entryPath,
    isSampleWorkspace,
  });

  if (catalog.length === 0) {
    throw new Error('Bundled blueprints catalog is empty');
  }

  const catalogEntry = catalog.find(entry => entry.path === entryPath);
  if (!catalogEntry) {
    throw new Error(`Entry diagram missing from bundled catalog: ${entryPath}`);
  }

  if (openGeneration != null && !isWorkspaceOpenCurrent(openGeneration)) return false;

  const workspaceName = deps.getDirectoryName();
  const content = await deps.readFile(entryPath);
  if (openGeneration != null && !isWorkspaceOpenCurrent(openGeneration)) return false;

  const schema = parseSchemaFromYaml(content);
  const name = schema.name || catalogEntry.name;
  const resolved = resolveEntryAgainstCatalog(entryPath, schema, catalog, workspaceName);
  const resolvedSchema = resolved.schemas[entryPath] || schema;
  const entryCandidate: LoadedSystem = { path: entryPath, name, schema: resolvedSchema };

  return finalizeWorkspaceOpen({
    entryCandidate,
    resolved,
    workspaceCatalog: catalog,
    workspaceName,
    isSampleWorkspace,
    openGeneration,
    committedPorts,
    workingCopy: deps.workingCopy,
    logger,
    setNotification,
    initSchema,
    set,
  });
}
