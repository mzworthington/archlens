import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLocalSchemaUrl } from './resolveLocalSchemaUrl.ts';

describe('resolveLocalSchemaUrl', () => {
  it('resolves a path-relative schema from this repo blueprints tree', () => {
    const repoRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../../../..'
    );
    const yamlPath = path.join(repoRoot, 'blueprints/cli/containers.yaml');
    expect(resolveLocalSchemaUrl(yamlPath)).toBe('../../schemas/v4/blueprint.schema.json');
  });
});
