import type { C4Level, NodeType } from '../../models/schema';
import { systemSchemaPublicUrl } from '../../models/schemaVersion';
import { slugify } from '../../lib/slug';
import type {
  MermaidFormat,
  MermaidImportOptions,
  MermaidParseResult,
  ParsedEdge,
  ParsedNode,
} from './types';
import { scopeSchema } from './types';

function parseC4Element(line: string): ParsedNode | null {
  const patterns: Array<{
    regex: RegExp;
    type: NodeType;
    external?: boolean;
  }> = [
    { regex: /^Person\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i, type: 'person' },
    {
      regex: /^System_Ext\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i,
      type: 'software-system',
      external: true,
    },
    {
      regex: /^SystemDb_Ext\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i,
      type: 'relational-database',
      external: true,
    },
    { regex: /^System\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i, type: 'software-system' },
    { regex: /^ContainerDb\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i, type: 'relational-database' },
    { regex: /^ContainerQueue\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i, type: 'event-broker' },
    { regex: /^Container\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i, type: 'container' },
    { regex: /^Component\s*\(\s*([^,)]+)\s*,\s*"([^"]*)"/i, type: 'component' },
  ];

  for (const { regex, type, external } of patterns) {
    const match = line.match(regex);
    if (match) {
      const alias = slugify(match[1].trim());
      return { id: alias, name: match[2].trim(), type, external };
    }
  }
  return null;
}

function parseC4Rel(line: string): ParsedEdge | null {
  const match = line.match(
    /^Rel(?:_U|_D|_L|_R)?\s*\(\s*([^\s,)]+)\s*,\s*([^\s,)]+)(?:\s*,\s*"([^"]*)")?\s*\)/i
  );
  if (!match) return null;
  return {
    from: slugify(match[1]),
    to: slugify(match[2]),
    type: 'direct-call',
    description: match[3]?.trim() || undefined,
  };
}

export function parseC4(
  source: string,
  format: MermaidFormat,
  options: MermaidImportOptions
): MermaidParseResult {
  const warnings: string[] = [];
  const nodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];
  const nodeIds = new Set<string>();

  const levelMap: Record<string, C4Level> = {
    'c4-context': 'context',
    'c4-container': 'container',
    'c4-component': 'component',
  };

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();
    if (!line || /^C4/i.test(line) || /^title\b/i.test(line)) continue;
    if (/^(Enterprise_Boundary|System_Boundary|Boundary|Container_Boundary)\b/i.test(line)) {
      warnings.push(`Skipped boundary declaration: ${line.slice(0, 60)}`);
      continue;
    }
    if (/^(UpdateElementStyle|UpdateRelStyle|Lay_)/i.test(line)) {
      warnings.push(`Skipped styling directive: ${line.slice(0, 60)}`);
      continue;
    }

    const element = parseC4Element(line);
    if (element) {
      nodes.push(element);
      nodeIds.add(element.id);
      continue;
    }

    const rel = parseC4Rel(line);
    if (rel) {
      edges.push(rel);
    }
  }

  const schema = {
    name: 'Imported C4 Diagram',
    version: systemSchemaPublicUrl(),
    level: levelMap[format] ?? options.targetLevel,
    nodes: nodes.map(n => ({
      entityRef: n.id,
      type: n.type,
      name: n.name,
      external: n.external,
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
    format,
    warnings,
  };
}
