import {
  componentsInContainer,
  componentsInSystem,
  type SystemNode,
  type SystemSchema,
} from '@archlens/core';
import { aggregateNodeForensics, fileMetricsToNodeForensics } from './aggregateNodeForensics';
import type { FileMetrics } from './types';

export { aggregateNodeForensics, fileMetricsToNodeForensics };

export function normalizeFilePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

export interface AttachForensicsOptions {
  /** Component nodes used to roll up container / system forensics. */
  componentNodes?: readonly SystemNode[];
}

function attachToComponentNodes(
  nodes: readonly SystemNode[],
  byPath: ReadonlyMap<string, FileMetrics>
): SystemNode[] {
  return nodes.map(node => {
    const filepath = node.properties?.filepath;
    if (typeof filepath !== 'string') return node;
    const metrics = byPath.get(normalizeFilePath(filepath));
    if (!metrics) return node;
    return { ...node, forensics: fileMetricsToNodeForensics(metrics) };
  });
}

function attachContainerRollups(
  nodes: readonly SystemNode[],
  componentNodes: readonly SystemNode[]
): SystemNode[] {
  return nodes.map(node => {
    if (node.type !== 'container') return node;
    const children = componentsInContainer(node, componentNodes);
    const forensics = aggregateNodeForensics(children);
    return forensics ? { ...node, forensics } : node;
  });
}

function attachSystemRollups(
  nodes: readonly SystemNode[],
  componentNodes: readonly SystemNode[]
): SystemNode[] {
  return nodes.map(node => {
    const children = componentsInSystem(node, componentNodes);
    const forensics = aggregateNodeForensics(children);
    return forensics ? { ...node, forensics } : node;
  });
}

/**
 * Immutably attach forensics onto a schema:
 * - component level: join FileMetrics by properties.filepath
 * - container level: roll up from componentNodes
 * - context level: roll up system nodes from componentNodes under that system FQN
 */
export function attachForensicsToSchema(
  schema: SystemSchema,
  byPath: ReadonlyMap<string, FileMetrics>,
  options: AttachForensicsOptions = {}
): SystemSchema {
  const componentNodes = options.componentNodes ?? [];

  let nodes = schema.nodes;
  if (schema.level === 'component') {
    nodes = attachToComponentNodes(nodes, byPath);
  } else if (schema.level === 'container') {
    nodes = attachContainerRollups(nodes, componentNodes);
  } else if (schema.level === 'context') {
    nodes = attachSystemRollups(nodes, componentNodes);
  }

  return { ...schema, nodes };
}
