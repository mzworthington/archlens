import {
  normalizeIacSourceFilePath,
  type InfraEdge,
  type InfraIR,
  type InfraNode,
} from '../infra/infraIr';
import { collectExpressionSources, extractAddressesFromExpression } from './expressions';
import { detectFormat, parseDocument } from './format';
import type { TerraformFormat } from './types';

function asBody(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function hasExpansionMeta(body: Record<string, unknown>): boolean {
  return 'for_each' in body || 'count' in body;
}

function pushNode(
  nodes: InfraNode[],
  seen: Map<string, string>,
  fileLabel: string,
  node: InfraNode
): void {
  const prior = seen.get(node.address);
  if (prior) {
    throw new Error(
      `duplicate-address: ${node.address} declared in both ${prior} and ${fileLabel}`
    );
  }
  seen.set(node.address, fileLabel);
  nodes.push({
    ...node,
    sourceFile: normalizeIacSourceFilePath(fileLabel),
  });
}

function extractFromDocument(
  doc: Record<string, unknown>,
  fileLabel: string,
  nodes: InfraNode[],
  seen: Map<string, string>
): void {
  const resources = doc.resource;
  if (typeof resources === 'object' && resources !== null) {
    for (const [providerType, byName] of Object.entries(resources as Record<string, unknown>)) {
      if (typeof byName !== 'object' || byName === null) continue;
      for (const [name, rawBody] of Object.entries(byName as Record<string, unknown>)) {
        const body = asBody(rawBody);
        pushNode(nodes, seen, fileLabel, {
          address: `${providerType}.${name}`,
          kind: 'resource',
          providerType,
          name,
          hasExpansion: hasExpansionMeta(body),
          body,
        });
      }
    }
  }

  const data = doc.data;
  if (typeof data === 'object' && data !== null) {
    for (const [providerType, byName] of Object.entries(data as Record<string, unknown>)) {
      if (typeof byName !== 'object' || byName === null) continue;
      for (const [name, rawBody] of Object.entries(byName as Record<string, unknown>)) {
        const body = asBody(rawBody);
        pushNode(nodes, seen, fileLabel, {
          address: `data.${providerType}.${name}`,
          kind: 'data',
          providerType,
          name,
          hasExpansion: hasExpansionMeta(body),
          body,
        });
      }
    }
  }

  const modules = doc.module;
  if (typeof modules === 'object' && modules !== null) {
    for (const [name, rawBody] of Object.entries(modules as Record<string, unknown>)) {
      const body = asBody(rawBody);
      const source = typeof body.source === 'string' ? body.source : undefined;
      pushNode(nodes, seen, fileLabel, {
        address: `module.${name}`,
        kind: 'module',
        providerType: 'module',
        name,
        source,
        hasExpansion: hasExpansionMeta(body),
        body,
      });
    }
  }
}

function buildEdges(nodes: InfraNode[], warnings: string[]): InfraEdge[] {
  const addressSet = new Set(nodes.map(n => n.address));
  const edges: InfraEdge[] = [];
  const edgeKeys = new Set<string>();

  const addEdge = (from: string, to: string, via: string) => {
    if (from === to) return;
    if (!addressSet.has(to)) {
      warnings.push(`unresolved-ref:${via}`);
      return;
    }
    const key = `${from}->${to}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to, via });
  };

  for (const node of nodes) {
    const sources: string[] = [];
    collectExpressionSources(node.body, sources);

    for (const expr of sources) {
      const refs = extractAddressesFromExpression(expr);
      if (
        refs.length === 0 &&
        /\b[a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z0-9_]+/.test(expr) &&
        !/\b(var|local|path|terraform|each|count|self)\./.test(expr)
      ) {
        warnings.push(`unresolved-ref:${expr}`);
        continue;
      }
      for (const ref of refs) {
        if (ref === node.address) continue;
        addEdge(node.address, ref, expr);
      }
    }
  }

  return edges;
}

export function documentToInfraIR(
  docs: Array<{ label: string; doc: Record<string, unknown> }>
): InfraIR {
  const nodes: InfraNode[] = [];
  const seen = new Map<string, string>();
  const warnings: string[] = [];

  for (const { label, doc } of docs) {
    extractFromDocument(doc, label, nodes, seen);
  }

  for (const node of nodes) {
    if (node.hasExpansion) {
      warnings.push(`for_each/count: emitting one representative node for ${node.address}`);
    }
  }

  const edges = buildEdges(nodes, warnings);
  return { nodes, edges, warnings };
}

export function parseSourcesToIr(
  files: Array<{ path: string; content: string; sourceFormat?: TerraformFormat | 'auto' }>
): { ir: InfraIR; format: TerraformFormat } {
  const docs: Array<{ label: string; doc: Record<string, unknown> }> = [];
  let format: TerraformFormat = 'hcl';

  for (const file of files) {
    const detected = detectFormat(file.content, file.sourceFormat ?? 'auto');
    format = detected;
    const doc = parseDocument(file.content, detected);
    docs.push({ label: file.path, doc });
  }

  return { ir: documentToInfraIR(docs), format };
}
