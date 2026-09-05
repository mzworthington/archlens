import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import type { SystemDependency, SystemNode, SystemSchema } from '../models/schema';
import { isContextYamlPath, mergeContextSchemasByEntityRef } from './estateFragment';
import {
  normalizeRemoteCatalogObjectPath,
  type RemoteCatalogYamlObject,
} from './remoteCatalogSnapshot';
import { parseSchemaFromYaml, serializeSchemaToYaml } from '../rules/graph';
import { isEntityRef } from './entityRef';

export const SUGGESTION_OVERLAY_VERSION = 1 as const;
export const SUGGESTION_OVERLAY_DIR = 'overlays';

export type SuggestionOverlayStatus = 'accepted' | 'rejected';
export type SuggestionOverlayKind = 'add-dependent';

export type SuggestionOverlayDelta = {
  nodes: SystemNode[];
  dependencies: SystemDependency[];
};

export type SuggestionOverlay = {
  version: typeof SUGGESTION_OVERLAY_VERSION;
  overlayId: string;
  estateId: string;
  status: SuggestionOverlayStatus;
  kind: SuggestionOverlayKind;
  /** Diagram path to merge into (default `context.yaml`). */
  targetPath: string;
  sourceRef: string;
  acceptedAt: string;
  recommendationId?: string;
  delta: SuggestionOverlayDelta;
  rejectedAt?: string;
};

export type ApplySuggestionOverlaysResult = {
  yamlObjects: RemoteCatalogYamlObject[];
  applied: SuggestionOverlay[];
  skippedRejected: number;
};

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid suggestion overlay: ${field} must be a non-empty string`);
  }
}

function parseOverlayNode(raw: unknown, index: number): SystemNode {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Invalid suggestion overlay: delta.nodes[${index}] must be an object`);
  }
  const record = raw as Record<string, unknown>;
  assertNonEmptyString(record.entityRef, `delta.nodes[${index}].entityRef`);
  assertNonEmptyString(record.type, `delta.nodes[${index}].type`);
  assertNonEmptyString(record.name, `delta.nodes[${index}].name`);
  return {
    entityRef: record.entityRef.trim(),
    type: record.type.trim() as SystemNode['type'],
    name: record.name.trim(),
    ...(typeof record.external === 'boolean' ? { external: record.external } : { external: true }),
    ...(record.properties && typeof record.properties === 'object'
      ? { properties: record.properties as SystemNode['properties'] }
      : {}),
  };
}

function assertEntityRef(value: unknown, field: string): asserts value is string {
  assertNonEmptyString(value, field);
  if (!isEntityRef(value)) {
    throw new Error(
      `Invalid suggestion overlay: ${field} must be an entityRef (alphanumeric, dashes or underscores segments separated by slashes)`
    );
  }
}

function parseOverlayDependency(raw: unknown, index: number): SystemDependency {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Invalid suggestion overlay: delta.dependencies[${index}] must be an object`);
  }
  const record = raw as Record<string, unknown>;
  assertEntityRef(record.from, `delta.dependencies[${index}].from`);
  assertEntityRef(record.to, `delta.dependencies[${index}].to`);
  assertNonEmptyString(record.type, `delta.dependencies[${index}].type`);
  return {
    from: record.from.trim(),
    to: record.to.trim(),
    type: record.type.trim() as SystemDependency['type'],
    ...(typeof record.description === 'string' && record.description.trim()
      ? { description: record.description.trim() }
      : {}),
  };
}

/** Trim leading/trailing `-` without regex (avoids CodeQL js/polynomial-redos). */
function trimDashes(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value.charCodeAt(start) === 45 /* - */) start++;
  while (end > start && value.charCodeAt(end - 1) === 45 /* - */) end--;
  return value.slice(start, end);
}

export function sanitizeOverlayId(value: string): string {
  // Keep hyphens inside segments; only rewrite runs of invalid chars.
  const joined =
    value
      .trim()
      .match(/[a-zA-Z0-9._-]+/g)
      ?.join('-') ?? '';
  const sanitized = trimDashes(joined);
  return sanitized.length > 0 ? sanitized : 'overlay';
}

export function suggestionOverlayObjectKey(overlayId: string): string {
  return `${SUGGESTION_OVERLAY_DIR}/${sanitizeOverlayId(overlayId)}.yaml`;
}

export function defaultOverlayId(input: {
  kind: SuggestionOverlayKind;
  targetEntityRef?: string;
  dependentEntityRef?: string;
  acceptedAt: string;
}): string {
  const parts = [
    input.kind,
    input.targetEntityRef,
    input.dependentEntityRef,
    input.acceptedAt,
  ].filter((part): part is string => !!part?.trim());
  return sanitizeOverlayId(parts.join('--'));
}

export function parseSuggestionOverlay(data: unknown): SuggestionOverlay {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid suggestion overlay');
  }
  const record = data as Record<string, unknown>;
  if (record.version !== SUGGESTION_OVERLAY_VERSION) {
    throw new Error(
      `Invalid suggestion overlay: unsupported version ${String(record.version)} (expected ${SUGGESTION_OVERLAY_VERSION})`
    );
  }
  assertNonEmptyString(record.overlayId, 'overlayId');
  assertNonEmptyString(record.estateId, 'estateId');
  assertNonEmptyString(record.sourceRef, 'sourceRef');
  assertNonEmptyString(record.acceptedAt, 'acceptedAt');
  if (record.status !== 'accepted' && record.status !== 'rejected') {
    throw new Error('Invalid suggestion overlay: status must be accepted|rejected');
  }
  if (record.kind !== 'add-dependent') {
    throw new Error('Invalid suggestion overlay: unsupported kind');
  }
  if (!record.delta || typeof record.delta !== 'object') {
    throw new Error('Invalid suggestion overlay: delta is required');
  }
  const deltaRecord = record.delta as Record<string, unknown>;
  if (!Array.isArray(deltaRecord.nodes) || !Array.isArray(deltaRecord.dependencies)) {
    throw new Error(
      'Invalid suggestion overlay: delta.nodes and delta.dependencies must be arrays'
    );
  }

  const targetPath = normalizeRemoteCatalogObjectPath(
    typeof record.targetPath === 'string' && record.targetPath.trim()
      ? record.targetPath
      : 'context.yaml'
  );

  return {
    version: SUGGESTION_OVERLAY_VERSION,
    overlayId: sanitizeOverlayId(record.overlayId),
    estateId: record.estateId.trim(),
    status: record.status,
    kind: record.kind,
    targetPath,
    sourceRef: record.sourceRef.trim(),
    acceptedAt: record.acceptedAt.trim(),
    ...(typeof record.recommendationId === 'string' && record.recommendationId.trim()
      ? { recommendationId: record.recommendationId.trim() }
      : {}),
    delta: {
      nodes: deltaRecord.nodes.map(parseOverlayNode),
      dependencies: deltaRecord.dependencies.map(parseOverlayDependency),
    },
    ...(typeof record.rejectedAt === 'string' && record.rejectedAt.trim()
      ? { rejectedAt: record.rejectedAt.trim() }
      : {}),
  };
}

export function parseSuggestionOverlayYaml(content: string): SuggestionOverlay {
  return parseSuggestionOverlay(loadYaml(content));
}

export function serializeSuggestionOverlay(overlay: SuggestionOverlay): string {
  return dumpYaml(overlay, { lineWidth: 120, noRefs: true, sortKeys: true });
}

export function tombstoneSuggestionOverlay(
  overlay: SuggestionOverlay,
  rejectedAt: string
): SuggestionOverlay {
  return {
    ...overlay,
    status: 'rejected',
    rejectedAt,
  };
}

function schemaFromDelta(overlay: SuggestionOverlay, base?: SystemSchema): SystemSchema {
  return {
    name: base?.name ?? 'Estate',
    version: base?.version ?? '1.0.0',
    level: base?.level ?? (isContextYamlPath(overlay.targetPath) ? 'context' : 'container'),
    entityRef: base?.entityRef,
    nodes: overlay.delta.nodes,
    dependencies: overlay.delta.dependencies,
  };
}

/**
 * Apply accepted suggestion overlays onto a composed YAML tree (ADR-0014 Phase 3).
 * Rejected overlays are skipped. Accepted overlays are applied in `acceptedAt` order.
 */
export function applySuggestionOverlays(
  yamlObjects: readonly RemoteCatalogYamlObject[],
  overlays: readonly SuggestionOverlay[]
): ApplySuggestionOverlaysResult {
  const byPath = new Map(
    yamlObjects.map(object => [normalizeRemoteCatalogObjectPath(object.path), object.content])
  );
  const accepted = overlays
    .filter(overlay => overlay.status === 'accepted')
    .sort((a, b) => {
      const byTime = a.acceptedAt.localeCompare(b.acceptedAt);
      if (byTime !== 0) return byTime;
      return a.overlayId.localeCompare(b.overlayId);
    });
  const skippedRejected = overlays.filter(overlay => overlay.status === 'rejected').length;
  const applied: SuggestionOverlay[] = [];

  for (const overlay of accepted) {
    const path = normalizeRemoteCatalogObjectPath(overlay.targetPath);
    const existingContent = byPath.get(path);
    const base = existingContent ? parseSchemaFromYaml(existingContent) : undefined;
    const incoming = schemaFromDelta(overlay, base);
    const merged = base ? mergeContextSchemasByEntityRef(base, incoming) : incoming;
    byPath.set(path, serializeSchemaToYaml(merged));
    applied.push(overlay);
  }

  const nextObjects = [...byPath.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, content]) => ({ path, content }));

  return { yamlObjects: nextObjects, applied, skippedRejected };
}
