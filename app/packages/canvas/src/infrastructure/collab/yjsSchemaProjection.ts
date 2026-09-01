import * as Y from 'yjs';
import type {
  C4Level,
  CollabDocument,
  CollabPatch,
  CollabSchemaMeta,
  SourceProvenance,
  SystemDependency,
  SystemNode,
} from '@archlens/core';
import { emptyCollabDocument } from '@archlens/core';

export const YJS_LOCAL_ORIGIN = 'archlens-local';

const C4_LEVELS = new Set<C4Level>(['context', 'container', 'component', 'code']);

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function yMap(doc: Y.Doc, name: string): Y.Map<unknown> {
  return doc.getMap(name);
}

function ensureNodeMap(nodes: Y.Map<unknown>, ref: string): Y.Map<unknown> {
  const existing = nodes.get(ref);
  if (existing instanceof Y.Map) return existing;
  const next = new Y.Map<unknown>();
  nodes.set(ref, next);
  return next;
}

function applyFields(target: Y.Map<unknown>, fields: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (key === 'position' && value !== null && typeof value === 'object') {
      const pos = value as { x: number; y: number };
      target.set('position', { x: pos.x, y: pos.y });
      continue;
    }
    if (value !== null && typeof value === 'object') {
      target.set(key, cloneJson(value));
      continue;
    }
    target.set(key, value);
  }
}

export function applyCollabPatch(
  ydoc: Y.Doc,
  patch: CollabPatch,
  origin: unknown = YJS_LOCAL_ORIGIN
): void {
  ydoc.transact(() => {
    if (patch.meta) {
      const meta = yMap(ydoc, 'meta');
      applyFields(meta, patch.meta as unknown as Record<string, unknown>);
      for (const key of Array.from(meta.keys())) {
        if (!(key in patch.meta) || (patch.meta as Record<string, unknown>)[key] === undefined) {
          meta.delete(key);
        }
      }
    }

    const nodes = yMap(ydoc, 'nodes');
    for (const [ref, node] of Object.entries(patch.nodesAdd)) {
      applyFields(ensureNodeMap(nodes, ref), node as unknown as Record<string, unknown>);
    }
    for (const [ref, fields] of Object.entries(patch.nodeFields)) {
      applyFields(ensureNodeMap(nodes, ref), fields);
    }
    for (const [ref, keys] of Object.entries(patch.nodeFieldDeletes)) {
      const node = nodes.get(ref);
      if (!(node instanceof Y.Map)) continue;
      for (const key of keys) node.delete(key);
    }
    for (const ref of patch.nodesDelete) {
      nodes.delete(ref);
    }

    const deps = yMap(ydoc, 'dependencies');
    for (const [key, dep] of Object.entries(patch.depsAdd)) {
      applyFields(ensureNodeMap(deps, key), dep as unknown as Record<string, unknown>);
    }
    for (const key of patch.depsDelete) {
      deps.delete(key);
    }
  }, origin);
}

function readC4Level(value: unknown): C4Level {
  if (typeof value === 'string' && C4_LEVELS.has(value as C4Level)) {
    return value as C4Level;
  }
  return 'container';
}

function readNode(raw: unknown, fallbackRef: string): SystemNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.name !== 'string' || typeof rec.type !== 'string') return null;
  const node = rec as unknown as SystemNode;
  if (!node.entityRef) node.entityRef = fallbackRef;
  return node;
}

function readDep(raw: unknown): SystemDependency | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.from !== 'string' || typeof rec.to !== 'string' || typeof rec.type !== 'string') {
    return null;
  }
  return rec as unknown as SystemDependency;
}

export function readCollabDocument(ydoc: Y.Doc): CollabDocument {
  const empty = emptyCollabDocument();
  const metaRaw = yMap(ydoc, 'meta').toJSON() as Record<string, unknown>;
  const meta: CollabSchemaMeta = {
    name: typeof metaRaw.name === 'string' ? metaRaw.name : empty.meta.name,
    version: typeof metaRaw.version === 'string' ? metaRaw.version : empty.meta.version,
    level: readC4Level(metaRaw.level),
  };
  if (typeof metaRaw.entityRef === 'string') meta.entityRef = metaRaw.entityRef;
  if (metaRaw.source && typeof metaRaw.source === 'object') {
    meta.source = metaRaw.source as SourceProvenance;
  }

  const nodes: CollabDocument['nodes'] = {};
  const nodesJson = yMap(ydoc, 'nodes').toJSON() as Record<string, unknown>;
  for (const [ref, raw] of Object.entries(nodesJson)) {
    const node = readNode(raw, ref);
    if (node) nodes[ref] = node;
  }

  const dependencies: CollabDocument['dependencies'] = {};
  const depsJson = yMap(ydoc, 'dependencies').toJSON() as Record<string, unknown>;
  for (const [key, raw] of Object.entries(depsJson)) {
    const dep = readDep(raw);
    if (dep) dependencies[key] = dep;
  }

  return { meta, nodes, dependencies };
}
