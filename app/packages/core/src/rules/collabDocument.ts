import type {
  C4Level,
  SourceProvenance,
  SystemDependency,
  SystemNode,
  SystemSchema,
} from '../models/schema';

export type CollabSchemaMeta = {
  name: string;
  version: string;
  level: C4Level;
  entityRef?: string;
  source?: SourceProvenance;
};

/** Nested-map projection of SystemSchema used as the CRDT document shape. */
export type CollabDocument = {
  meta: CollabSchemaMeta;
  nodes: Record<string, SystemNode>;
  dependencies: Record<string, SystemDependency>;
};

/** Incremental mutation relative to the previous *local* collab document. */
export type CollabPatch = {
  meta?: CollabSchemaMeta;
  nodesAdd: Record<string, SystemNode>;
  nodeFields: Record<string, Record<string, unknown>>;
  nodeFieldDeletes: Record<string, string[]>;
  nodesDelete: string[];
  depsAdd: Record<string, SystemDependency>;
  depsDelete: string[];
};

const DEP_SEP = '|';

export function collabDependencyKey(from: string, to: string, type: string): string {
  return `${from}${DEP_SEP}${to}${DEP_SEP}${type}`;
}

export function parseCollabDependencyKey(key: string): {
  from: string;
  to: string;
  type: string;
} {
  const first = key.indexOf(DEP_SEP);
  const last = key.lastIndexOf(DEP_SEP);
  if (first <= 0 || last <= first || last === key.length - 1) {
    throw new Error(`Invalid collab dependency key: ${key}`);
  }
  return {
    from: key.slice(0, first),
    to: key.slice(first + 1, last),
    type: key.slice(last + 1),
  };
}

function compactNode(node: SystemNode): SystemNode {
  const next: SystemNode = {
    entityRef: node.entityRef,
    type: node.type,
    name: node.name,
  };
  if (node.external !== undefined) next.external = node.external;
  if (node.properties !== undefined) next.properties = node.properties;
  if (node.isTest !== undefined) next.isTest = node.isTest;
  if (node.parentEntityRef !== undefined) next.parentEntityRef = node.parentEntityRef;
  if (node.position !== undefined) {
    next.position = { x: node.position.x, y: node.position.y };
  }
  if (node.forensics !== undefined) next.forensics = node.forensics;
  if (node.resilience !== undefined) next.resilience = node.resilience;
  return next;
}

function compactDependency(dep: SystemDependency): SystemDependency {
  const next: SystemDependency = {
    from: dep.from,
    to: dep.to,
    type: dep.type,
  };
  if (dep.description !== undefined) next.description = dep.description;
  return next;
}

export function schemaToCollabDocument(schema: SystemSchema): CollabDocument {
  const meta: CollabSchemaMeta = {
    name: schema.name,
    version: schema.version,
    level: schema.level,
  };
  if (schema.entityRef !== undefined) meta.entityRef = schema.entityRef;
  if (schema.source !== undefined) meta.source = schema.source;

  const nodes: Record<string, SystemNode> = {};
  for (const node of schema.nodes) {
    nodes[node.entityRef] = compactNode(node);
  }

  const dependencies: Record<string, SystemDependency> = {};
  for (const dep of schema.dependencies) {
    dependencies[collabDependencyKey(dep.from, dep.to, dep.type)] = compactDependency(dep);
  }

  return { meta, nodes, dependencies };
}

export function emptyCollabDocument(): CollabDocument {
  return {
    meta: { name: '', version: '1.0.0', level: 'container' },
    nodes: {},
    dependencies: {},
  };
}

export function collabDocumentToSchema(doc: CollabDocument): SystemSchema {
  const schema: SystemSchema = {
    name: doc.meta.name,
    version: doc.meta.version,
    level: doc.meta.level,
    nodes: Object.values(doc.nodes).map(compactNode),
    dependencies: Object.values(doc.dependencies).map(compactDependency),
  };
  if (doc.meta.entityRef !== undefined) schema.entityRef = doc.meta.entityRef;
  if (doc.meta.source !== undefined) schema.source = doc.meta.source;
  return schema;
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function metaEqual(a: CollabSchemaMeta, b: CollabSchemaMeta): boolean {
  return stableJson(a) === stableJson(b);
}

function recordFromNode(node: SystemNode): Record<string, unknown> {
  return compactNode(node) as unknown as Record<string, unknown>;
}

export function diffCollabDocuments(prev: CollabDocument, next: CollabDocument): CollabPatch {
  const nodesAdd: Record<string, SystemNode> = {};
  const nodeFields: Record<string, Record<string, unknown>> = {};
  const nodeFieldDeletes: Record<string, string[]> = {};
  const nodesDelete: string[] = [];

  for (const [ref, node] of Object.entries(next.nodes)) {
    const before = prev.nodes[ref];
    if (!before) {
      nodesAdd[ref] = node;
      continue;
    }
    const beforeRec = recordFromNode(before);
    const nextRec = recordFromNode(node);
    const fields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(nextRec)) {
      if (stableJson(beforeRec[key]) !== stableJson(value)) {
        fields[key] = value;
      }
    }
    if (Object.keys(fields).length > 0) nodeFields[ref] = fields;

    const deleted = Object.keys(beforeRec).filter(key => !(key in nextRec));
    if (deleted.length > 0) nodeFieldDeletes[ref] = deleted;
  }
  for (const ref of Object.keys(prev.nodes)) {
    if (!(ref in next.nodes)) nodesDelete.push(ref);
  }

  const depsAdd: Record<string, SystemDependency> = {};
  const depsDelete: string[] = [];
  for (const [key, dep] of Object.entries(next.dependencies)) {
    const before = prev.dependencies[key];
    if (!before || stableJson(before) !== stableJson(dep)) {
      depsAdd[key] = dep;
    }
  }
  for (const key of Object.keys(prev.dependencies)) {
    if (!(key in next.dependencies)) depsDelete.push(key);
  }

  const patch: CollabPatch = {
    nodesAdd,
    nodeFields,
    nodeFieldDeletes,
    nodesDelete,
    depsAdd,
    depsDelete,
  };
  if (!metaEqual(prev.meta, next.meta)) {
    patch.meta = next.meta;
  }
  return patch;
}

export function collabPatchIsEmpty(patch: CollabPatch): boolean {
  return (
    patch.meta === undefined &&
    Object.keys(patch.nodesAdd).length === 0 &&
    Object.keys(patch.nodeFields).length === 0 &&
    Object.keys(patch.nodeFieldDeletes).length === 0 &&
    patch.nodesDelete.length === 0 &&
    Object.keys(patch.depsAdd).length === 0 &&
    patch.depsDelete.length === 0
  );
}
