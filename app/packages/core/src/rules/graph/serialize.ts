import * as yaml from 'js-yaml';
import type { SystemSchema, SystemNode } from '../../models/schema';
import { systemSchemaPublicUrl } from '../../models/schemaVersion';
import { getNodePosition } from '../../lib/nodePosition';

/**
 * Serializes a SystemSchema model to a YAML string (CLI + Canvas share this format).
 * Root is a mapping: version (schema URL), level, metadata, nodes, dependencies.
 */
export function serializeSchemaToYaml(
  schema: SystemSchema,
  options?: { schemaUrl?: string; description?: string }
): string {
  const description = options?.description?.trim();
  const cleanSchema: Record<string, unknown> = {
    version: options?.schemaUrl ?? systemSchemaPublicUrl(),
    level: schema.level,
    metadata: {
      ...(schema.entityRef ? { entityRef: schema.entityRef } : {}),
      name: schema.name,
      ...(description ? { description } : {}),
      ...(schema.source && Object.keys(schema.source).length > 0 ? { source: schema.source } : {}),
    },
  };

  cleanSchema.nodes = schema.nodes.map(n => toWireNodeRecord(n));

  cleanSchema.dependencies = schema.dependencies.map(d => {
    const cleaned: Record<string, unknown> = {
      from: d.from,
      to: d.to,
      type: d.type,
    };
    if (d.description) cleaned.description = d.description;
    return cleaned;
  });

  return (
    yaml
      .dump(cleanSchema, {
        noRefs: true,
        lineWidth: 120,
      })
      // js-yaml quotes `y` as a YAML 1.1 boolean alias; keep the key readable.
      .replace(/^([ \t]*)'y': /gm, '$1y: ')
  );
}

function toWireNodeRecord(node: SystemNode): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {
    entityRef: node.entityRef,
    type: node.type,
    name: node.name,
  };
  if (node.external !== undefined) cleaned.external = node.external;
  if (node.isTest !== undefined) cleaned.isTest = node.isTest;
  if (node.parentEntityRef) cleaned.parentEntityRef = node.parentEntityRef;
  if (node.properties && Object.keys(node.properties).length > 0) {
    cleaned.properties = node.properties;
  }
  const position = getNodePosition(node);
  if (position) {
    cleaned.position = {
      x: Math.round(position.x),
      y: Math.round(position.y),
    };
  }
  if (node.forensics) cleaned.forensics = cleanForensics(node.forensics);
  if (node.resilience) cleaned.resilience = cleanResilience(node.resilience);
  return cleaned;
}

function cleanResilience(resilience: NonNullable<SystemSchema['nodes'][number]['resilience']>) {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(resilience)) {
    if (value) cleaned[key] = value;
  }
  return cleaned;
}

function cleanForensics(forensics: NonNullable<SystemSchema['nodes'][number]['forensics']>) {
  const cleaned: Record<string, unknown> = { ...forensics };
  if (Array.isArray(cleaned.classifications) && cleaned.classifications.length === 0) {
    delete cleaned.classifications;
  }
  if (Array.isArray(cleaned.coupledFiles) && cleaned.coupledFiles.length === 0) {
    delete cleaned.coupledFiles;
  }
  if (Array.isArray(cleaned.authors) && cleaned.authors.length === 0) {
    delete cleaned.authors;
  }
  return cleaned;
}
