import { type SystemSchema, parseSchemaFromYaml, getFileName } from '@archlens/core';
import applicationContextYaml from '../../../../../../blueprints/application/context.yaml?raw';
import infrastructureContextYaml from '../../../../../../blueprints/infrastructure/context.yaml?raw';
import goldenJourneyContextYaml from '../../../../../../blueprints/golden-journey/context.yaml?raw';
import goldenJourneyContainersYaml from '../../../../../../blueprints/golden-journey/containers.yaml?raw';
import backstageContextYaml from '../../../../../../blueprints/backstage/context.yaml?raw';
import blueprintContextYaml from '../../../../../../blueprints/blueprint/context.yaml?raw';
import eshopContextYaml from '../../../../../../blueprints/eshop/context.yaml?raw';
import chaoslensStressContextYaml from '../../../../../../blueprints/chaoslens-stress/context.yaml?raw';
import advicelensStressContextYaml from '../../../../../../blueprints/advicelens-stress/context.yaml?raw';

/** Context diagrams for each demo sandbox folder (discovered like an opened workspace). */
export const APPLICATION_CONTEXT_PATH = 'application/context.yaml';
export const INFRASTRUCTURE_CONTEXT_PATH = 'infrastructure/context.yaml';
export const GOLDEN_PATHS_CONTEXT_PATH = 'golden-journey/context.yaml';
export const GOLDEN_PATHS_CONTAINERS_PATH = 'golden-journey/containers.yaml';
export const BACKSTAGE_CONTEXT_PATH = 'backstage/context.yaml';
export const BLUEPRINT_CONTEXT_PATH = 'blueprint/context.yaml';
export const ESHOP_CONTEXT_PATH = 'eshop/context.yaml';
export const CHAOSLENS_STRESS_CONTEXT_PATH = 'chaoslens-stress/context.yaml';
export const ADVICELENS_STRESS_CONTEXT_PATH = 'advicelens-stress/context.yaml';

export const SANDBOX_CONTEXT_PATHS = [
  GOLDEN_PATHS_CONTEXT_PATH,
  APPLICATION_CONTEXT_PATH,
  INFRASTRUCTURE_CONTEXT_PATH,
  BACKSTAGE_CONTEXT_PATH,
  BLUEPRINT_CONTEXT_PATH,
  ESHOP_CONTEXT_PATH,
  CHAOSLENS_STRESS_CONTEXT_PATH,
  ADVICELENS_STRESS_CONTEXT_PATH,
] as const;

export type SandboxContextPath = (typeof SANDBOX_CONTEXT_PATHS)[number];

const BACKSTAGE_SANDBOX_PREFIXES = [
  'backstage/',
  'packages/',
  'plugins/',
  'microsite/',
  'docs-ui/',
  'techdocs-s3-storage/',
  'gpio-build-monitor/',
] as const;

export type SandboxDefinition = {
  contextPath: SandboxContextPath;
  name: string;
  entityRef: string;
  pathPrefixes: readonly string[];
  /** Extra diagrams to load eagerly with the context (e.g. golden-journey/containers.yaml). */
  eagerPaths?: readonly string[];
};

export const SANDBOX_DEFINITIONS: readonly SandboxDefinition[] = [
  {
    contextPath: GOLDEN_PATHS_CONTEXT_PATH,
    name: 'Golden Paths',
    entityRef: 'golden-paths',
    pathPrefixes: ['golden-journey/'],
    eagerPaths: [GOLDEN_PATHS_CONTAINERS_PATH],
  },
  {
    contextPath: APPLICATION_CONTEXT_PATH,
    name: 'Application',
    entityRef: 'application',
    pathPrefixes: ['application/'],
  },
  {
    contextPath: INFRASTRUCTURE_CONTEXT_PATH,
    name: 'Infrastructure',
    entityRef: 'infrastructure',
    pathPrefixes: ['infrastructure/'],
  },
  {
    contextPath: BACKSTAGE_CONTEXT_PATH,
    name: 'Backstage',
    entityRef: 'backstage',
    pathPrefixes: BACKSTAGE_SANDBOX_PREFIXES,
  },
  {
    contextPath: BLUEPRINT_CONTEXT_PATH,
    name: 'Blueprint',
    entityRef: 'blueprint',
    pathPrefixes: ['blueprint/', 'app/'],
  },
  {
    contextPath: ESHOP_CONTEXT_PATH,
    name: 'E-Shop',
    entityRef: 'eshop',
    pathPrefixes: ['eshop/'],
  },
  {
    contextPath: CHAOSLENS_STRESS_CONTEXT_PATH,
    name: 'ChaosLens Stress Tests',
    entityRef: 'chaoslens-stress',
    pathPrefixes: ['chaoslens-stress/'],
  },
  {
    contextPath: ADVICELENS_STRESS_CONTEXT_PATH,
    name: 'AdviceLens Stress Tests',
    entityRef: 'advicelens-stress',
    pathPrefixes: ['advicelens-stress/'],
  },
];

export function getSandboxDefinition(contextPath: string): SandboxDefinition | undefined {
  return SANDBOX_DEFINITIONS.find(def => def.contextPath === contextPath);
}

export function pathBelongsToSandbox(path: string, contextPath: SandboxContextPath): boolean {
  const definition = getSandboxDefinition(contextPath);
  if (!definition) return false;
  if (path === definition.contextPath) return true;
  return definition.pathPrefixes.some(prefix => path.startsWith(prefix));
}

export function getBlueprintPathsForSandbox(contextPath: SandboxContextPath): string[] {
  return getBlueprintPaths().filter(path => pathBelongsToSandbox(path, contextPath));
}

type ContextFallback = { yaml: string; name: string };

const CONTEXT_FALLBACKS: Record<string, ContextFallback> = {
  [APPLICATION_CONTEXT_PATH]: { yaml: applicationContextYaml, name: 'Application' },
  [INFRASTRUCTURE_CONTEXT_PATH]: { yaml: infrastructureContextYaml, name: 'Infrastructure' },
  [GOLDEN_PATHS_CONTEXT_PATH]: { yaml: goldenJourneyContextYaml, name: 'Golden Paths' },
  [BACKSTAGE_CONTEXT_PATH]: { yaml: backstageContextYaml, name: 'Backstage' },
  [BLUEPRINT_CONTEXT_PATH]: { yaml: blueprintContextYaml, name: 'Blueprint' },
  [ESHOP_CONTEXT_PATH]: { yaml: eshopContextYaml, name: 'E-Shop' },
  [CHAOSLENS_STRESS_CONTEXT_PATH]: {
    yaml: chaoslensStressContextYaml,
    name: 'ChaosLens Stress Tests',
  },
  [ADVICELENS_STRESS_CONTEXT_PATH]: {
    yaml: advicelensStressContextYaml,
    name: 'AdviceLens Stress Tests',
  },
};

const allBlueprintModuleLoaders = import.meta.glob<{ default: string }>(
  '../../../../../../blueprints/**/*.{yaml,yml}',
  {
    query: '?raw',
    eager: false,
  }
);

const blueprintModuleLoaders = allBlueprintModuleLoaders;

function globKeyToCleanPath(filePath: string): string {
  const blueprintsMarker = 'blueprints/';
  const markerIdx = filePath.lastIndexOf(blueprintsMarker);
  return markerIdx >= 0
    ? filePath.slice(markerIdx + blueprintsMarker.length)
    : getFileName(filePath);
}

export const blueprintPaths = Object.keys(blueprintModuleLoaders)
  .map(globKeyToCleanPath)
  .sort((a, b) => {
    const levelFromPath = (path: string) => {
      if (SANDBOX_CONTEXT_PATHS.includes(path as (typeof SANDBOX_CONTEXT_PATHS)[number])) return 1;
      if (path.endsWith('containers.yaml')) return 2;
      if (path.includes('-components.yaml') || path.endsWith('components.yaml')) return 3;
      return 5;
    };
    const levelA = levelFromPath(a);
    const levelB = levelFromPath(b);
    if (levelA !== levelB) return levelA - levelB;
    return a.localeCompare(b);
  });

export function getBlueprintPaths(): string[] {
  return blueprintPaths;
}

function findGlobKey(cleanPath: string): string | undefined {
  return Object.keys(blueprintModuleLoaders).find(key => globKeyToCleanPath(key) === cleanPath);
}

const parsedContextByPath = new Map<string, SystemSchema>();
let parsedGoldenPathsContainersSchema: SystemSchema | null = null;

function getBundledContextSchema(
  path: string,
  fallbackYaml: string,
  fallbackName: string
): SystemSchema {
  const cached = parsedContextByPath.get(path);
  if (cached) return cached;

  try {
    const schema = parseSchemaFromYaml(fallbackYaml);
    parsedContextByPath.set(path, schema);
    return schema;
  } catch {
    const empty: SystemSchema = {
      name: fallbackName,
      version: '1.0.0',
      level: 'context',
      nodes: [],
      dependencies: [],
    };
    parsedContextByPath.set(path, empty);
    return empty;
  }
}

function getGoldenPathsContainersSchema(): SystemSchema {
  if (!parsedGoldenPathsContainersSchema) {
    try {
      parsedGoldenPathsContainersSchema = parseSchemaFromYaml(goldenJourneyContainersYaml);
    } catch {
      parsedGoldenPathsContainersSchema = {
        name: 'Golden Journey Estate',
        version: '1.0.0',
        level: 'container',
        entityRef: 'golden-paths/golden-journey',
        nodes: [],
        dependencies: [],
      };
    }
  }
  return parsedGoldenPathsContainersSchema;
}

/** Eagerly available Golden Paths context — other blueprints load lazily. */
export let defaultInitialSchema: SystemSchema = getBundledContextSchema(
  GOLDEN_PATHS_CONTEXT_PATH,
  goldenJourneyContextYaml,
  'Golden Paths'
);

const blueprintSchemaCache = new Map<string, SystemSchema>();

export function clearBlueprintSchemaCache(): void {
  blueprintSchemaCache.clear();
  parsedContextByPath.clear();
  parsedGoldenPathsContainersSchema = null;
  defaultInitialSchema = getBundledContextSchema(
    GOLDEN_PATHS_CONTEXT_PATH,
    goldenJourneyContextYaml,
    'Golden Paths'
  );
}

function buildContextLoadedSystem(path: string): {
  path: string;
  name: string;
  schema: SystemSchema;
} {
  const fallback = CONTEXT_FALLBACKS[path];
  const schema = getBundledContextSchema(path, fallback.yaml, fallback.name);
  return { path, name: schema.name || fallback.name, schema };
}

/** Eager systems for one bundled sandbox tree (context + optional companion diagrams). */
export function buildSandboxInitialSystems(
  contextPath: SandboxContextPath = GOLDEN_PATHS_CONTEXT_PATH
): Array<{ path: string; name: string; schema: SystemSchema }> {
  const definition = getSandboxDefinition(contextPath);
  if (!definition) return [];

  const systems = [buildContextLoadedSystem(definition.contextPath)];

  for (const eagerPath of definition.eagerPaths ?? []) {
    if (eagerPath === GOLDEN_PATHS_CONTAINERS_PATH) {
      const goldenContainersSchema = getGoldenPathsContainersSchema();
      systems.push({
        path: GOLDEN_PATHS_CONTAINERS_PATH,
        name: goldenContainersSchema.name || 'Golden Journey Estate',
        schema: goldenContainersSchema,
      });
    }
  }

  return systems;
}

export async function loadBlueprintSchema(cleanPath: string): Promise<SystemSchema | null> {
  const cached = blueprintSchemaCache.get(cleanPath);
  if (cached) return cached;

  const contextFallback = CONTEXT_FALLBACKS[cleanPath];
  if (contextFallback) {
    const schema = getBundledContextSchema(cleanPath, contextFallback.yaml, contextFallback.name);
    blueprintSchemaCache.set(cleanPath, schema);
    return schema;
  }

  if (cleanPath === GOLDEN_PATHS_CONTAINERS_PATH) {
    const schema = getGoldenPathsContainersSchema();
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
