import { parseSchemaFromYaml, serializeSchemaToYaml } from '../rules/graph';
import type { SystemSchema } from '../models/schema';
import { preferDisplayName, preferNodeDisplayName } from './displayName';
import {
  normalizeRemoteCatalogObjectPath,
  type RemoteCatalogYamlObject,
} from './remoteCatalogSnapshot';

export const ESTATE_FRAGMENT_MANIFEST_VERSION = 1 as const;
export const ESTATE_FRAGMENT_MANIFEST_FILE = 'manifest.json';
export const ESTATE_FRAGMENT_FILES_PREFIX = 'files';

export type EstateFragmentManifest = {
  version: typeof ESTATE_FRAGMENT_MANIFEST_VERSION;
  estateId: string;
  productId: string;
  systemId?: string;
  fragmentKey: string;
  sourceRef: string;
  runId: string;
  publishedAt: string;
  objectPaths: string[];
};

export type EstateFragment = EstateFragmentManifest & {
  objects: RemoteCatalogYamlObject[];
};

export type ComposeEstateFragmentsResult = {
  yamlObjects: RemoteCatalogYamlObject[];
  contributors: Array<{
    fragmentKey: string;
    runId: string;
    publishedAt: string;
    sourceRef: string;
    productId: string;
    systemId?: string;
  }>;
};

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid estate fragment: ${field} must be a non-empty string`);
  }
}

/**
 * Path-safe segment for fragment keys under `fragments/{key}/…`.
 * Uses match/join (not replace chains) to avoid CodeQL js/polynomial-redos.
 */
export function sanitizeFragmentKeySegment(value: string): string {
  const sanitized =
    value
      .trim()
      .match(/[a-zA-Z0-9._]+/g)
      ?.join('-') ?? '';
  return sanitized.length > 0 ? sanitized : 'fragment';
}

export function defaultFragmentKey(productId: string, systemId?: string): string {
  const product = sanitizeFragmentKeySegment(productId);
  if (!systemId?.trim()) return product;
  return `${product}--${sanitizeFragmentKeySegment(systemId)}`;
}

export function estateFragmentRunPrefix(fragmentKey: string, runId: string): string {
  return `fragments/${sanitizeFragmentKeySegment(fragmentKey)}/${sanitizeFragmentKeySegment(runId)}/`;
}

export function estateFragmentManifestKey(fragmentKey: string, runId: string): string {
  return `${estateFragmentRunPrefix(fragmentKey, runId)}${ESTATE_FRAGMENT_MANIFEST_FILE}`;
}

export function estateFragmentObjectKey(
  fragmentKey: string,
  runId: string,
  objectPath: string
): string {
  const normalized = normalizeRemoteCatalogObjectPath(objectPath);
  return `${estateFragmentRunPrefix(fragmentKey, runId)}${ESTATE_FRAGMENT_FILES_PREFIX}/${normalized}`;
}

export function isContextYamlPath(filePath: string): boolean {
  const normalized = normalizeRemoteCatalogObjectPath(filePath);
  return normalized === 'context.yaml' || normalized.endsWith('/context.yaml');
}

export function parseEstateFragmentManifest(data: unknown): EstateFragmentManifest {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid estate fragment manifest');
  }
  const record = data as Record<string, unknown>;
  if (record.version !== ESTATE_FRAGMENT_MANIFEST_VERSION) {
    throw new Error(
      `Invalid estate fragment: unsupported version ${String(record.version)} (expected ${ESTATE_FRAGMENT_MANIFEST_VERSION})`
    );
  }
  assertNonEmptyString(record.estateId, 'estateId');
  assertNonEmptyString(record.productId, 'productId');
  assertNonEmptyString(record.fragmentKey, 'fragmentKey');
  assertNonEmptyString(record.sourceRef, 'sourceRef');
  assertNonEmptyString(record.runId, 'runId');
  assertNonEmptyString(record.publishedAt, 'publishedAt');
  if (!Array.isArray(record.objectPaths) || record.objectPaths.some(p => typeof p !== 'string')) {
    throw new Error('Invalid estate fragment: objectPaths must be a string array');
  }

  const systemId =
    typeof record.systemId === 'string' && record.systemId.trim().length > 0
      ? record.systemId.trim()
      : undefined;

  return {
    version: ESTATE_FRAGMENT_MANIFEST_VERSION,
    estateId: record.estateId.trim(),
    productId: record.productId.trim(),
    ...(systemId ? { systemId } : {}),
    fragmentKey: sanitizeFragmentKeySegment(record.fragmentKey),
    sourceRef: record.sourceRef.trim(),
    runId: sanitizeFragmentKeySegment(record.runId),
    publishedAt: record.publishedAt.trim(),
    objectPaths: record.objectPaths.map(p => normalizeRemoteCatalogObjectPath(p)),
  };
}

export function serializeEstateFragmentManifest(manifest: EstateFragmentManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

type FragmentFreshness = Pick<EstateFragmentManifest, 'publishedAt' | 'runId' | 'fragmentKey'>;

/**
 * Keeps the freshest run per `fragmentKey` (by `publishedAt`, then `runId`).
 */
export function selectLatestFragmentManifestsByKey(
  manifests: readonly EstateFragmentManifest[]
): EstateFragmentManifest[] {
  const byKey = new Map<string, EstateFragmentManifest>();
  for (const manifest of manifests) {
    const existing = byKey.get(manifest.fragmentKey);
    if (!existing || compareFragmentFreshness(manifest, existing) > 0) {
      byKey.set(manifest.fragmentKey, manifest);
    }
  }
  return [...byKey.values()].sort((a, b) => compareFragmentFreshness(a, b));
}

/**
 * Keeps the freshest run per `fragmentKey` (by `publishedAt`, then `runId`).
 */
export function selectLatestFragmentsByKey(fragments: readonly EstateFragment[]): EstateFragment[] {
  const byKey = new Map<string, EstateFragment>();
  for (const fragment of fragments) {
    const existing = byKey.get(fragment.fragmentKey);
    if (!existing || compareFragmentFreshness(fragment, existing) > 0) {
      byKey.set(fragment.fragmentKey, fragment);
    }
  }
  return [...byKey.values()].sort((a, b) => compareFragmentFreshness(a, b));
}

function compareFragmentFreshness(a: FragmentFreshness, b: FragmentFreshness): number {
  const byTime = a.publishedAt.localeCompare(b.publishedAt);
  if (byTime !== 0) return byTime;
  return a.runId.localeCompare(b.runId);
}

function edgeKey(dep: { from: string; to: string; type: string; description?: string }): string {
  return `${dep.from}|${dep.to}|${dep.type}|${dep.description || ''}`;
}

/**
 * Union-merge context schemas for estate compose: later fragment merges nodes by
 * `entityRef` and adds any new dependencies. Display names prefer explicit labels
 * over entityRef-derived ones; two explicit names keep the earlier fragment's.
 */
export function mergeContextSchemasByEntityRef(
  base: SystemSchema,
  incoming: SystemSchema
): SystemSchema {
  const nodesByRef = new Map(base.nodes.map(node => [node.entityRef, node]));
  for (const node of incoming.nodes) {
    const existing = nodesByRef.get(node.entityRef);
    if (!existing) {
      nodesByRef.set(node.entityRef, node);
      continue;
    }
    nodesByRef.set(node.entityRef, {
      ...node,
      name: preferNodeDisplayName(existing, node),
      position: existing.position ?? node.position,
      properties: {
        ...(existing.properties || {}),
        ...(node.properties || {}),
      },
      forensics: node.forensics ?? existing.forensics,
      isTest: node.isTest ?? existing.isTest,
      external: node.external ?? existing.external,
      parentEntityRef: node.parentEntityRef ?? existing.parentEntityRef,
      type: node.type || existing.type,
    });
  }

  const depsByKey = new Map(base.dependencies.map(dep => [edgeKey(dep), dep]));
  for (const dep of incoming.dependencies) {
    depsByKey.set(edgeKey(dep), dep);
  }

  const landscapeRef = incoming.entityRef ?? base.entityRef ?? '';
  return {
    ...base,
    name: preferDisplayName(base.name, incoming.name, landscapeRef || base.name),
    entityRef: incoming.entityRef ?? base.entityRef,
    nodes: [...nodesByRef.values()],
    dependencies: [...depsByKey.values()],
  };
}

function mergeContextYamlContents(contents: string[]): string {
  if (contents.length === 0) return '';
  let merged = parseSchemaFromYaml(contents[0]!);
  for (let i = 1; i < contents.length; i += 1) {
    merged = mergeContextSchemasByEntityRef(merged, parseSchemaFromYaml(contents[i]!));
  }
  return serializeSchemaToYaml(merged);
}

/**
 * Compose selected fragments into a single ADR-0010 YAML tree.
 *
 * Precedence:
 * 1. Latest run per `fragmentKey` (by `publishedAt`, then `runId`)
 * 2. Non-`context.yaml` paths: later fragment wins
 * 3. `context.yaml` paths: merge by `entityRef` (later fragment overwrites conflicts)
 */
export function composeEstateFragments(
  fragments: readonly EstateFragment[]
): ComposeEstateFragmentsResult {
  if (fragments.length === 0) {
    throw new Error('Cannot compose estate: no fragments provided');
  }

  const estateIds = new Set(fragments.map(f => f.estateId));
  if (estateIds.size > 1) {
    throw new Error(
      `Cannot compose estate: mixed estateId values (${[...estateIds].sort().join(', ')})`
    );
  }

  const selected = selectLatestFragmentsByKey(fragments);
  const pathContents = new Map<string, string>();
  const contextContents = new Map<string, string[]>();

  for (const fragment of selected) {
    for (const object of fragment.objects) {
      const path = normalizeRemoteCatalogObjectPath(object.path);
      if (isContextYamlPath(path)) {
        const prior = contextContents.get(path) ?? [];
        prior.push(object.content);
        contextContents.set(path, prior);
        continue;
      }
      pathContents.set(path, object.content);
    }
  }

  for (const [path, contents] of contextContents) {
    pathContents.set(path, mergeContextYamlContents(contents));
  }

  const yamlObjects = [...pathContents.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, content]) => ({ path, content }));

  if (yamlObjects.length === 0) {
    throw new Error('Cannot compose estate: selected fragments contain no YAML objects');
  }

  return {
    yamlObjects,
    contributors: selected.map(fragment => ({
      fragmentKey: fragment.fragmentKey,
      runId: fragment.runId,
      publishedAt: fragment.publishedAt,
      sourceRef: fragment.sourceRef,
      productId: fragment.productId,
      ...(fragment.systemId ? { systemId: fragment.systemId } : {}),
    })),
  };
}
