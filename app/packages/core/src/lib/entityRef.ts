import type { C4Level } from '../models/entityIdentity.ts';
import type { SystemSchema } from '../models/schema.ts';
import { slugify } from './slug.ts';

/** Shared FQN shape for schema identity and node refs (no file paths). */
export const ENTITY_REF_PATTERN = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/;

/**
 * True when `ref` is a hierarchical entity FQN (not a file path).
 * Hierarchy links child diagrams via schema.entityRef === parent node.entityRef.
 */
export function isEntityRef(ref: string | undefined): boolean {
  if (!ref) return false;
  return ENTITY_REF_PATTERN.test(ref.trim());
}

export function getSchemaEntityRef(schema: SystemSchema, workspaceName?: string | null): string {
  if (schema.entityRef && isEntityRef(schema.entityRef)) {
    return schema.entityRef;
  }
  if (schema.level === 'context') {
    return 'context';
  }
  const name = workspaceName || schema.name;
  if (name) {
    return slugify(name).replace(/_/g, '-');
  }
  return 'default';
}

export interface ResolvedWorkspaceState {
  schemas: Record<string, SystemSchema>;
  nodeRefMap: Record<string, Record<string, string>>;
}

/**
 * Resolve a short (non-FQN) node ref under a diagram's scope.
 * Uses schema identity (`systemId`) and optional workspace context root - not C4 level.
 */
export function resolveShortEntityRef(ref: string, systemId: string, contextSlug?: string): string {
  if (!ref) return '';
  if (ref.includes('/')) return ref;
  if (systemId.includes('/') || !contextSlug || systemId.startsWith(`${contextSlug}/`)) {
    return `${systemId}/${ref}`;
  }
  if (systemId === contextSlug) {
    return `${contextSlug}/${ref}`;
  }
  return `${contextSlug}/${systemId}/${ref}`;
}

function resolveContextSlug(
  files: Array<{ path: string; schema: SystemSchema }>
): string | undefined {
  const contextFiles = files.filter(file => file.schema.level === 'context');
  if (contextFiles.length === 1) {
    const ref = contextFiles[0].schema.entityRef;
    return ref && isEntityRef(ref) ? ref : undefined;
  }
  if (contextFiles.length > 1) {
    const refs = contextFiles
      .map(file => file.schema.entityRef)
      .filter((ref): ref is string => !!ref && isEntityRef(ref));
    return deriveSharedContextNamespace(refs);
  }
  return undefined;
}

function systemIdForSchema(schema: SystemSchema, workspaceName?: string | null): string {
  return schema.entityRef || slugify(workspaceName || schema.name).replace(/_/g, '-');
}

function buildContainerRefMap(
  schema: SystemSchema,
  systemId: string,
  contextSlug: string | undefined
): Map<string, string> {
  const refMap = new Map<string, string>();
  for (const node of schema.nodes) {
    const ref = node.entityRef || '';
    if (ref.includes('/')) {
      refMap.set(ref, ref);
      continue;
    }
    const containerFQN =
      contextSlug && !systemId.startsWith(`${contextSlug}/`)
        ? `${contextSlug}/${systemId}/${ref}`
        : `${systemId}/${ref}`;
    refMap.set(ref, containerFQN);
  }
  return refMap;
}

function buildComponentRefMap(
  schema: SystemSchema,
  systemId: string,
  contextSlug: string | undefined
): Map<string, string> {
  const refMap = new Map<string, string>();
  const parentContainerFQN =
    schema.entityRef && isEntityRef(schema.entityRef) ? schema.entityRef : undefined;

  for (const node of schema.nodes) {
    const ref = node.entityRef || '';
    if (ref.includes('/')) {
      refMap.set(ref, ref);
      continue;
    }
    if (parentContainerFQN) {
      refMap.set(ref, `${parentContainerFQN}/${ref}`);
      continue;
    }
    const baseFQN =
      contextSlug && !systemId.startsWith(`${contextSlug}/`)
        ? `${contextSlug}/${systemId}`
        : `${systemId}`;
    refMap.set(ref, `${baseFQN}/${ref}`);
  }
  return refMap;
}

function buildContextRefMap(
  schema: SystemSchema,
  systemId: string,
  contextSlug: string | undefined
): Map<string, string> {
  const refMap = new Map<string, string>();
  for (const node of schema.nodes) {
    const ref = node.entityRef || '';
    if (ref.includes('/')) {
      refMap.set(ref, ref);
      continue;
    }
    if (ref === contextSlug || ref === systemId) {
      // Diagram-root group nodes share the context entityRef.
      refMap.set(ref, ref);
      continue;
    }
    refMap.set(
      ref,
      contextSlug && !ref.startsWith(`${contextSlug}/`) ? `${contextSlug}/${ref}` : ref
    );
  }
  return refMap;
}

function buildFileNodeRefMap(
  schema: SystemSchema,
  systemId: string,
  contextSlug: string | undefined
): Map<string, string> {
  if (schema.level === 'container') return buildContainerRefMap(schema, systemId, contextSlug);
  if (schema.level === 'component') return buildComponentRefMap(schema, systemId, contextSlug);
  if (schema.level === 'context') return buildContextRefMap(schema, systemId, contextSlug);
  return new Map();
}

function resolveMappedRef(
  ref: string,
  fileRefMap: Map<string, string>,
  systemId: string,
  contextSlug: string | undefined
): string {
  if (!ref) return '';
  if (ref.includes('/')) return ref;
  return fileRefMap.get(ref) ?? resolveShortEntityRef(ref, systemId, contextSlug);
}

function resolveSchemaWithRefs(
  file: { path: string; schema: SystemSchema },
  fileRefMap: Map<string, string>,
  systemId: string,
  contextSlug: string | undefined,
  workspaceName?: string | null
): SystemSchema {
  const resolvedNodes = file.schema.nodes.map(node => {
    const entityRef = resolveMappedRef(node.entityRef || '', fileRefMap, systemId, contextSlug);
    const parentEntityRef = node.parentEntityRef
      ? resolveMappedRef(node.parentEntityRef, fileRefMap, systemId, contextSlug)
      : undefined;
    return parentEntityRef ? { ...node, entityRef, parentEntityRef } : { ...node, entityRef };
  });

  const resolvedDeps = (file.schema.dependencies ?? []).map(dep => {
    const getDepRef = (ref: string) => {
      if (!ref) return '';
      if (fileRefMap.has(ref)) return fileRefMap.get(ref)!;
      return resolveShortEntityRef(ref, systemId, contextSlug);
    };
    return { ...dep, from: getDepRef(dep.from), to: getDepRef(dep.to) };
  });

  return {
    ...file.schema,
    entityRef: file.schema.entityRef || getSchemaEntityRef(file.schema, workspaceName),
    nodes: resolvedNodes,
    dependencies: resolvedDeps,
  };
}

/**
 * Processes all schemas in the workspace, calculates their C4 hierarchical FQNs,
 * and sets the resolved `entityRef` on every node. It also updates dependency targets.
 *
 * Parent linkage: a child diagram's `schema.entityRef` matches a node `entityRef`
 * on the parent diagram (no separate parentRef / c4Ref / workspace manifest).
 */
export function resolveWorkspaceEntityRefs(
  files: Array<{ path: string; schema: SystemSchema }>,
  workspaceName?: string | null
): ResolvedWorkspaceState {
  const contextSlug = resolveContextSlug(files);
  const nodeRefMapByPath = new Map<string, Map<string, string>>();

  for (const file of files) {
    const systemId = systemIdForSchema(file.schema, workspaceName);
    nodeRefMapByPath.set(file.path, buildFileNodeRefMap(file.schema, systemId, contextSlug));
  }

  const resolvedSchemas = new Map<string, SystemSchema>();
  const nodeRefMap: Record<string, Record<string, string>> = Object.create(null);

  for (const file of files) {
    const systemId = systemIdForSchema(file.schema, workspaceName);
    const fileRefMap = nodeRefMapByPath.get(file.path) ?? new Map<string, string>();
    resolvedSchemas.set(
      file.path,
      resolveSchemaWithRefs(file, fileRefMap, systemId, contextSlug, workspaceName)
    );

    const pathRefObj: Record<string, string> = Object.create(null);
    for (const [nodeId, ref] of fileRefMap) {
      Object.assign(pathRefObj, { [nodeId]: ref });
    }
    Object.assign(nodeRefMap, { [file.path]: pathRefObj });
  }

  return {
    schemas: Object.fromEntries(resolvedSchemas),
    nodeRefMap,
  };
}

export type BreadcrumbSegmentData = {
  name: string;
  entityRef: string;
  level: C4Level;
  path: string;
  isZoomPreview: boolean;
};

/**
 * Shared namespace prefix for sibling context diagrams (e.g. application + samples → blueprint).
 * Returns the full entityRef when only one context diagram exists.
 */
export function deriveSharedContextNamespace(contextEntityRefs: string[]): string | undefined {
  if (contextEntityRefs.length === 0) return undefined;
  if (contextEntityRefs.length === 1) return contextEntityRefs[0];

  const partsList = contextEntityRefs.map(ref => ref.split('/').filter(Boolean));
  const minLen = Math.min(...partsList.map(parts => parts.length));
  if (minLen < 2) return undefined;

  let sharedDepth = 0;
  for (let i = 0; i < minLen - 1; i++) {
    const segment = partsList[0][i];
    if (partsList.every(parts => parts[i] === segment)) {
      sharedDepth = i + 1;
    } else {
      break;
    }
  }

  if (sharedDepth === 0) return undefined;
  return partsList[0].slice(0, sharedDepth).join('/');
}

/** Parent diagram entityRef from hierarchical entityRef path (always assumes a context root). */
export function entityRefParentPrefix(
  entityRef: string,
  contextEntityRef?: string
): string | undefined {
  if (!entityRef) return undefined;
  const slash = entityRef.lastIndexOf('/');
  if (slash > 0) return entityRef.slice(0, slash);
  if (contextEntityRef && entityRef !== contextEntityRef) return contextEntityRef;
  return undefined;
}

function depthToC4Level(depth: number): C4Level {
  if (depth <= 1) return 'context';
  if (depth === 2) return 'container';
  if (depth === 3) return 'component';
  return 'code';
}

export function buildBreadcrumbSegments(args: {
  entityRef: string;
  currentName: string;
  currentPath: string;
  currentLevel: C4Level;
  namesByEntityRef?: Record<string, string>;
  pathsByEntityRef?: Record<string, string>;
  zoomPreview?: {
    name: string;
    entityRef: string;
    path: string;
    level: C4Level;
  };
}): BreadcrumbSegmentData[] {
  const parts = args.entityRef.split('/').filter(Boolean);
  const names = args.namesByEntityRef ?? {};
  const paths = args.pathsByEntityRef ?? {};

  const segments: BreadcrumbSegmentData[] = [];
  for (let depth = 1; depth < parts.length; depth++) {
    const ref = parts.slice(0, depth).join('/');
    segments.push({
      entityRef: ref,
      level: depthToC4Level(depth),
      name: names[ref] ?? ref.split('/').pop() ?? ref,
      path: paths[ref] ?? '',
      isZoomPreview: false,
    });
  }

  segments.push({
    entityRef: args.entityRef,
    level: args.currentLevel,
    name: args.currentName,
    path: args.currentPath,
    isZoomPreview: false,
  });

  if (args.zoomPreview) {
    segments.push({ ...args.zoomPreview, isZoomPreview: true });
  }

  return segments;
}

export const NEXT_C4_LEVEL: Record<C4Level, C4Level> = {
  context: 'container',
  container: 'component',
  component: 'code',
  code: 'code',
};
