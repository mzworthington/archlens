import { type SystemSchema, parseSchemaFromYaml, getFileName } from '@archlens/core';
import contextYaml from '../../../../../../blueprints/context.yaml?raw';
import infrastructureContextYaml from '../../../../../../blueprints/infrastructure/context.yaml?raw';

export const CONTEXT_BLUEPRINT_PATH = 'context.yaml';
export const INFRASTRUCTURE_CONTEXT_BLUEPRINT_PATH = 'infrastructure/context.yaml';

export type SandboxKind = 'application' | 'infrastructure';

const INFRASTRUCTURE_PREFIX = 'infrastructure/';

const allBlueprintModuleLoaders = import.meta.glob<{ default: string }>(
  '../../../../../../blueprints/**/*.{yaml,yml}',
  {
    query: '?raw',
    eager: false,
  }
);

const blueprintModuleLoaders = Object.fromEntries(
  Object.entries(allBlueprintModuleLoaders).filter(([filePath]) => {
    const cleanPath = globKeyToCleanPath(filePath);
    return (
      cleanPath !== CONTEXT_BLUEPRINT_PATH && cleanPath !== INFRASTRUCTURE_CONTEXT_BLUEPRINT_PATH
    );
  })
);

function globKeyToCleanPath(filePath: string): string {
  const blueprintsMarker = 'blueprints/';
  const markerIdx = filePath.lastIndexOf(blueprintsMarker);
  return markerIdx >= 0
    ? filePath.slice(markerIdx + blueprintsMarker.length)
    : getFileName(filePath);
}

export function isInfrastructureBlueprintPath(path: string): boolean {
  return path.startsWith(INFRASTRUCTURE_PREFIX);
}

export function getSandboxContextPath(kind: SandboxKind): string {
  return kind === 'infrastructure' ? INFRASTRUCTURE_CONTEXT_BLUEPRINT_PATH : CONTEXT_BLUEPRINT_PATH;
}

export const blueprintPaths = [
  CONTEXT_BLUEPRINT_PATH,
  INFRASTRUCTURE_CONTEXT_BLUEPRINT_PATH,
  ...Object.keys(blueprintModuleLoaders).map(globKeyToCleanPath),
].sort((a, b) => {
  const levelFromPath = (path: string) => {
    if (path === CONTEXT_BLUEPRINT_PATH || path === INFRASTRUCTURE_CONTEXT_BLUEPRINT_PATH) return 1;
    if (path.endsWith('containers.yaml')) return 2;
    if (path.includes('-components.yaml') || path.endsWith('components.yaml')) return 3;
    return 5;
  };
  const levelA = levelFromPath(a);
  const levelB = levelFromPath(b);
  if (levelA !== levelB) return levelA - levelB;
  return a.localeCompare(b);
});

export function getBlueprintPathsForSandbox(kind: SandboxKind): string[] {
  const contextPath = getSandboxContextPath(kind);
  return blueprintPaths.filter(path => {
    if (path === CONTEXT_BLUEPRINT_PATH || path === INFRASTRUCTURE_CONTEXT_BLUEPRINT_PATH) {
      return path === contextPath;
    }
    return kind === 'infrastructure'
      ? isInfrastructureBlueprintPath(path)
      : !isInfrastructureBlueprintPath(path);
  });
}

let activeSandboxKind: SandboxKind = 'application';

export function setActiveSandboxKind(kind: SandboxKind): void {
  activeSandboxKind = kind;
}

export function getActiveSandboxKind(): SandboxKind {
  return activeSandboxKind;
}

export function getActiveBlueprintPaths(): string[] {
  return getBlueprintPathsForSandbox(activeSandboxKind);
}

function findGlobKey(cleanPath: string): string | undefined {
  return Object.keys(blueprintModuleLoaders).find(key => globKeyToCleanPath(key) === cleanPath);
}

let parsedContextSchema: SystemSchema | null = null;
let parsedInfrastructureContextSchema: SystemSchema | null = null;

function getContextSchema(): SystemSchema {
  if (!parsedContextSchema) {
    try {
      parsedContextSchema = parseSchemaFromYaml(contextYaml);
    } catch {
      parsedContextSchema = {
        name: 'Empty Workspace',
        version: '1.0.0',
        level: 'context',
        nodes: [],
        dependencies: [],
      };
    }
  }
  return parsedContextSchema;
}

function getInfrastructureContextSchema(): SystemSchema {
  if (!parsedInfrastructureContextSchema) {
    try {
      parsedInfrastructureContextSchema = parseSchemaFromYaml(infrastructureContextYaml);
    } catch {
      parsedInfrastructureContextSchema = {
        name: 'Infrastructure Examples',
        version: '1.0.0',
        level: 'context',
        nodes: [],
        dependencies: [],
      };
    }
  }
  return parsedInfrastructureContextSchema;
}

/** Eagerly available context diagram - all other blueprints load lazily. */
export let defaultInitialSchema: SystemSchema = getContextSchema();

const blueprintSchemaCache = new Map<string, SystemSchema>();

/** Clear parsed YAML cache (e.g. after hot reload in dev). Bundled paths are immutable in production. */
export function clearBlueprintSchemaCache(): void {
  blueprintSchemaCache.clear();
  parsedContextSchema = null;
  parsedInfrastructureContextSchema = null;
  defaultInitialSchema = getContextSchema();
}

export const defaultLoadedSystems: Array<{ path: string; name: string; schema: SystemSchema }> = [
  {
    path: CONTEXT_BLUEPRINT_PATH,
    name: defaultInitialSchema.name || 'Blueprint',
    schema: defaultInitialSchema,
  },
];

export function getDefaultLoadedSystems(
  kind: SandboxKind = 'application'
): Array<{ path: string; name: string; schema: SystemSchema }> {
  if (kind === 'application') return defaultLoadedSystems;

  const schema = getInfrastructureContextSchema();
  return [
    {
      path: INFRASTRUCTURE_CONTEXT_BLUEPRINT_PATH,
      name: schema.name || 'Infrastructure Examples',
      schema,
    },
  ];
}

export async function loadBlueprintSchema(cleanPath: string): Promise<SystemSchema | null> {
  const cached = blueprintSchemaCache.get(cleanPath);
  if (cached) return cached;

  if (cleanPath === CONTEXT_BLUEPRINT_PATH) {
    const schema = getContextSchema();
    blueprintSchemaCache.set(cleanPath, schema);
    return schema;
  }

  if (cleanPath === INFRASTRUCTURE_CONTEXT_BLUEPRINT_PATH) {
    const schema = getInfrastructureContextSchema();
    blueprintSchemaCache.set(cleanPath, schema);
    return schema;
  }

  const globKey = findGlobKey(cleanPath);
  if (!globKey) return null;

  const loader = blueprintModuleLoaders[globKey];
  if (!loader) return null;

  try {
    const module = await loader();
    const schema = parseSchemaFromYaml(module.default);
    blueprintSchemaCache.set(cleanPath, schema);
    return schema;
  } catch {
    return null;
  }
}
