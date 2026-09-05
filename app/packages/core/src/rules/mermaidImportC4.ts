import type { C4Level, NodeType } from '../models/schema';
import { slugify } from '../lib/slug';
import {
  schemaFromParsed,
  type MermaidFormat,
  type MermaidImportOptions,
  type MermaidParseResult,
  type ParsedEdge,
  type ParsedNode,
} from './mermaidImportShared';

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
  // [^\s,)] - exclude whitespace so \s* cannot overlap (CodeQL js/polynomial-redos).
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
      continue;
    }

    const rel = parseC4Rel(line);
    if (rel) {
      edges.push(rel);
    }
  }

  return {
    schema: schemaFromParsed(
      'Imported C4 Diagram',
      levelMap[format] ?? options.targetLevel,
      nodes,
      edges,
      options.parentEntityRef
    ),
    format,
    warnings,
  };
}
