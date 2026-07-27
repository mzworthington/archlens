import * as yaml from 'js-yaml';
import { z } from 'zod';
import type {
  SystemSchema,
  SystemDependency,
  SystemNode,
  ValidationResult,
  ValidationIssue,
} from '../models/schema';
import {
  BLUEPRINT_API_VERSION,
  BLUEPRINT_KIND_DIAGRAM,
  SYSTEM_SCHEMA_MAJOR_VERSION,
  systemSchemaPublicUrl,
} from '../models/schemaVersion';
import { ENTITY_REF_PATTERN } from '../lib/entityRef';

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

const entityRefStringSchema = z
  .string()
  .min(1)
  .regex(
    ENTITY_REF_PATTERN,
    'entityRef must be alphanumeric, dashes, or underscores segments separated by slashes'
  )
  .describe(
    'Stable integration identity — slug segments joined by `/` (e.g. blueprint/app/api).'
  );

const forensicClassificationSchema = z.enum(['hotspot', 'knowledge-silo']);

const coupledFileForensicsSchema = z.object({
  path: z.string().min(1).describe('Repository-relative path of the coupled file.'),
  score: z.number().describe('Temporal coupling score (0–1).'),
  sharedCommits: z.number().describe('Commits where both files changed together.'),
});

const forensicAuthorSchema = z.object({
  email: z.string().email().describe('Author email from git history.'),
  commits: z.number().nonnegative().describe('Commits by this author in the lookback window.'),
});

const nodeForensicsSchema = z
  .object({
    complexity: z.number().optional().describe('Cyclomatic complexity from AST analysis.'),
    loc: z.number().optional().describe('Total lines of code.'),
    sloc: z.number().optional().describe('Source lines of code.'),
    churn: z.number().optional().describe('Edit count in the lookback window.'),
    churnByWeek: z.array(z.number().nonnegative()).optional(),
    authorCount: z.number().optional(),
    topAuthorPercent: z.number().optional(),
    authors: z.array(forensicAuthorSchema).optional(),
    hotspotScore: z.number().optional().describe('Relative risk from complexity × churn.'),
    classifications: z.array(forensicClassificationSchema).optional(),
    coupledFiles: z.array(coupledFileForensicsSchema).optional(),
    sinceDays: z.number().positive().optional().describe('Git lookback window in days.'),
    fileCount: z.number().optional(),
    hotspotCount: z.number().optional(),
    knowledgeSiloCount: z.number().optional(),
  })
  .describe('TraceLens signals attached by Blueprint CLI (`forensics` on nodes).');

const entityMetadataSchema = z.object({
  labels: z
    .record(z.string(), z.string())
    .optional()
    .describe('Integrator labels (open key/value map).'),
  annotations: z
    .record(z.string(), z.string())
    .optional()
    .describe('Integrator annotations — docs links, ownership refs, etc.'),
});

const systemNodeSchema = z.object({
  entityRef: entityRefStringSchema,
  type: nodeTypeSchema.describe('C4 / technology node type for rendering and rules.'),
  name: z.string().min(1).describe('Human-readable display name.'),
  metadata: entityMetadataSchema.optional(),
  external: z.boolean().optional().describe('External system — dashed border on canvas.'),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe('Technology attributes (e.g. filepath, framework).'),
  isTest: z.boolean().optional(),
  parentEntityRef: entityRefStringSchema.optional(),
  x: z.number().optional().describe('Layout X coordinate (canvas).'),
  y: z.number().optional().describe('Layout Y coordinate (canvas).'),
  forensics: nodeForensicsSchema.optional(),
});

const systemDependencySchema = z.object({
  from: entityRefStringSchema.describe('Caller entityRef (`from` depends on `to`).'),
  to: entityRefStringSchema.describe('Callee entityRef.'),
  type: dependencyTypeSchema.describe('Relationship semantics for rendering and analysis.'),
  description: z.string().optional().describe('Optional edge label.'),
});

const sourceProvenanceSchema = z.object({
  remoteUrl: z.string().url().optional().describe('Normalized HTTPS git remote URL.'),
  defaultBranch: z.string().min(1).optional(),
  scannedAtCommit: z
    .string()
    .regex(/^[a-f0-9]{7,40}$/i)
    .optional()
    .describe('Commit SHA at CLI scan time.'),
  scanRoot: z.string().optional().describe('Scan root relative to repository root.'),
});

const diagramMetadataSchema = z.object({
  entityRef: entityRefStringSchema
    .optional()
    .describe('Diagram scope — matches the parent node entityRef when nested.'),
  name: z.string().min(1).describe('Human-readable diagram title.'),
  labels: z.record(z.string(), z.string()).optional(),
  annotations: z.record(z.string(), z.string()).optional(),
  source: sourceProvenanceSchema.optional(),
});

const diagramSpecSchema = z.object({
  level: z
    .enum(['context', 'container', 'component', 'code'])
    .describe('C4 zoom level for this diagram file.'),
  nodes: z.array(systemNodeSchema).describe('Entities on this diagram.'),
  dependencies: z.array(systemDependencySchema).optional().describe('Edges between nodes.'),
});

/** Zod contract for blueprint YAML/JSON wire format (v4). */
export const systemSchemaValidator = z.object({
  apiVersion: z
    .literal(BLUEPRINT_API_VERSION)
    .describe('BlueprintSpec contract version (e.g. blueprint.dev/v4).'),
  kind: z.literal(BLUEPRINT_KIND_DIAGRAM).describe('Document kind — always Diagram.'),
  metadata: diagramMetadataSchema.describe('Identity, labels, annotations, and scan provenance.'),
  spec: diagramSpecSchema.describe('Diagram body: C4 level, nodes, and dependencies.'),
});

const WIRE_FORMAT_EXAMPLE = {
  apiVersion: BLUEPRINT_API_VERSION,
  kind: BLUEPRINT_KIND_DIAGRAM,
  metadata: {
    entityRef: 'blueprint/app',
    name: 'App Containers',
  },
  spec: {
    level: 'container',
    nodes: [
      {
        entityRef: 'blueprint/app/api',
        type: 'microservice',
        name: 'API',
      },
    ],
    dependencies: [
      {
        from: 'blueprint/app/web',
        to: 'blueprint/app/api',
        type: 'direct-call',
      },
    ],
  },
};

/**
 * JSON Schema (Draft 07) derived from {@link systemSchemaValidator} for IDE YAML hints.
 * Regenerated by `pnpm --filter @blueprint/core generate:schema`.
 */
export function toSystemSchemaJsonSchema(
  channel: 'latest' | `v${number}` = `v${SYSTEM_SCHEMA_MAJOR_VERSION}`
): Record<string, unknown> {
  const docSchema = z.toJSONSchema(systemSchemaValidator, {
    target: 'draft-07',
    reused: 'ref',
  }) as Record<string, unknown>;
  delete docSchema.$schema;

  const schemaId = systemSchemaPublicUrl(channel);

  const definitions = (docSchema.$defs ?? docSchema.definitions) as Record<string, unknown> | undefined;
  delete docSchema.$defs;

  const result: Record<string, unknown> = {
    ...docSchema,
    $schema: 'http://json-schema.org/draft-07/schema',
    $id: schemaId,
    title: 'Blueprint Diagram',
    description:
      'Declarative C4 diagram document used by Blueprint CLI and canvas. ' +
      'Wire format: apiVersion, kind, metadata, spec (level, nodes, dependencies). ' +
      'Generated from Zod — do not edit by hand.',
    examples: [WIRE_FORMAT_EXAMPLE],
  };

  if (definitions && Object.keys(definitions).length > 0) {
    result.definitions = definitions;
    rewriteRefsToDefinitions(result);
  }

  return result;
}

function rewriteRefsToDefinitions(node: unknown): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) rewriteRefsToDefinitions(item);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj.$ref === 'string' && obj.$ref.startsWith('#/$defs/')) {
    obj.$ref = `#/definitions/${obj.$ref.slice('#/$defs/'.length)}`;
  }
  for (const value of Object.values(obj)) {
    rewriteRefsToDefinitions(value);
  }
}

function mapValidatedSchema(validated: z.infer<typeof systemSchemaValidator>): SystemSchema {
  return {
    apiVersion: validated.apiVersion,
    kind: validated.kind,
    entityRef: validated.metadata.entityRef || '',
    name: validated.metadata.name,
    labels: validated.metadata.labels,
    annotations: validated.metadata.annotations,
    level: validated.spec.level,
    source: validated.metadata.source,
    nodes: validated.spec.nodes.map(n => ({
      entityRef: n.entityRef,
      type: n.type,
      name: n.name,
      metadata: n.metadata,
      external: n.external,
      properties: n.properties || {},
      isTest: n.isTest,
      parentEntityRef: n.parentEntityRef,
      x: n.x,
      y: n.y,
      forensics: n.forensics,
    })),
    dependencies: validated.spec.dependencies
      ? validated.spec.dependencies.map(d => ({
          from: d.from,
          to: d.to,
          type: d.type,
          description: d.description || '',
        }))
      : [],
  };
}

function parseWireDocument(doc: unknown): SystemSchema {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('Invalid schema document. Expected a v4 Diagram object.');
  }
  if (!('apiVersion' in doc) || !('kind' in doc) || !('metadata' in doc) || !('spec' in doc)) {
    throw new Error(
      'Invalid schema document. Expected apiVersion, kind, metadata, and spec (BlueprintSpec v4).'
    );
  }
  return mapValidatedSchema(systemSchemaValidator.parse(doc));
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

function omitEmptyMaps(
  labels?: Record<string, string>,
  annotations?: Record<string, string>
): { labels?: Record<string, string>; annotations?: Record<string, string> } {
  const out: { labels?: Record<string, string>; annotations?: Record<string, string> } = {};
  if (labels && Object.keys(labels).length > 0) out.labels = labels;
  if (annotations && Object.keys(annotations).length > 0) out.annotations = annotations;
  return out;
}

/**
 * Serializes a SystemSchema model to a YAML string (CLI + designer share this format).
 */
export function serializeSchemaToYaml(schema: SystemSchema): string {
  const metadata: Record<string, unknown> = {
    name: schema.name,
    ...(schema.entityRef ? { entityRef: schema.entityRef } : {}),
    ...omitEmptyMaps(schema.labels, schema.annotations),
    ...(schema.source && Object.keys(schema.source).length > 0 ? { source: schema.source } : {}),
  };

  const cleanSchema: Record<string, unknown> = {
    apiVersion: schema.apiVersion || BLUEPRINT_API_VERSION,
    kind: BLUEPRINT_KIND_DIAGRAM,
    metadata,
    spec: {
      level: schema.level,
      nodes: schema.nodes.map(n => toWireNodeRecord(n)),
      dependencies: schema.dependencies.map(d => {
        const cleaned: Record<string, unknown> = {
          from: d.from,
          to: d.to,
          type: d.type,
        };
        if (d.description) cleaned.description = d.description;
        return cleaned;
      }),
    },
  };

  return (
    yaml
      .dump(cleanSchema, {
        noRefs: true,
        lineWidth: 120,
      })
      .replace(/^([ \t]*)'y': /gm, '$1y: ')
  );
}

function toWireNodeRecord(node: SystemNode): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {
    entityRef: node.entityRef,
    type: node.type,
    name: node.name,
  };
  if (node.metadata) {
    const meta = omitEmptyMaps(node.metadata.labels, node.metadata.annotations);
    if (meta.labels || meta.annotations) cleaned.metadata = meta;
  }
  if (node.external !== undefined) cleaned.external = node.external;
  if (node.isTest !== undefined) cleaned.isTest = node.isTest;
  if (node.parentEntityRef) cleaned.parentEntityRef = node.parentEntityRef;
  if (node.properties && Object.keys(node.properties).length > 0) {
    cleaned.properties = node.properties;
  }
  if (typeof node.x === 'number') cleaned.x = Math.round(node.x);
  if (typeof node.y === 'number') cleaned.y = Math.round(node.y);
  if (node.forensics) cleaned.forensics = cleanForensics(node.forensics);
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
