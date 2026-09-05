import type { C4Level, NodeType, SystemDependency, SystemSchema } from '../../models/schema';
import { resolveShortEntityRef } from '../../lib/entityRef';

export type MermaidFormat =
  'flowchart' | 'c4-context' | 'c4-container' | 'c4-component' | 'unknown';

export interface MermaidImportOptions {
  targetLevel: C4Level;
  parentEntityRef?: string;
  defaultNodeType?: NodeType;
}

export interface MermaidParseResult {
  schema: SystemSchema;
  format: MermaidFormat;
  warnings: string[];
}

export interface ParsedNode {
  id: string;
  name: string;
  type: NodeType;
  external?: boolean;
  parentGroupId?: string;
}

export interface ParsedEdge {
  from: string;
  to: string;
  type: SystemDependency['type'];
  description?: string;
}

export function stripComments(source: string): string {
  return source
    .split('\n')
    .map(line => {
      const commentIdx = line.indexOf('%%');
      return (commentIdx === -1 ? line : line.slice(0, commentIdx)).trim();
    })
    .filter(line => line.length > 0)
    .join('\n');
}

export function defaultTypeForLevel(level: C4Level, fallback?: NodeType): NodeType {
  if (fallback) return fallback;
  if (level === 'component') return 'component';
  if (level === 'context') return 'software-system';
  return 'microservice';
}

function scopeNodeRef(ref: string, parentEntityRef?: string): string {
  if (!parentEntityRef || ref.includes('/')) return ref;
  return resolveShortEntityRef(ref, parentEntityRef, undefined);
}

export function scopeSchema(schema: SystemSchema, parentEntityRef?: string): SystemSchema {
  if (!parentEntityRef) return schema;
  return {
    ...schema,
    nodes: schema.nodes.map(n => ({
      ...n,
      entityRef: scopeNodeRef(n.entityRef, parentEntityRef),
    })),
    dependencies: schema.dependencies.map(d => ({
      ...d,
      from: scopeNodeRef(d.from, parentEntityRef),
      to: scopeNodeRef(d.to, parentEntityRef),
    })),
  };
}
