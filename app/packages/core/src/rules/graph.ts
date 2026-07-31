import * as yaml from 'js-yaml';
import { z } from 'zod';
import type {
  SystemSchema,
  SystemDependency,
  SystemNode,
  ValidationResult,
  ValidationIssue,
  NodePosition,
} from '../models/schema';
import { SYSTEM_SCHEMA_MAJOR_VERSION, systemSchemaPublicUrl } from '../models/schemaVersion';
import { ENTITY_REF_PATTERN } from '../lib/entityRef';
import { getNodePosition } from '../lib/nodePosition';

/** Keep first edge per from→to pair (duplicate ids break React Flow / canvas perf). */
export function dedupeDependencies(deps: SystemDependency[]): SystemDependency[] {
  const seen = new Set<string>();
  const out: SystemDependency[] = [];
  for (const dep of deps) {
    const key = `${dep.from}\0${dep.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(dep);
  }
  return out;
}

/**
 * Validates the node dependency graph for cycles and other logic constraints.
 */
export function validateGraph(schema: SystemSchema): ValidationResult {
  const issues: ValidationIssue[] = [];
  const adj = new Map<string, string[]>();

  for (const node of schema.nodes) {
    adj.set(node.entityRef || '', []);
  }

  for (const dep of schema.dependencies) {
    if (!adj.has(dep.from)) {
      issues.push({
        type: 'invalid-connection',
        message: `Dependency source node "${dep.from}" does not exist.`,
      });
      continue;
    }
    if (!adj.has(dep.to)) {
      issues.push({
        type: 'invalid-connection',
        message: `Dependency target node "${dep.to}" does not exist.`,
      });
      continue;
    }
    adj.get(dep.from)!.push(dep.to);
  }

  const visited = new Set<string>();
  const stack: string[] = [];
  const stackSet = new Set<string>();

  function dfs(node: string): string[] | null {
    visited.add(node);
    stack.push(node);
    stackSet.add(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = dfs(neighbor);
        if (cycle) return cycle;
      } else if (stackSet.has(neighbor)) {
        const idx = stack.indexOf(neighbor);
        return [...stack.slice(idx), neighbor];
      }
    }

    stack.pop();
    stackSet.delete(node);
    return null;
  }

  for (const node of schema.nodes) {
    const ref = node.entityRef || '';
    if (!visited.has(ref)) {
      const cyclePath = dfs(ref);
      if (cyclePath) {
        issues.push({
          type: 'cycle',
          message: `Circular dependency detected: ${cyclePath.join(' ➔ ')}`,
          path: cyclePath,
        });

        break;
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

const nodeTypeSchema = z.enum([
  'person',
  'software-system',

  'web-app',
  'mobile-app',
  'single-page-app',
  'microservice',
  'database',
  'cache-store',
  'event-broker',
  'serverless-app',

  'component',
  'container',
  'code-module',

  'relational-database',
  'grpc-service',
  'serverless-function',
  'rest-api',
  'gateway-api',
  'background-worker',
  'group',
]);

const dependencyTypeSchema = z.enum([
  'direct-call',
  'publish-subscribe',
  'read-write',
  'inter-container',
]);

/** Shared FQN shape for schema identity and node refs (no file paths). */
const entityRefStringSchema = z
  .string()
  .min(1)
  .regex(
    ENTITY_REF_PATTERN,
    'entityRef must be alphanumeric, dashes, or underscores segments separated by slashes'
  );

const forensicClassificationSchema = z.enum(['hotspot', 'knowledge-silo']);

const coupledFileForensicsSchema = z.object({
  path: z.string().min(1),
  score: z.number(),
  sharedCommits: z.number(),
});

const forensicAuthorSchema = z.object({
  email: z.string().min(1),
  commits: z.number().nonnegative(),
});

const nodeForensicsSchema = z.object({
  complexity: z.number().optional(),
  complexityPeak: z.number().optional(),
  cognitiveComplexity: z.number().optional(),
  functionCount: z.number().nonnegative().optional(),
  loc: z.number().optional(),
  sloc: z.number().optional(),
  churn: z.number().optional(),
  lineChurn: z.number().optional(),
  churn30: z.number().optional(),
  churn365: z.number().optional(),
  churnByWeek: z.array(z.number().nonnegative()).optional(),
  authorCount: z.number().optional(),
  topAuthorPercent: z.number().optional(),
  authors: z.array(forensicAuthorSchema).optional(),
  hotspotScore: z.number().optional(),
  classifications: z.array(forensicClassificationSchema).optional(),
  coupledFiles: z.array(coupledFileForensicsSchema).optional(),
  sinceDays: z.number().positive().optional(),
  fileCount: z.number().optional(),
  hotspotCount: z.number().optional(),
  knowledgeSiloCount: z.number().optional(),
});

const nodeSafeguardsPropertySchema = z.object({
  circuitBreaker: z.boolean().optional(),
  bulkhead: z.boolean().optional(),
  retry: z.boolean().optional(),
  localCache: z.boolean().optional(),
});

const nodeResilienceSchema = nodeSafeguardsPropertySchema;

const propertyValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const nodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const systemNodeSchema = z.object({
  entityRef: entityRefStringSchema,
  type: nodeTypeSchema,
  name: z.string().min(1),
  external: z.boolean().optional(),
  properties: z.record(z.string(), propertyValueSchema).optional(),
  isTest: z.boolean().optional(),
  parentEntityRef: entityRefStringSchema.optional(),
  position: nodePositionSchema.optional(),
  /** @deprecated Accept flat x/y when reading older diagrams; serialize as `position`. */
  x: z.number().optional(),
  y: z.number().optional(),
  forensics: nodeForensicsSchema.optional(),
  resilience: nodeResilienceSchema.optional(),
});

const systemDependencySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: dependencyTypeSchema,
  description: z.string().optional(),
});

/** Zod contract for blueprint YAML/JSON wire format (v3). Prefer this over hand-written JSON Schema. */
const sourceProvenanceSchema = z.object({
  remoteUrl: z.string().min(1).optional(),
  defaultBranch: z.string().min(1).optional(),
  scannedAtCommit: z.string().min(1).optional(),
  scanRoot: z.string().optional(),
  systemName: z.string().min(1).optional(),
});

const metadataSchema = z.object({
  entityRef: entityRefStringSchema.optional(),
  name: z.string().min(1),
  source: sourceProvenanceSchema.optional(),
});

export const systemSchemaValidator = z.object({
  version: z.string().min(1),
  level: z.enum(['context', 'container', 'component', 'code']),
  metadata: metadataSchema,
  nodes: z.array(systemNodeSchema),
  dependencies: z.array(systemDependencySchema).optional(),
});

/**
 * JSON Schema (Draft 07) derived from {@link systemSchemaValidator} for IDE YAML hints.
 * Documents are a YAML mapping with `version` (schema URL), `level`, `metadata`, and `nodes`.
 * Regenerated by `cd app && pnpm generate:schema`.
 * Hosted at {@link systemSchemaPublicUrl} (`/schemas/v{n}/` and `/schemas/latest/`).
 */
export function toSystemSchemaJsonSchema(): Record<string, unknown> {
  const docSchema = z.toJSONSchema(systemSchemaValidator, { target: 'draft-07' }) as Record<
    string,
    unknown
  >;
  delete docSchema.$schema;
  // Drop deprecated flat x/y from the published schema; keep them on the Zod parser only.
  const props = docSchema.properties as Record<string, unknown> | undefined;
  const nodes = props?.nodes as { items?: { properties?: Record<string, unknown> } } | undefined;
  if (nodes?.items?.properties) {
    delete nodes.items.properties.x;
    delete nodes.items.properties.y;
  }
  const versionedId = systemSchemaPublicUrl(`v${SYSTEM_SCHEMA_MAJOR_VERSION}`);
  return {
    ...docSchema,
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: versionedId,
    title: 'Blueprint System Schema',
    description:
      'Declarative C4 diagram schema used by ArchLens and designer. ' +
      'Root is a YAML mapping: version (schema URL), level, metadata (entityRef, name), nodes (with optional position), dependencies. ' +
      'Generated from Zod - do not edit by hand.',
  };
}

function resolveNodePosition(node: {
  position?: NodePosition;
  x?: number;
  y?: number;
}): NodePosition | undefined {
  return getNodePosition(node);
}

function mapValidatedSchema(validated: z.infer<typeof systemSchemaValidator>): SystemSchema {
  return {
    entityRef: validated.metadata.entityRef || '',
    name: validated.metadata.name,
    version: validated.version,
    level: validated.level,
    source: validated.metadata.source,
    nodes: validated.nodes.map(n => {
      const position = resolveNodePosition(n);
      return {
        entityRef: n.entityRef,
        type: n.type,
        name: n.name,
        external: n.external,
        properties: n.properties || {},
        isTest: n.isTest,
        parentEntityRef: n.parentEntityRef,
        ...(position ? { position } : {}),
        forensics: n.forensics,
        resilience: n.resilience,
      };
    }),
    dependencies: validated.dependencies
      ? validated.dependencies.map(d => ({
          from: d.from,
          to: d.to,
          type: d.type,
          description: d.description || '',
        }))
      : [],
  };
}

/** Normalize legacy `metaData` key to `metadata` before Zod validation. */
function normalizeWireDocument(doc: unknown): unknown {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return doc;
  const record = doc as Record<string, unknown>;
  if ('metadata' in record) return record;
  if ('metaData' in record) {
    const { metaData, ...rest } = record;
    return { ...rest, metadata: metaData };
  }
  return record;
}

function parseWireDocument(doc: unknown): SystemSchema {
  const normalized = normalizeWireDocument(doc);
  if (
    !normalized ||
    typeof normalized !== 'object' ||
    Array.isArray(normalized) ||
    !('metadata' in normalized)
  ) {
    throw new Error(
      'Invalid schema document. Expected an object with version, level, and metadata.'
    );
  }
  return mapValidatedSchema(systemSchemaValidator.parse(normalized));
}

function formatZodError(zodErr: z.ZodError): string {
  return zodErr.issues
    .map(issue => {
      const path = issue.path
        .map((p, idx) => (typeof p === 'number' ? `[${p}]` : (idx > 0 ? '.' : '') + String(p)))
        .join('');
      return `${path || 'root'}: ${issue.message}`;
    })
    .join('; ');
}

export function parseSchemaFromYaml(yamlContent: string): SystemSchema {
  let parsed: unknown;
  try {
    parsed = yaml.load(yamlContent);
  } catch (yamlErr: unknown) {
    const message = yamlErr instanceof Error ? yamlErr.message : String(yamlErr);
    throw new Error(`Invalid schema YAML. YAML Parsing Error: ${message}`);
  }

  try {
    return parseWireDocument(parsed);
  } catch (zodErr) {
    if (zodErr instanceof z.ZodError) {
      throw new Error(`Invalid schema YAML. Schema Validation Error: ${formatZodError(zodErr)}`);
    }
    throw zodErr;
  }
}

export function parseSchemaFromJson(jsonContent: string): SystemSchema {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (jsonErr: unknown) {
    const message = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
    throw new Error(`Invalid schema JSON. JSON Parsing Error: ${message}`);
  }

  try {
    return parseWireDocument(parsed);
  } catch (zodErr) {
    if (zodErr instanceof z.ZodError) {
      throw new Error(`Invalid schema JSON. Schema Validation Error: ${formatZodError(zodErr)}`);
    }
    throw zodErr;
  }
}

/**
 * Serializes a SystemSchema model to a YAML string (CLI + designer share this format).
 * Root is a mapping: version (schema URL), level, metadata, nodes, dependencies.
 */
export function serializeSchemaToYaml(
  schema: SystemSchema,
  _options?: { schemaUrl?: string }
): string {
  const cleanSchema: Record<string, unknown> = {
    version: systemSchemaPublicUrl(),
    level: schema.level,
    metadata: {
      ...(schema.entityRef ? { entityRef: schema.entityRef } : {}),
      name: schema.name,
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
