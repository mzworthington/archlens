import { createHash } from 'node:crypto';
import type { RemoteCatalogYamlObject } from '@archlens/core';

export function computeRemoteCatalogRevisionId(
  yamlObjects: readonly RemoteCatalogYamlObject[]
): string {
  const normalized = [...yamlObjects]
    .map(object => ({
      path: object.path.replace(/\\/g, '/'),
      content: object.content,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  const hash = createHash('sha256');
  for (const object of normalized) {
    hash.update(object.path);
    hash.update('\0');
    hash.update(object.content);
    hash.update('\n');
  }
  return hash.digest('hex').slice(0, 16);
}
