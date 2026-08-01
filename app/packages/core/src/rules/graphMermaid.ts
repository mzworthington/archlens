import type { SystemSchema } from '../models/schema';

/**
 * Serializes a SystemSchema model to a Mermaid diagram string.
 */
function mermaidNodeId(entityRef: string): string {
  return `node_${entityRef.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function mermaidNodeLabel(node: SystemSchema['nodes'][number]): string {
  if (node.type === 'relational-database' || node.type === 'database') {
    return `[("${node.name}")]`;
  }
  if (node.type === 'event-broker') {
    return `{"${node.name}"}`;
  }
  if (node.type === 'cache-store') {
    return `[("${node.name}")]`;
  }
  if (node.type === 'serverless-function' || node.type === 'serverless-app') {
    return `[["${node.name}"]]`;
  }
  if (node.type === 'person') {
    return `["👤 ${node.name}"]`;
  }
  if (node.external) {
    return `["${node.name} (External)"]`;
  }
  return `["${node.name}"]`;
}

function mermaidNodeLine(
  entityRef: string,
  node: SystemSchema['nodes'][number],
  indent: string
): string {
  return `${indent}${mermaidNodeId(entityRef)}${mermaidNodeLabel(node)}`;
}

export function serializeSchemaToMermaid(schema: SystemSchema): string {
  const lines = ['graph TD'];

  const childrenByParent = new Map<string, SystemSchema['nodes']>();
  for (const node of schema.nodes) {
    if (!node.parentEntityRef) continue;
    const siblings = childrenByParent.get(node.parentEntityRef) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentEntityRef, siblings);
  }

  for (const node of schema.nodes) {
    if (node.parentEntityRef) continue;

    const children = childrenByParent.get(node.entityRef) ?? [];
    if (node.type === 'group' && children.length > 0) {
      const safeName = node.name.replace(/"/g, "'");
      lines.push(`    subgraph ${mermaidNodeId(node.entityRef)}["${safeName}"]`);
      for (const child of children) {
        lines.push(mermaidNodeLine(child.entityRef, child, '        '));
      }
      lines.push('    end');
      continue;
    }

    lines.push(mermaidNodeLine(node.entityRef, node, '    '));
  }

  for (const dep of schema.dependencies) {
    const arrow = dep.type === 'publish-subscribe' ? '-.->' : '-->';
    const text = dep.description ? `|"${dep.description}"| ` : '';
    lines.push(`    ${mermaidNodeId(dep.from)} ${arrow} ${text}${mermaidNodeId(dep.to)}`);
  }

  return lines.join('\n');
}
