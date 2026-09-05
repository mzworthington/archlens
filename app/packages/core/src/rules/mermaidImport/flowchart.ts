import type { NodeType } from '../../models/schema';
import { systemSchemaPublicUrl } from '../../models/schemaVersion';
import { slugify } from '../../lib/slug';
import type { MermaidImportOptions, MermaidParseResult, ParsedEdge, ParsedNode } from './types';
import { defaultTypeForLevel, scopeSchema, stripComments } from './types';

function inferTypeFromShape(shape: string, fallback: NodeType): NodeType {
  if (shape === 'database') return 'relational-database';
  if (shape === 'diamond') return 'event-broker';
  if (shape === 'subroutine') return 'serverless-function';
  if (shape === 'stadium') return 'person';
  return fallback;
}

function stripFlowchartLabelDecorations(rawName: string): { name: string; external: boolean } {
  const externalSuffix = '(External)';
  const external = rawName.includes(externalSuffix);
  let name = rawName;
  if (name.startsWith('👤')) {
    name = name.slice('👤'.length).trimStart();
  }
  if (name.endsWith(externalSuffix)) {
    name = name.slice(0, -externalSuffix.length).trimEnd();
  }
  return { name, external };
}

function parseSubgraphLine(line: string): { id: string; title: string } | null {
  const trimmed = line.trim();
  if (!/^subgraph\b/i.test(trimmed)) return null;

  const idAndBracket = trimmed.match(/^subgraph\s+(\w+)\s*\[["']?([^"'\]]+)["']?\]\s*$/i);
  if (idAndBracket) {
    return { id: idAndBracket[1], title: idAndBracket[2].trim() };
  }

  const bracketOnly = trimmed.match(/^subgraph\s+\[["']?([^"'\]]+)["']?\]\s*$/i);
  if (bracketOnly) {
    const title = bracketOnly[1].trim();
    return { id: slugify(title), title };
  }

  const idBracketTitle = trimmed.match(/^subgraph\s+(\S+)\s+\[([^\]]+)\]\s*$/i);
  if (idBracketTitle) {
    const title = idBracketTitle[2].trim().replace(/^["']|["']$/g, '');
    return { id: idBracketTitle[1], title };
  }

  const rest = trimmed.replace(/^subgraph\s+/i, '').trim();
  if (!rest) return null;
  const quoted = rest.match(/^["'](.+)["']$/);
  const title = quoted ? quoted[1] : rest;
  return { id: slugify(title), title };
}

function registerParsedNode(
  nodeMap: Map<string, ParsedNode>,
  node: ParsedNode,
  parentGroupId?: string
) {
  const incoming = parentGroupId ? { ...node, parentGroupId } : node;
  const existing = nodeMap.get(incoming.id);
  if (!existing) {
    nodeMap.set(incoming.id, incoming);
    return;
  }

  const incomingIsPlaceholder = incoming.name === incoming.id;
  const existingIsPlaceholder = existing.name === existing.id;

  nodeMap.set(incoming.id, {
    ...existing,
    ...incoming,
    name: incomingIsPlaceholder && !existingIsPlaceholder ? existing.name : incoming.name,
    type:
      incoming.type === 'group' ? 'group' : incomingIsPlaceholder ? existing.type : incoming.type,
    external: incoming.external ?? existing.external,
    parentGroupId: incoming.parentGroupId ?? existing.parentGroupId,
  });
}

function parseFlowchartNode(line: string, defaultType: NodeType): ParsedNode | null {
  const patterns: Array<{ regex: RegExp; shape: string }> = [
    { regex: /^(\w+)\[\["([^"]*)"\]\]/, shape: 'subroutine' },
    { regex: /^(\w+)\[\("([^"]*)"\)\]/, shape: 'database' },
    { regex: /^(\w+)\{"([^"]*)"\}/, shape: 'diamond' },
    { regex: /^(\w+)\["([^"]*)"\]/, shape: 'rect' },
    { regex: /^(\w+)\(\("([^"]*)"\)\)/, shape: 'database' },
    { regex: /^(\w+)\(([^)]*)\)/, shape: 'rect' },
    { regex: /^(\w+)\[([^\]]*)\]/, shape: 'rect' },
    { regex: /^(\w+)$/, shape: 'rect' },
  ];

  const trimmed = line.trim();
  if (!trimmed || trimmed.includes('-->') || trimmed.includes('-.->')) return null;
  if (/^(graph|flowchart|subgraph|end)\b/i.test(trimmed)) return null;

  for (const { regex, shape } of patterns) {
    const match = trimmed.match(regex);
    if (match) {
      const id = slugify(match[1]);
      const rawName = match[2]?.trim() || match[1];
      const { name, external } = stripFlowchartLabelDecorations(rawName);
      const type = inferTypeFromShape(shape, defaultType);
      return { id, name, type, external: external || undefined };
    }
  }
  return null;
}

function parseFlowchartEdge(line: string): ParsedEdge | null {
  const dotted = line.match(
    /^([\w]+)(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?\s*-\.->\s*(?:\|"([^"]*)"\|\s*)?([\w]+)(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?\s*$/
  );
  if (dotted) {
    return {
      from: slugify(dotted[1]),
      to: slugify(dotted[3]),
      type: 'publish-subscribe',
      description: dotted[2]?.trim(),
    };
  }

  const solid = line.match(
    /^([\w]+)(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?\s*-->\s*(?:\|"([^"]*)"\|\s*)?([\w]+)(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?\s*$/
  );
  if (solid) {
    return {
      from: slugify(solid[1]),
      to: slugify(solid[3]),
      type: 'direct-call',
      description: solid[2]?.trim(),
    };
  }

  return null;
}

function extractNodesFromEdgeLine(line: string, defaultType: NodeType): ParsedNode[] {
  const nodes: ParsedNode[] = [];
  const fragments = line
    .split('-->')
    .flatMap(part => part.split('-.->'))
    .map(part => part.trim());
  for (const fragment of fragments) {
    const trimmed = fragment.replace(/\|"?[^"|]*"?\|/g, '').trim();
    const node = parseFlowchartNode(trimmed, defaultType);
    if (node) nodes.push(node);
  }
  return nodes;
}

export function parseFlowchart(source: string, options: MermaidImportOptions): MermaidParseResult {
  const warnings: string[] = [];
  const cleaned = stripComments(source);
  const defaultType = defaultTypeForLevel(options.targetLevel, options.defaultNodeType);

  const nodeMap = new Map<string, ParsedNode>();
  const edges: ParsedEdge[] = [];
  const subgraphStack: string[] = [];

  const currentParentGroupId = () =>
    subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1] : undefined;

  for (const rawLine of cleaned.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^end\b/i.test(line)) {
      if (subgraphStack.length > 0) {
        subgraphStack.pop();
      }
      continue;
    }

    const subgraph = parseSubgraphLine(line);
    if (subgraph) {
      if (subgraphStack.length > 0) {
        warnings.push('Nested subgraphs are flattened (one level of grouping supported).');
      }
      const groupId = slugify(subgraph.id);
      registerParsedNode(
        nodeMap,
        { id: groupId, name: subgraph.title, type: 'group' },
        currentParentGroupId()
      );
      subgraphStack.push(groupId);
      continue;
    }

    const edge = parseFlowchartEdge(line);
    if (edge) {
      edges.push(edge);
      for (const n of extractNodesFromEdgeLine(line, defaultType)) {
        if (!nodeMap.has(n.id)) {
          registerParsedNode(nodeMap, n, currentParentGroupId());
        }
      }
      if (!nodeMap.has(edge.from)) {
        registerParsedNode(
          nodeMap,
          { id: edge.from, name: edge.from, type: defaultType },
          currentParentGroupId()
        );
      }
      if (!nodeMap.has(edge.to)) {
        registerParsedNode(
          nodeMap,
          { id: edge.to, name: edge.to, type: defaultType },
          currentParentGroupId()
        );
      }
      continue;
    }

    const node = parseFlowchartNode(line, defaultType);
    if (node) {
      registerParsedNode(nodeMap, node, currentParentGroupId());
    }
  }

  const nodes = [...nodeMap.values()];
  const nodeIds = new Set(nodes.map(n => n.id));

  const schema = {
    name: 'Imported Flowchart',
    version: systemSchemaPublicUrl(),
    level: options.targetLevel,
    nodes: nodes.map(n => ({
      entityRef: n.id,
      type: n.type,
      name: n.name,
      external: n.external,
      ...(n.parentGroupId ? { parentEntityRef: n.parentGroupId } : {}),
    })),
    dependencies: edges
      .filter(e => nodeIds.has(e.from) && nodeIds.has(e.to))
      .map(e => ({
        from: e.from,
        to: e.to,
        type: e.type,
        description: e.description,
      })),
  };

  return {
    schema: scopeSchema(schema, options.parentEntityRef),
    format: 'flowchart',
    warnings,
  };
}
