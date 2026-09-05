import type { WorkspaceCatalogEntry } from '@archlens/core';
import {
  buildWorkspaceCatalog,
  parseSchemaFromYaml,
  resolveWorkspaceEntityRefs,
} from '@archlens/core';
import {
  beginWorkspaceOpen,
  isWorkspaceOpenCurrent,
  markFolderWorkspacePreferred,
} from '../../workspaceOpenSession';
import { finalizeWorkspaceOpen, type WorkspaceOpenSink } from './openWorkspaceShared';

type OpenWorkspaceFromDiskDeps = WorkspaceOpenSink & {
  selectDirectory: () => Promise<boolean>;
  readDirectoryFiles: () => Promise<Array<{ name: string; content: string }>>;
  getDirectoryName: () => string;
  isSampleWorkspace?: boolean;
  /** Extra store fields applied atomically with finalize (e.g. workspace ports). */
  committedPorts?: Record<string, unknown>;
};

export type LoadWorkspaceFromYamlFilesDeps = WorkspaceOpenSink & {
  files: Array<{ name: string; content: string }>;
  workspaceName: string;
  isSampleWorkspace?: boolean;
  /** True when YAML came from an in-browser structural scan (no CLI forensics). */
  isBrowserLiteWorkspace?: boolean;
  openGeneration?: number;
  committedPorts?: Record<string, unknown>;
  /** Prefer this entry path when present (e.g. context.yaml from a lite scan). */
  preferredEntryPath?: string;
};

/**
 * Open a workspace from in-memory BlueprintSpec YAML (browser lite scan, tests, fixtures).
 * Skips the directory picker; still marks folder preference so demo bootstrap does not override.
 */
export async function loadWorkspaceFromYamlFiles(
  deps: LoadWorkspaceFromYamlFilesDeps
): Promise<boolean> {
  const {
    logger,
    setNotification,
    initSchema,
    set,
    isSampleWorkspace = false,
    isBrowserLiteWorkspace = false,
    committedPorts,
    preferredEntryPath,
  } = deps;

  const openGeneration = deps.openGeneration ?? beginWorkspaceOpen();
  if (!isSampleWorkspace) {
    markFolderWorkspacePreferred();
  }

  if (deps.files.length === 0) {
    throw new Error('No blueprint .yaml or .yml files provided');
  }

  const schemaFiles = deps.files.filter(f => f.name.endsWith('.yaml') || f.name.endsWith('.yml'));

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
    throw new Error('No valid blueprint schemas found');
  }

  const workspaceName = deps.workspaceName;
  const resolved = resolveWorkspaceEntityRefs(nextLoadedSystems, workspaceName);
  const resolvedSystems = nextLoadedSystems.map(sys => ({
    ...sys,
    schema: resolved.schemas[sys.path] || sys.schema,
  }));

  const workspaceCatalog: WorkspaceCatalogEntry[] = buildWorkspaceCatalog(
    resolvedSystems.map(s => ({ path: s.path, schema: s.schema })),
    workspaceName
  );

  const preferred =
    preferredEntryPath != null
      ? resolvedSystems.find(s => s.path === preferredEntryPath)
      : undefined;

  const firstSystem =
    preferred ||
    (isSampleWorkspace &&
      (resolvedSystems.find(s => s.path === 'golden-journey/context.yaml') ||
        resolvedSystems.find(s => s.path === 'golden-journey/containers.yaml'))) ||
    resolvedSystems.find(s => s.schema.level === 'context') ||
    resolvedSystems.find(s => s.schema.level === 'container') ||
    resolvedSystems[0];

  return finalizeWorkspaceOpen({
    entryCandidate: firstSystem,
    resolved,
    workspaceCatalog,
    workspaceName,
    isSampleWorkspace,
    isBrowserLiteWorkspace,
    openGeneration,
    committedPorts,
    workingCopy: deps.workingCopy,
    logger,
    setNotification,
    initSchema,
    set,
  });
}

/**
 * Parses YAML files from a workspace folder, builds a lightweight navigation catalog,
 * and fully loads only the entry diagram (context → container → first file).
 * Other systems are loaded on demand via ensureSystemLoaded.
 */
export async function loadWorkspaceFromDirectory(
  deps: OpenWorkspaceFromDiskDeps
): Promise<boolean> {
  const {
    logger,
    setNotification,
    initSchema,
    set,
    isSampleWorkspace = false,
    committedPorts,
  } = deps;
  logger.info(
    isSampleWorkspace ? 'Opening bundled sample workspace' : 'Opening workspace folder picker'
  );

  const ok = await deps.selectDirectory();
  if (!ok) return false;

  // Claim generation only after the picker succeeds so cancel does not abort demo load.
  const openGeneration = beginWorkspaceOpen();
  markFolderWorkspacePreferred();

  const files = await deps.readDirectoryFiles();
  if (!isWorkspaceOpenCurrent(openGeneration)) return false;
  if (files.length === 0) {
    throw new Error('No blueprint .yaml or .yml files found in selected directory');
  }

  return loadWorkspaceFromYamlFiles({
    files,
    workspaceName: deps.getDirectoryName(),
    workingCopy: deps.workingCopy,
    logger,
    setNotification,
    initSchema,
    set,
    isSampleWorkspace,
    openGeneration,
    committedPorts,
  });
}
