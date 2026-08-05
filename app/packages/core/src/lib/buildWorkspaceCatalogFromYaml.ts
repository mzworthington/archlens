import type { C4Level } from '../models/schema';
import { parseSchemaFromYaml } from '../rules/graphParse';
import { resolveWorkspaceEntityRefs } from './entityRef';
import { buildWorkspaceCatalog, type WorkspaceCatalogEntry } from './workspaceCatalog';

const C4_LEVELS = new Set<C4Level>(['context', 'container', 'component', 'code']);

export type BuildWorkspaceCatalogFromYamlOptions = {
  onInvalid?: (path: string, error: unknown) => void;
};

/**
 * Parse blueprint YAML files into a navigation catalog (no schema bodies retained).
 * Used at canvas build/dev sync time to emit `catalog.json` for the bundled demo.
 */
export function buildWorkspaceCatalogFromYamlFiles(
  files: Array<{ path: string; content: string }>,
  workspaceName?: string | null,
  options: BuildWorkspaceCatalogFromYamlOptions = {}
): WorkspaceCatalogEntry[] {
  const parsed: Array<{ path: string; schema: ReturnType<typeof parseSchemaFromYaml> }> = [];

  for (const file of files) {
    try {
      parsed.push({ path: file.path, schema: parseSchemaFromYaml(file.content) });
    } catch (error) {
      options.onInvalid?.(file.path, error);
    }
  }

  if (parsed.length === 0) {
    throw new Error('No valid blueprint schemas found to build workspace catalog');
  }

  const resolved = resolveWorkspaceEntityRefs(parsed, workspaceName);
  const resolvedSystems = parsed.map(sys => ({
    path: sys.path,
    schema: resolved.schemas[sys.path] || sys.schema,
  }));

  return buildWorkspaceCatalog(resolvedSystems, workspaceName);
}

function isC4Level(value: unknown): value is C4Level {
  return typeof value === 'string' && C4_LEVELS.has(value as C4Level);
}

/**
 * Validate a JSON-parsed bundled `catalog.json` payload.
 */
export function parseWorkspaceCatalogJson(data: unknown): WorkspaceCatalogEntry[] {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Bundled blueprints catalog is empty or invalid');
  }

  return data.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Invalid catalog entry at index ${index}`);
    }
    const record = entry as Record<string, unknown>;
    if (
      typeof record.path !== 'string' ||
      typeof record.name !== 'string' ||
      !isC4Level(record.level) ||
      typeof record.entityRef !== 'string' ||
      !Array.isArray(record.nodeEntityRefs) ||
      !record.nodeEntityRefs.every((ref): ref is string => typeof ref === 'string')
    ) {
      throw new Error(`Invalid catalog entry at index ${index}`);
    }

    const parsed: WorkspaceCatalogEntry = {
      path: record.path,
      name: record.name,
      level: record.level,
      entityRef: record.entityRef,
      nodeEntityRefs: record.nodeEntityRefs,
    };
    if (typeof record.parentEntityRef === 'string' && record.parentEntityRef.length > 0) {
      parsed.parentEntityRef = record.parentEntityRef;
    }
    return parsed;
  });
}
