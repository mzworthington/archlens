import type { WorkspaceEntity, WorkspaceFilepathIndex, LoadedSystemInput } from './types';
import { buildWorkspaceEntityIndex } from './entityIndex';
import { normalizeWorkspaceFilepath } from '../../lib/posixPath';

export { normalizeWorkspaceFilepath };

/**
 * Index workspace entities by normalized `properties.filepath` for cross-diagram coupling resolution.
 */
export function buildWorkspaceFilepathIndex(
  loadedSystems: LoadedSystemInput[]
): WorkspaceFilepathIndex {
  const entityIndex = buildWorkspaceEntityIndex(loadedSystems);
  const byPath = new Map<string, WorkspaceEntity>();

  for (const entity of entityIndex.byRef.values()) {
    const filepath = entity.properties?.filepath;
    if (typeof filepath !== 'string' || !filepath) continue;
    const normalized = normalizeWorkspaceFilepath(filepath);
    if (!byPath.has(normalized)) {
      byPath.set(normalized, entity);
    }
  }

  return { byPath };
}
