import {
  buildWorkspaceCatalog,
  mergeWorkspaceCatalogEntries,
  resolveWorkspaceEntityRefs,
  type C4Level,
  type SystemSchema,
  type WorkspaceCatalogEntry,
} from '@archlens/core';
import {
  APPLICATION_CONTEXT_PATH,
  ADVICELENS_STRESS_CONTEXT_PATH,
  BACKSTAGE_CONTEXT_PATH,
  BLUEPRINT_CONTEXT_PATH,
  CHAOSLENS_STRESS_CONTEXT_PATH,
  ESHOP_CONTEXT_PATH,
  getBlueprintPaths,
  getDefaultLoadedSystems,
  INFRASTRUCTURE_CONTEXT_PATH,
  GOLDEN_PATHS_CONTEXT_PATH,
  loadBlueprintSchema,
} from '../../defaultData';
import type { HydrateSystem } from './hydrateSandboxDrafts';
import { seedDefaultSchemasSafely } from './defaultIdbSeed';
import type { LoggerPort } from '../../../../core';

const inflightBundledLoads = new Map<string, Promise<boolean>>();

export type BundledSystem = { path: string; name: string; schema: SystemSchema };

const CONTEXT_PATH_ENTITY_REFS: Record<string, string> = {
  [APPLICATION_CONTEXT_PATH]: 'application',
  [INFRASTRUCTURE_CONTEXT_PATH]: 'infrastructure',
  [GOLDEN_PATHS_CONTEXT_PATH]: 'golden-paths',
  [BACKSTAGE_CONTEXT_PATH]: 'backstage',
  [BLUEPRINT_CONTEXT_PATH]: 'blueprint',
  [ESHOP_CONTEXT_PATH]: 'eshop',
  [CHAOSLENS_STRESS_CONTEXT_PATH]: 'chaoslens-stress',
  [ADVICELENS_STRESS_CONTEXT_PATH]: 'advicelens-stress',
};

const BACKSTAGE_ROOT_FOLDERS = [
  'packages',
  'plugins',
  'microsite',
  'docs-ui',
  'techdocs-s3-storage',
];

function inferScopedEntityRef(relativePath: string, scope: string): string | undefined {
  if (relativePath === 'containers.yaml') return scope;
  const rootScenarioMatch = relativePath.match(/^([^/]+)-containers\.yaml$/);
  if (rootScenarioMatch) return `${scope}/${rootScenarioMatch[1]}`;
  const rootComponentMatch = relativePath.match(/^([^/]+)-components\.yaml$/);
  if (rootComponentMatch) return `${scope}/${rootComponentMatch[1]}`;
  const containersMatch = relativePath.match(/^([^/]+)\/containers\.yaml$/);
  if (containersMatch) return `${scope}/${containersMatch[1]}`;
  const nestedContainersMatch = relativePath.match(/^(.+)\/([^/]+)-containers\.yaml$/);
  if (nestedContainersMatch) {
    return `${scope}/${nestedContainersMatch[1]}/${nestedContainersMatch[2]}`;
  }
  const componentMatch = relativePath.match(/^(.+)\/([^/]+)-components\.yaml$/);
  if (componentMatch) return `${scope}/${componentMatch[1]}/${componentMatch[2]}`;
  return undefined;
}

function inferScopedFromPrefix(path: string, prefix: string, scope: string): string | undefined {
  if (!path.startsWith(prefix)) return undefined;
  const rest = path.slice(prefix.length);
  if (rest === 'context.yaml') return scope;
  return inferScopedEntityRef(rest, scope);
}

function inferGoldenJourneyEntityRef(relativePath: string): string | undefined {
  if (relativePath === 'context.yaml') return 'golden-paths';
  return inferScopedEntityRef(relativePath, 'golden-paths/golden-journey');
}

export function inferEntityRefFromBundledPath(path: string): string | undefined {
  if (CONTEXT_PATH_ENTITY_REFS[path]) {
    return CONTEXT_PATH_ENTITY_REFS[path];
  }

  if (path.startsWith('golden-journey/')) {
    const rest = path.slice('golden-journey/'.length);
    return inferGoldenJourneyEntityRef(rest);
  }

  const scoped =
    inferScopedFromPrefix(path, 'infrastructure/', 'infrastructure') ??
    inferScopedFromPrefix(path, 'backstage/', 'backstage') ??
    inferScopedFromPrefix(path, 'blueprint/', 'blueprint') ??
    inferScopedFromPrefix(path, 'eshop/', 'eshop') ??
    inferScopedFromPrefix(path, 'chaoslens-stress/', 'chaoslens-stress') ??
    inferScopedFromPrefix(path, 'advicelens-stress/', 'advicelens-stress') ??
    inferScopedFromPrefix(path, 'application/', 'application');

  if (scoped) return scoped;

  const top = path.split('/')[0];
  if (BACKSTAGE_ROOT_FOLDERS.includes(top)) {
    return inferScopedEntityRef(path, 'backstage');
  }
  if (top === 'app') {
    return inferScopedEntityRef(path.slice('app/'.length), 'blueprint/app');
  }

  return inferScopedEntityRef(path, 'application');
}

function inferLevelFromBundledPath(path: string): C4Level {
  if (CONTEXT_PATH_ENTITY_REFS[path]) return 'context';
  if (
    path.endsWith('/containers.yaml') ||
    path.endsWith('-containers.yaml') ||
    path === 'containers.yaml'
  ) {
    return 'container';
  }
  return 'component';
}

/** Navigation index from bundled YAML paths without parsing every schema body. */
export function buildBundledPathCatalog(paths: string[]): WorkspaceCatalogEntry[] {
  const stubs = paths
    .map(path => {
      const entityRef = inferEntityRefFromBundledPath(path);
      if (!entityRef) return null;
      const leaf =
        path
          .split('/')
          .pop()
          ?.replace(/\.ya?ml$/, '') ?? path;
      const schema: SystemSchema = {
        name: leaf,
        version: '1.0.0',
        level: inferLevelFromBundledPath(path),
        entityRef,
        nodes: [],
        dependencies: [],
      };
      return { path, schema };
    })
    .filter((entry): entry is { path: string; schema: SystemSchema } => entry !== null);

  return buildWorkspaceCatalog(stubs);
}

function buildSandboxWorkspaceCatalogFromResolved(
  resolvedSystems: BundledSystem[],
  workspaceName: string
): WorkspaceCatalogEntry[] {
  const fromLoaded = buildWorkspaceCatalog(
    resolvedSystems.map(s => ({ path: s.path, schema: s.schema })),
    workspaceName
  );
  return mergeWorkspaceCatalogEntries(buildBundledPathCatalog(getBlueprintPaths()), fromLoaded);
}

function commitBundledLoadedSystems(
  loadedSystems: BundledSystem[],
  workspaceName: string,
  set: (partial: Record<string, unknown>) => void
) {
  const resolved = resolveWorkspaceEntityRefs(
    loadedSystems.map(s => ({ path: s.path, schema: s.schema })),
    workspaceName
  );
  const resolvedSystems = loadedSystems.map(s => ({
    ...s,
    schema: resolved.schemas[s.path] || s.schema,
  }));

  set({
    loadedSystems: resolvedSystems,
    workspaceCatalog: buildSandboxWorkspaceCatalogFromResolved(resolvedSystems, workspaceName),
    nodeRefMap: resolved.nodeRefMap,
  });

  return { resolved, resolvedSystems };
}

export async function ensureBundledSystemLoaded(
  path: string,
  deps: {
    get: () => {
      loadedSystems: BundledSystem[];
      workspaceName: string;
      nodeRefMap: Record<string, Record<string, string>>;
      isWorkspaceOpen: boolean;
    };
    set: (partial: Record<string, unknown>) => void;
    logger: LoggerPort;
  }
): Promise<boolean> {
  if (deps.get().isWorkspaceOpen) return false;
  if (deps.get().loadedSystems.some(s => s.path === path)) return true;

  const existing = inflightBundledLoads.get(path);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const schema = await loadBlueprintSchema(path);
      if (!schema) {
        deps.logger.warn('Bundled blueprint path not found', { path });
        return false;
      }

      const name =
        schema.name ||
        path
          .split('/')
          .pop()!
          .replace(/\.ya?ml$/, '');
      const { loadedSystems, workspaceName } = deps.get();

      const nextLoaded = loadedSystems.some(s => s.path === path)
        ? loadedSystems
        : [
            ...loadedSystems,
            {
              path,
              name,
              schema,
            },
          ];

      commitBundledLoadedSystems(nextLoaded, workspaceName, deps.set);
      deps.logger.info('Lazy-loaded bundled blueprint', { path, name });
      return true;
    } catch (err) {
      deps.logger.error('Failed to lazy-load bundled blueprint', err, { path });
      return false;
    } finally {
      inflightBundledLoads.delete(path);
    }
  })();

  inflightBundledLoads.set(path, promise);
  return promise;
}

let prefetchStarted = false;

/**
 * Background-load remaining bundled blueprints after the context diagram is shown.
 * Yields between batches so the UI stays responsive.
 */
export function startBundledBlueprintPrefetch(deps: {
  get: () => {
    loadedSystems: BundledSystem[];
    workspaceName: string;
    isWorkspaceOpen: boolean;
    workingCopyPort?: {
      pathHasStoredData: (filePath: string) => Promise<boolean>;
      saveBaselineSchema: (args: {
        filePath: string;
        schema: SystemSchema;
        systemId: string;
        nodeRefMap: Record<string, string>;
      }) => Promise<void>;
      saveWorkingSchema: (args: {
        filePath: string;
        schema: SystemSchema;
        systemId: string;
        nodeRefMap: Record<string, string>;
      }) => Promise<void>;
    };
  };
  set: (partial: Record<string, unknown>) => void;
}): void {
  if (prefetchStarted || deps.get().isWorkspaceOpen) return;
  prefetchStarted = true;

  const loadedPaths = new Set(deps.get().loadedSystems.map(s => s.path));
  const pendingPaths = getBlueprintPaths().filter(path => !loadedPaths.has(path));
  if (pendingPaths.length === 0) return;

  const BATCH_SIZE = 10;

  void (async () => {
    for (let i = 0; i < pendingPaths.length; i += BATCH_SIZE) {
      if (deps.get().isWorkspaceOpen) return;

      const batchPaths = pendingPaths.slice(i, i + BATCH_SIZE);
      const batchSystems: BundledSystem[] = [];

      for (const path of batchPaths) {
        const schema = await loadBlueprintSchema(path);
        if (!schema) continue;
        batchSystems.push({
          path,
          name:
            schema.name ||
            path
              .split('/')
              .pop()!
              .replace(/\.ya?ml$/, ''),
          schema,
        });
      }

      if (batchSystems.length === 0) continue;

      const merged = [...deps.get().loadedSystems];
      for (const sys of batchSystems) {
        if (!merged.some(s => s.path === sys.path)) merged.push(sys);
      }

      const { resolved } = commitBundledLoadedSystems(merged, deps.get().workspaceName, deps.set);

      const workingCopy = deps.get().workingCopyPort;
      if (workingCopy) {
        await seedDefaultSchemasSafely(
          batchSystems,
          {
            schemas: resolved.schemas,
            nodeRefMap: resolved.nodeRefMap,
          },
          {
            pathHasStoredData: path => workingCopy.pathHasStoredData(path),
            saveBaselineSchema: (filePath, schema, systemId, nodeRefMap) =>
              workingCopy.saveBaselineSchema({ filePath, schema, systemId, nodeRefMap }),
            saveWorkingSchema: (filePath, schema, systemId, nodeRefMap) =>
              workingCopy.saveWorkingSchema({ filePath, schema, systemId, nodeRefMap }),
          }
        ).catch(() => {});
      }

      await new Promise<void>(resolve => {
        requestAnimationFrame(() => resolve());
      });
    }
  })();
}

export function resetBundledBlueprintLoaderState(): void {
  prefetchStarted = false;
  inflightBundledLoads.clear();
}

export function guessBundledPathForEntityRef(entityRef: string): string | undefined {
  if (!entityRef) return undefined;
  const matches = getBlueprintPaths().filter(
    path => inferEntityRefFromBundledPath(path) === entityRef
  );
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  const containerPath = matches.find(
    path => path.endsWith('/containers.yaml') || path.endsWith('-containers.yaml')
  );
  return containerPath ?? matches[0];
}

/** Diagram YAML paths needed to rank offenders for a scoped entity in bundled sandbox mode. */
export function resolveBundledPathsForEntityRef(entityRef: string): string[] {
  if (!entityRef) return [];

  const paths = new Set<string>();
  const own = guessBundledPathForEntityRef(entityRef);
  if (own) paths.add(own);

  const segments = entityRef.split('/');
  for (let end = segments.length - 1; end >= 1; end--) {
    const prefix = segments.slice(0, end).join('/');
    const diagramPath = guessBundledPathForEntityRef(prefix);
    if (diagramPath) paths.add(diagramPath);
  }

  return [...paths];
}

export function resolveBundledContextSystems(): HydrateSystem[] {
  return getDefaultLoadedSystems();
}
