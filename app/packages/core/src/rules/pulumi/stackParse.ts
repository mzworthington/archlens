import { load as parseYaml } from 'js-yaml';
import type { InfraEdge, InfraIR, InfraNode } from '../infra/infraIr';
import { buildYamlEdges, pushNode, yamlResourcesToNodes } from './resourceMap';
import {
  pulumiTypeToProviderType,
  pythonQualifiedToPulumiType,
  tsQualifiedNameToPulumiType,
} from './typeMap';

export type PulumiFormat = 'yaml' | 'typescript' | 'python';

export function detectFormat(
  source: string,
  path: string,
  forced?: PulumiFormat | 'auto'
): PulumiFormat {
  if (forced === 'yaml' || forced === 'typescript' || forced === 'python') return forced;
  if (/\.py$/i.test(path)) return 'python';
  if (/\.tsx?$/i.test(path)) return 'typescript';
  if (/\.ya?ml$/i.test(path)) return 'yaml';
  const trimmed = source.trim();
  if (/^import\s/m.test(trimmed) || /\bnew\s+[\w.]+\(/.test(trimmed)) return 'typescript';
  return 'yaml';
}

export function parseYamlDocument(source: string): Record<string, unknown> {
  const parsed: unknown = parseYaml(source);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Pulumi YAML root must be an object');
  }
  return parsed as Record<string, unknown>;
}

export function yamlDocumentToInfraIR(
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

export function typescriptSourceToInfraIR(source: string, fileLabel: string): InfraIR {
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

export function pythonSourceToInfraIR(source: string, fileLabel: string): InfraIR {
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
