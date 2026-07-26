import { load as parseYaml } from 'js-yaml';
import type { SystemSchema } from '../models/schema';
import { infraIrToSchema, type InfraImportOptions } from './infraSchemaMap';
import {
  normalizeIacSourceFilePath,
  type InfraEdge,
  type InfraIR,
  type InfraNode,
} from './infraIr';
import {
  pulumiTypeToProviderType,
  pythonQualifiedToPulumiType,
  tsQualifiedNameToPulumiType,
} from './pulumiTypeMap';

export type PulumiFormat = 'yaml' | 'typescript' | 'python';

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

interface PulumiYamlResource {
  type?: string;
  properties?: Record<string, unknown>;
  options?: Record<string, unknown>;
  get?: Record<string, unknown>;
}

function detectFormat(source: string, path: string, forced?: PulumiFormat | 'auto'): PulumiFormat {
  if (forced === 'yaml' || forced === 'typescript' || forced === 'python') return forced;
  if (/\.py$/i.test(path)) return 'python';
  if (/\.tsx?$/i.test(path)) return 'typescript';
  if (/\.ya?ml$/i.test(path)) return 'yaml';
  const trimmed = source.trim();
  if (/^import\s/m.test(trimmed) || /\bnew\s+[\w.]+\(/.test(trimmed)) return 'typescript';
  return 'yaml';
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

function collectPulumiInterpolationRefs(value: unknown, out: Set<string>): void {
  if (typeof value === 'string') {
    const re = /\$\{([^}.]+)(?:\.[^}]*)?\}/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(value)) !== null) {
      if (match[1]) out.add(match[1]);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPulumiInterpolationRefs(item, out);
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) collectPulumiInterpolationRefs(child, out);
  }
}

function yamlResourcesToNodes(
  doc: Record<string, unknown>,
  fileLabel: string,
  nodes: InfraNode[],
  seen: Map<string, string>
): Map<string, string> {
  const keyToAddress = new Map<string, string>();
  const resources = doc.resources;
  if (typeof resources !== 'object' || resources === null) return keyToAddress;

  for (const [key, raw] of Object.entries(resources as Record<string, unknown>)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const resource = raw as PulumiYamlResource;
    const pulumiType = typeof resource.type === 'string' ? resource.type : '';
    if (!pulumiType) continue;

    const address = `${pulumiType}.${key}`;
    const providerType = pulumiTypeToProviderType(pulumiType);
    const body: Record<string, unknown> = {
      ...(resource.properties ?? {}),
      ...(resource.options ? { options: resource.options } : {}),
    };

    pushNode(nodes, seen, fileLabel, {
      address,
      kind: resource.get ? 'data' : 'resource',
      providerType,
      name: key,
      hasExpansion: false,
      body,
    });
    keyToAddress.set(key, address);
  }

  return keyToAddress;
}

function buildYamlEdges(
  nodes: InfraNode[],
  keyToAddress: Map<string, string>,
  warnings: string[]
): InfraEdge[] {
  const edges: InfraEdge[] = [];
  const edgeKeys = new Set<string>();
  const addressSet = new Set(nodes.map(n => n.address));

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
    const refs = new Set<string>();
    collectPulumiInterpolationRefs(node.body, refs);
    for (const refKey of refs) {
      const target = keyToAddress.get(refKey);
      if (!target) {
        warnings.push(`unresolved-ref:\${${refKey}}`);
        continue;
      }
      addEdge(node.address, target, `\${${refKey}}`);
    }
  }

  return edges;
}

function yamlDocumentToInfraIR(
  docs: Array<{ label: string; doc: Record<string, unknown> }>
): InfraIR {
  const nodes: InfraNode[] = [];
  const seen = new Map<string, string>();
  const allKeyToAddress = new Map<string, string>();
  const warnings: string[] = [];

  for (const { label, doc } of docs) {
    const keyToAddress = yamlResourcesToNodes(doc, label, nodes, seen);
    for (const [key, address] of keyToAddress) {
      allKeyToAddress.set(key, address);
    }
  }

  const edges = buildYamlEdges(nodes, allKeyToAddress, warnings);
  return { nodes, edges, warnings };
}

function parseYamlDocument(source: string): Record<string, unknown> {
  const parsed: unknown = parseYaml(source);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Pulumi YAML root must be an object');
  }
  return parsed as Record<string, unknown>;
}

function splitDeclarationRegions(
  source: string
): Array<{ varName: string; start: number; end: number }> {
  const declRe = /(?:const|let)\s+(\w+)\s*=\s*new\s+[\w.]+\(\s*["'][^"']+["']/g;
  const regions: Array<{ varName: string; start: number; end: number }> = [];
  let match: RegExpExecArray | null;
  const starts: Array<{ varName: string; start: number }> = [];

  while ((match = declRe.exec(source)) !== null) {
    if (match[1]) starts.push({ varName: match[1], start: match.index });
  }

  for (let i = 0; i < starts.length; i++) {
    const current = starts[i];
    const next = starts[i + 1];
    regions.push({
      varName: current.varName,
      start: current.start,
      end: next ? next.start : source.length,
    });
  }

  return regions;
}

function typescriptSourceToInfraIR(source: string, fileLabel: string): InfraIR {
  const nodes: InfraNode[] = [];
  const seen = new Map<string, string>();
  const varToAddress = new Map<string, string>();
  const warnings: string[] = [];

  const declRe = /(?:const|let)\s+(\w+)\s*=\s*new\s+([\w.]+)\(\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = declRe.exec(source)) !== null) {
    const varName = match[1];
    const qualified = match[2];
    const logicalName = match[3];
    if (!varName || !qualified || !logicalName) continue;

    const pulumiType = tsQualifiedNameToPulumiType(qualified);
    const address = `${pulumiType}.${logicalName}`;
    const providerType = pulumiTypeToProviderType(pulumiType);

    pushNode(nodes, seen, fileLabel, {
      address,
      kind: 'resource',
      providerType,
      name: logicalName,
      hasExpansion: false,
      body: {},
    });
    varToAddress.set(varName, address);
  }

  const edges: InfraEdge[] = [];
  const edgeKeys = new Set<string>();
  const addressSet = new Set(nodes.map(n => n.address));

  const addEdge = (from: string, to: string, via: string) => {
    if (from === to) return;
    if (!addressSet.has(to)) return;
    const key = `${from}->${to}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to, via });
  };

  const regions = splitDeclarationRegions(source);
  for (const region of regions) {
    const fromAddress = varToAddress.get(region.varName);
    if (!fromAddress) continue;
    const chunk = source.slice(region.start, region.end);
    for (const [toVar, toAddress] of varToAddress) {
      if (toVar === region.varName) continue;
      const refRe = new RegExp(`\\b${toVar}(?:\\.[\\w]+)?\\b`);
      if (refRe.test(chunk)) {
        addEdge(fromAddress, toAddress, toVar);
      }
    }
  }

  return { nodes, edges, warnings };
}

function isIdentChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    (code >= 48 && code <= 57) ||
    char === '_'
  );
}

function readLeadingQuotedString(input: string): { value: string } | null {
  let i = 0;
  while (i < input.length) {
    const char = input[i];
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      i++;
      continue;
    }
    break;
  }
  const quote = input[i];
  if (quote !== '"' && quote !== "'") return null;
  i++;
  const start = i;
  while (i < input.length && input[i] !== quote) i++;
  if (i >= input.length) return null;
  return { value: input.slice(start, i) };
}

function splitPythonImportEntry(entry: string): { symbol: string; alias?: string } {
  const lower = entry.toLowerCase();
  const asIdx = lower.indexOf(' as ');
  if (asIdx === -1) {
    return { symbol: entry.trim() };
  }
  return {
    symbol: entry.slice(0, asIdx).trim(),
    alias: entry.slice(asIdx + 4).trim(),
  };
}

function buildPythonImportMap(source: string): Map<string, string> {
  const map = new Map<string, string>();

  for (const rawLine of source.split(/\r?\n/)) {
    const trimmed = rawLine.trimStart();

    if (trimmed.startsWith('from ')) {
      const importIdx = trimmed.indexOf(' import ');
      if (importIdx === -1) continue;
      const module = trimmed.slice('from '.length, importIdx).trim();
      const importedPart = trimmed.slice(importIdx + ' import '.length).trim();
      const imported = importedPart
        .split(',')
        .map(part => part.split('#')[0].trim())
        .filter(Boolean);
      for (const entry of imported) {
        const { symbol, alias } = splitPythonImportEntry(entry);
        if (!symbol || symbol.endsWith('Args')) continue;
        map.set(alias || symbol, `${module}.${symbol}`);
      }
      continue;
    }

    if (trimmed.startsWith('import ')) {
      const body = trimmed.slice('import '.length).trim();
      const lower = body.toLowerCase();
      const asIdx = lower.indexOf(' as ');
      const module = asIdx === -1 ? body : body.slice(0, asIdx).trim();
      const alias = asIdx === -1 ? undefined : body.slice(asIdx + 4).trim();
      if (!module) continue;
      map.set(alias ?? module.split('.').pop() ?? module, module);
    }
  }

  return map;
}

function resolvePythonConstructor(name: string, importMap: Map<string, string>): string {
  if (name.includes('.')) {
    const [root, ...rest] = name.split('.');
    const moduleBase = root ? importMap.get(root) : undefined;
    if (moduleBase && rest.length > 0) {
      return pythonQualifiedToPulumiType(`${moduleBase}.${rest.join('.')}`);
    }
    return pythonQualifiedToPulumiType(name);
  }

  const qualified = importMap.get(name);
  if (!qualified) return name;
  return pythonQualifiedToPulumiType(qualified);
}

interface PythonResourceDeclaration {
  varName: string;
  constructor: string;
  logicalName: string;
  index: number;
}

function findPythonResourceDeclarations(source: string): PythonResourceDeclaration[] {
  const matches: PythonResourceDeclaration[] = [];
  let lineStart = 0;

  while (lineStart <= source.length) {
    const lineEnd = source.indexOf('\n', lineStart);
    const line = lineEnd === -1 ? source.slice(lineStart) : source.slice(lineStart, lineEnd);

    let i = 0;
    while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++;

    const varStart = i;
    while (i < line.length && isIdentChar(line[i])) i++;
    if (i > varStart) {
      const varName = line.slice(varStart, i);

      while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++;
      if (line[i] === '=') {
        i++;
        while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++;

        const ctorStart = i;
        while (i < line.length && (isIdentChar(line[i]) || line[i] === '.')) i++;
        if (i > ctorStart) {
          const constructor = line.slice(ctorStart, i);
          while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++;

          if (line[i] === '(') {
            i++;
            const quoted =
              readLeadingQuotedString(line.slice(i)) ??
              readLeadingQuotedString(source.slice(lineStart + i));
            if (quoted) {
              matches.push({
                varName,
                constructor,
                logicalName: quoted.value,
                index: lineStart,
              });
            }
          }
        }
      }
    }

    if (lineEnd === -1) break;
    lineStart = lineEnd + 1;
  }

  return matches;
}

function splitPythonDeclarationRegions(
  source: string
): Array<{ varName: string; start: number; end: number }> {
  const decls = findPythonResourceDeclarations(source);
  return decls.map((decl, index) => ({
    varName: decl.varName,
    start: decl.index,
    end: decls[index + 1]?.index ?? source.length,
  }));
}

function pythonSourceToInfraIR(source: string, fileLabel: string): InfraIR {
  const nodes: InfraNode[] = [];
  const seen = new Map<string, string>();
  const varToAddress = new Map<string, string>();
  const warnings: string[] = [];
  const importMap = buildPythonImportMap(source);

  for (const decl of findPythonResourceDeclarations(source)) {
    const { varName, constructor, logicalName } = decl;

    const pulumiType = resolvePythonConstructor(constructor, importMap);
    if (!pulumiType.includes(':')) continue;

    const address = `${pulumiType}.${logicalName}`;
    const providerType = pulumiTypeToProviderType(pulumiType);

    pushNode(nodes, seen, fileLabel, {
      address,
      kind: 'resource',
      providerType,
      name: logicalName,
      hasExpansion: false,
      body: {},
    });
    varToAddress.set(varName, address);
  }

  const edges: InfraEdge[] = [];
  const edgeKeys = new Set<string>();
  const addressSet = new Set(nodes.map(n => n.address));

  const addEdge = (from: string, to: string, via: string) => {
    if (from === to) return;
    if (!addressSet.has(to)) return;
    const key = `${from}->${to}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to, via });
  };

  const regions = splitPythonDeclarationRegions(source);
  for (const region of regions) {
    const fromAddress = varToAddress.get(region.varName);
    if (!fromAddress) continue;
    const chunk = source.slice(region.start, region.end);
    for (const [toVar, toAddress] of varToAddress) {
      if (toVar === region.varName) continue;
      const refRe = new RegExp(`\\b${toVar}(?:\\.[\\w]+)?\\b`);
      if (refRe.test(chunk)) {
        addEdge(fromAddress, toAddress, toVar);
      }
    }
  }

  return { nodes, edges, warnings };
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

export {
  pulumiTypeToProviderType,
  pythonQualifiedToPulumiType,
  tsQualifiedNameToPulumiType,
} from './pulumiTypeMap';
