import type { SystemSchema } from '../../models/schema';
import { positionExternalNodes } from '../externalNodeLayout';
import { enrichContainerSchemaFromComponentDeps } from './containerRollup';
import { isOnActiveDiagram } from './diagramScope';
import { materializeExternalNodes } from './externalNodes';
import { buildWorkspaceEntityIndex } from './entityIndex';
import { selectEntitiesForEnrichment } from './externalCandidates';
import type { EnrichExternalsOptions, LoadedSystemInput, WorkspaceEntityIndex } from './types';

/**
 * Merge suggested (or unresolved) external proxy nodes onto a schema.
 * Idempotent: entities already on the diagram are left unchanged.
 */
export function enrichSchemaWithExternals(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[],
  index: WorkspaceEntityIndex,
  options: EnrichExternalsOptions = {}
): SystemSchema {
  if (options.enrichLevels && !options.enrichLevels.includes(activeSchema.level)) {
    return activeSchema;
  }

  const entities = selectEntitiesForEnrichment(activeSchema, loadedSystems, index, options);
  const missing = entities.filter(entity => !isOnActiveDiagram(entity.entityRef, activeSchema));
  if (missing.length === 0) return activeSchema;

  const externalNodes = materializeExternalNodes(
    missing,
    missing.map(() => ({ x: 0, y: 0 }))
  );
  const nodes = positionExternalNodes(
    [...activeSchema.nodes, ...externalNodes],
    activeSchema.dependencies ?? []
  );

  return {
    ...activeSchema,
    nodes,
  };
}

/**
 * Enrich every schema in a workspace using a shared entity index.
 * Index is built from the input schemas (before enrichment) so ownership stays with
 * the canonical non-external definitions.
 *
 * Container diagrams additionally receive inter-container edges rolled up from
 * cross-container component dependencies, then unresolved endpoints are materialized.
 */
export function enrichWorkspaceWithExternals(
  loadedSystems: LoadedSystemInput[],
  options: EnrichExternalsOptions = {}
): LoadedSystemInput[] {
  const index = buildWorkspaceEntityIndex(loadedSystems);
  return loadedSystems.map(system => {
    let schema = system.schema;
    if (schema.level === 'container') {
      schema = enrichContainerSchemaFromComponentDeps(schema, loadedSystems, index);
    }
    schema = enrichSchemaWithExternals(schema, loadedSystems, index, options);
    return { ...system, schema };
  });
}
