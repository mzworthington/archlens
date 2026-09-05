import type { SystemSchema } from '../../models/schema';
import { infraIrToSchema, type InfraImportOptions } from '../infra/infraSchemaMap';
import type { InfraEdge, InfraIR, InfraNode } from '../infra/infraIr';
import { buildYamlEdges, yamlResourcesToNodes } from './resourceMap';
import {
  detectFormat,
  parseYamlDocument,
  pythonSourceToInfraIR,
  typescriptSourceToInfraIR,
  yamlDocumentToInfraIR,
  type PulumiFormat,
} from './stackParse';

export type { PulumiFormat };

export interface PulumiImportOptions extends InfraImportOptions {
  /** Force format; default auto-detects YAML vs TypeScript. */
  sourceFormat?: PulumiFormat | 'auto';
}

export interface PulumiParseResult {
  schema: SystemSchema;
  format: PulumiFormat;
  warnings: string[];
}

export interface PulumiSourceFile {
  path: string;
  content: string;
  sourceFormat?: PulumiFormat | 'auto';
}

function mergeInfraIR(parts: InfraIR[]): InfraIR {
  const nodes: InfraNode[] = [];
  const edges: InfraEdge[] = [];
  const warnings: string[] = [];
  const edgeKeys = new Set<string>();

  for (const part of parts) {
    nodes.push(...part.nodes);
    warnings.push(...part.warnings);
    for (const edge of part.edges) {
      const key = `${edge.from}->${edge.to}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push(edge);
    }
  }

  return { nodes, edges, warnings };
}

/** Pull Pulumi YAML out of a markdown fenced block when present. */
export function extractPulumiFromMarkdown(text: string): string {
  // [ \t]* (not \s*) avoids newline backtracking / ReDoS.
  const fence = /```(?:yaml|yml|pulumi)?[ \t]*\n([\s\S]*?)```/i.exec(text);
  if (fence?.[1]) return fence[1].trim();
  return text.trim();
}

export function parsePulumiToSchema(
  source: string,
  options: PulumiImportOptions
): PulumiParseResult {
  const path = options.sourceFormat === 'typescript' ? 'index.ts' : 'Pulumi.yaml';
  const format = detectFormat(source, path, options.sourceFormat ?? 'auto');

  let ir: InfraIR;
  if (format === 'typescript') {
    ir = typescriptSourceToInfraIR(source, '<input>');
  } else if (format === 'python') {
    ir = pythonSourceToInfraIR(source, '<input>');
  } else {
    const doc = parseYamlDocument(source);
    ir = yamlDocumentToInfraIR([{ label: '<input>', doc }]);
  }

  const { schema, warnings } = infraIrToSchema(ir, options);
  return { schema, format, warnings };
}

export function parsePulumiBatchToSchema(
  files: PulumiSourceFile[],
  options: PulumiImportOptions
): PulumiParseResult {
  if (files.length === 0) {
    return {
      schema: {
        name: 'infrastructure',
        version: '0.1.0',
        level: options.targetLevel,
        nodes: [],
        dependencies: [],
        ...(options.parentEntityRef ? { entityRef: options.parentEntityRef } : {}),
      },
      format: 'yaml',
      warnings: [],
    };
  }

  const yamlDocs: Array<{ label: string; doc: Record<string, unknown> }> = [];
  const tsFiles: PulumiSourceFile[] = [];
  const pyFiles: PulumiSourceFile[] = [];
  let format: PulumiFormat = 'yaml';

  for (const file of files) {
    const detected = detectFormat(file.content, file.path, file.sourceFormat ?? 'auto');
    format = detected;
    if (detected === 'typescript') {
      tsFiles.push(file);
    } else if (detected === 'python') {
      pyFiles.push(file);
    } else {
      yamlDocs.push({ label: file.path, doc: parseYamlDocument(file.content) });
    }
  }

  const parts: InfraIR[] = [];
  if (yamlDocs.length > 0) {
    const nodes: InfraNode[] = [];
    const seen = new Map<string, string>();
    const allKeyToAddress = new Map<string, string>();
    const warnings: string[] = [];

    for (const { label, doc } of yamlDocs) {
      const keyToAddress = yamlResourcesToNodes(doc, label, nodes, seen);
      for (const [key, address] of keyToAddress) {
        allKeyToAddress.set(key, address);
      }
    }

    parts.push({
      nodes,
      edges: buildYamlEdges(nodes, allKeyToAddress, warnings),
      warnings,
    });
  }

  for (const file of tsFiles) {
    parts.push(typescriptSourceToInfraIR(file.content, file.path));
  }

  for (const file of pyFiles) {
    parts.push(pythonSourceToInfraIR(file.content, file.path));
  }

  const ir = parts.length === 1 ? parts[0] : mergeInfraIR(parts);
  const { schema, warnings } = infraIrToSchema(ir, options);
  return { schema, format, warnings };
}
