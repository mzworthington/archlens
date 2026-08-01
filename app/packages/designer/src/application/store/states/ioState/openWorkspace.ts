import type { SystemSchema, WorkspaceCatalogEntry } from '@archlens/core';
import {
  parseSchemaFromYaml,
  resolveWorkspaceEntityRefs,
  buildWorkspaceCatalog,
  assessSchemaVersion,
} from '@archlens/core';
import type { WorkingCopyPort } from '../../../../core';
import { resolveSchemaOnWorkspaceOpen } from '../../../workspace/schemaCompare';

import type { ToastNotification } from '../uiState';

type LoadedSystem = { path: string; name: string; schema: SystemSchema };

type WorkspaceOpenLogger = {
  info: (m: string, meta?: Record<string, unknown>) => void;
  warn: (m: string, meta?: Record<string, unknown>) => void;
  error: (m: string, err?: unknown) => void;
};

type OpenWorkspaceDeps = {
  selectDirectory: () => Promise<boolean>;
  readDirectoryFiles: () => Promise<Array<{ name: string; content: string }>>;
  getDirectoryName: () => string;
  workingCopy: WorkingCopyPort;
  logger: WorkspaceOpenLogger;
  setNotification?: (n: ToastNotification | null) => void;
  initSchema: (schema: SystemSchema) => void;
  set: (partial: Record<string, unknown>) => void;
  isSampleWorkspace?: boolean;
};

export type LoadWorkspaceFromCatalogDeps = {
  catalog: WorkspaceCatalogEntry[];
  entryPath: string;
  readFile: (relativePath: string) => Promise<string>;
  getDirectoryName: () => string;
  workingCopy: WorkingCopyPort;
  logger: WorkspaceOpenLogger;
  setNotification?: (n: ToastNotification | null) => void;
  initSchema: (schema: SystemSchema) => void;
  set: (partial: Record<string, unknown>) => void;
  isSampleWorkspace?: boolean;
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

  const contextEntry = catalog.find(e => e.level === 'context');
  if (
    contextEntry &&
    !filesForResolve.some(f => f.path === contextEntry.path) &&
    path !== contextEntry.path
  ) {
    filesForResolve.unshift({
      path: contextEntry.path,
      schema: {
        name: contextEntry.name,
        version: '1.0.0',
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
 * Parses YAML files from a workspace folder, builds a lightweight navigation catalog,
 * and fully loads only the entry diagram (context → container → first file).
 * Other systems are loaded on demand via ensureSystemLoaded.
 */
export async function loadWorkspaceFromDirectory(deps: OpenWorkspaceDeps): Promise<boolean> {
  const { logger, setNotification, initSchema, set, isSampleWorkspace = false } = deps;
  logger.info(
    isSampleWorkspace ? 'Opening bundled sample workspace' : 'Opening workspace folder picker'
  );

  const ok = await deps.selectDirectory();
  if (!ok) return false;

  const files = await deps.readDirectoryFiles();
  if (files.length === 0) {
    throw new Error('No blueprint .yaml or .yml files found in selected directory');
  }

  const schemaFiles = files.filter(f => f.name.endsWith('.yaml') || f.name.endsWith('.yml'));

  const nextLoadedSystems = schemaFiles
    .map(file => {
      try {
        const schema = parseSchemaFromYaml(file.content);
        return {
          path: file.name,
          name:
            schema.name ||
            file.name
              .split('/')
              .pop()!
              .replace(/\.ya?ml$/, ''),
          schema,
        };
      } catch (err) {
        logger.warn(`Skipping file ${file.name} as it is not a valid blueprint schema: ${err}`);
        return null;
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  if (nextLoadedSystems.length === 0) {
    throw new Error('No valid blueprint schemas found in selected directory');
  }

  const workspaceName = deps.getDirectoryName();
  const resolved = resolveWorkspaceEntityRefs(nextLoadedSystems, workspaceName);
  const resolvedSystems = nextLoadedSystems.map(sys => ({
    ...sys,
    schema: resolved.schemas[sys.path] || sys.schema,
  }));

  const workspaceCatalog: WorkspaceCatalogEntry[] = buildWorkspaceCatalog(
    resolvedSystems.map(s => ({ path: s.path, schema: s.schema })),
    workspaceName
  );

  const firstSystem =
    resolvedSystems.find(s => s.schema.level === 'context') ||
    resolvedSystems.find(s => s.schema.level === 'container') ||
    resolvedSystems[0];

  return finalizeWorkspaceOpen({
    entryCandidate: firstSystem,
    resolved,
    workspaceCatalog,
    workspaceName,
    isSampleWorkspace,
    workingCopy: deps.workingCopy,
    logger,
    setNotification,
    initSchema,
    set,
  });
}

/**
 * Open a workspace from a prebuilt navigation catalog + a single entry YAML fetch.
 * Used by the bundled demo so open does not download every blueprint file.
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

  const workspaceName = deps.getDirectoryName();
  const content = await deps.readFile(entryPath);
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
    workingCopy: deps.workingCopy,
    logger,
    setNotification,
    initSchema,
    set,
  });
}

async function finalizeWorkspaceOpen(args: {
  entryCandidate: LoadedSystem;
  resolved: ReturnType<typeof resolveWorkspaceEntityRefs>;
  workspaceCatalog: WorkspaceCatalogEntry[];
  workspaceName: string;
  isSampleWorkspace: boolean;
  workingCopy: WorkingCopyPort;
  logger: WorkspaceOpenLogger;
  setNotification?: (n: ToastNotification | null) => void;
  initSchema: (schema: SystemSchema) => void;
  set: (partial: Record<string, unknown>) => void;
}): Promise<boolean> {
  const {
    entryCandidate,
    resolved,
    workspaceCatalog,
    workspaceName,
    isSampleWorkspace,
    workingCopy,
    logger,
    setNotification,
    initSchema,
    set,
  } = args;

  const { systems, discardedDraftCount } = await applyDiskFirstDraftResolution(
    [entryCandidate],
    resolved,
    workingCopy,
    logger
  );

  const entry = systems[0] ?? entryCandidate;

  set({
    isWorkspaceOpen: true,
    isSampleWorkspace,
    workspaceName,
    workspaceCatalog,
    loadedSystems: [entry],
    nodeRefMap: {
      [entry.path]: resolved.nodeRefMap[entry.path] || {},
    },
    currentFilePath: entry.path,
  });
  initSchema(entry.schema);

  logger.info('Workspace opened with lazy system load', {
    catalogSize: workspaceCatalog.length,
    entryPath: entry.path,
    isSampleWorkspace,
  });

  if (discardedDraftCount > 0) {
    setNotification?.({
      type: 'info',
      title: 'Loaded files from disk',
      message: `Discarded ${discardedDraftCount} stale local draft${
        discardedDraftCount === 1 ? '' : 's'
      } that differed from YAML on disk (e.g. after a CLI rescan).`,
    });
  } else {
    const versionWarning = assessSchemaVersion(entry.schema.version);
    if (versionWarning) {
      setNotification?.({
        type: 'warning',
        title: versionWarning.title,
        message: `${versionWarning.message} ${versionWarning.migrationHint}`,
      });
    }
  }

  return true;
}

export async function applyDiskFirstDraftResolution(
  resolvedSystems: LoadedSystem[],
  resolved: ReturnType<typeof resolveWorkspaceEntityRefs>,
  workingCopy: WorkingCopyPort,
  logger: { warn: (m: string, meta?: Record<string, unknown>) => void }
): Promise<{ systems: LoadedSystem[]; discardedDraftCount: number }> {
  let discardedDraftCount = 0;
  const systems: LoadedSystem[] = [];

  for (const sys of resolvedSystems) {
    const sysId = sys.schema.entityRef || 'default';
    const fileRefMap = resolved.nodeRefMap[sys.path] || {};
    const diskSchema = sys.schema;

    try {
      await workingCopy.saveBaselineSchema({
        filePath: sys.path,
        schema: diskSchema,
        systemId: sysId,
        nodeRefMap: fileRefMap,
      });
    } catch {
      /* ignore persistence failures on open */
    }

    let workingSchema: SystemSchema | null = null;
    try {
      workingSchema = await workingCopy.loadWorkingSchema({
        filePath: sys.path,
        systemName: diskSchema.name,
        systemVersion: diskSchema.version,
        systemLevel: diskSchema.level,
        systemEntityRef: diskSchema.entityRef,
      });
    } catch {
      workingSchema = null;
    }

    const resolution = resolveSchemaOnWorkspaceOpen(diskSchema, workingSchema);
    if (resolution.discardedStaleDraft) {
      discardedDraftCount += 1;
      logger.warn('Discarding IndexedDB draft that no longer matches disk YAML', {
        path: sys.path,
      });
    }

    try {
      await workingCopy.saveWorkingSchema({
        filePath: sys.path,
        schema: resolution.schema,
        systemId: sysId,
        nodeRefMap: fileRefMap,
      });
    } catch {
      /* ignore persistence failures on open */
    }

    systems.push({
      ...sys,
      schema: resolution.schema,
    });
  }

  return { systems, discardedDraftCount };
}
