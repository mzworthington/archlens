import path from 'node:path';
import { existsSync } from 'node:fs';
import { SYSTEM_SCHEMA_MAJOR_VERSION } from '@archlens/core';

/**
 * Resolve a path-relative schema file for workspace IDE association (Node/CLI only).
 * Prefer {@link systemSchemaPublicUrl} in YAML `version` (written by serialize).
 */
export function resolveLocalSchemaUrl(yamlFilePath: string): string | undefined {
  const versioned = path.join(
    'schemas',
    `v${SYSTEM_SCHEMA_MAJOR_VERSION}`,
    'blueprint.schema.json'
  );
  const candidates = [versioned, path.join('schemas', 'blueprint.schema.json')];
  let dir = path.dirname(path.resolve(yamlFilePath));

  for (let i = 0; i < 12; i++) {
    for (const candidate of candidates) {
      const abs = path.join(dir, candidate);
      if (existsSync(abs)) {
        const rel = path.relative(path.dirname(path.resolve(yamlFilePath)), abs);
        return rel.split(path.sep).join('/');
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return undefined;
}
