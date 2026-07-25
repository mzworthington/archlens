import type { SystemNode, SystemSchema } from '@blueprint/core';
import { classifyExternalNode } from './externalNodeVisibility';

export type ForensicsDisplayMetrics = {
  upstreamExternals: number;
  downstreamExternals: number;
  tests: number;
  dependencies: number;
};

function nodeByRef(schema: SystemSchema, entityRef: string): SystemNode | undefined {
  return schema.nodes.find(n => n.entityRef === entityRef || n.entityRef.endsWith('/' + entityRef));
}

function incidentDependencies(schema: SystemSchema, entityRef: string) {
  return schema.dependencies.filter(d => d.from === entityRef || d.to === entityRef);
}

function partnerRefs(schema: SystemSchema, entityRef: string): string[] {
  const refs = new Set<string>();
  for (const dep of incidentDependencies(schema, entityRef)) {
    const partner = dep.from === entityRef ? dep.to : dep.from;
    refs.add(partner);
  }
  return [...refs];
}

function countDirectionalExternals(
  schema: SystemSchema,
  entityRefs: Iterable<string>
): Pick<ForensicsDisplayMetrics, 'upstreamExternals' | 'downstreamExternals'> {
  let upstreamExternals = 0;
  let downstreamExternals = 0;

  for (const ref of entityRefs) {
    const node = nodeByRef(schema, ref);
    if (!node?.external) continue;
    const direction = classifyExternalNode(ref, schema);
    if (direction.upstream) upstreamExternals++;
    if (direction.downstream) downstreamExternals++;
    if (!direction.upstream && !direction.downstream) {
      upstreamExternals++;
      downstreamExternals++;
    }
  }

  return { upstreamExternals, downstreamExternals };
}

/**
 * Topology counts for Workspace display toggles.
 * With no selection: diagram-wide. With a node: incident edges + partner flags.
 */
export function countSchemaForensicsMetrics(
  schema: SystemSchema,
  selectedNodeEntityRef?: string | null
): ForensicsDisplayMetrics {
  if (!selectedNodeEntityRef) {
    const directional = countDirectionalExternals(
      schema,
      schema.nodes
        .filter(n => n.external)
        .map(n => n.entityRef)
        .filter((ref): ref is string => !!ref)
    );
    return {
      ...directional,
      tests: schema.nodes.filter(n => n.isTest).length,
      dependencies: schema.dependencies.length,
    };
  }

  const selected = nodeByRef(schema, selectedNodeEntityRef);
  if (!selected) {
    return { upstreamExternals: 0, downstreamExternals: 0, tests: 0, dependencies: 0 };
  }

  const ref = selected.entityRef;
  const partners = partnerRefs(schema, ref)
    .map(r => nodeByRef(schema, r))
    .filter((n): n is SystemNode => !!n);

  const directional = countDirectionalExternals(
    schema,
    partners.map(n => n.entityRef)
  );

  return {
    ...directional,
    tests: partners.filter(n => n.isTest).length,
    dependencies: incidentDependencies(schema, ref).length,
  };
}
