import { parseSchemaFromYaml } from '@archlens/core';
import { isWorkspaceOpenCurrent } from '../../workspaceOpenSession';
import { finalizeWorkspaceOpen } from './openWorkspaceFinalize';
import { resolveEntryAgainstCatalog } from './openWorkspaceResolve';
import type { LoadWorkspaceFromCatalogDeps, LoadedSystem } from './openWorkspaceTypes';

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
