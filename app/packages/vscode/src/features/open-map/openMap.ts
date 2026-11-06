import { parseSchemaFromYaml } from '@archlens/core/blueprint';
import type { SystemSchema } from '@archlens/core/blueprint';
import { EMPTY_MAP_MESSAGE, UNTRUSTED_FOLDER_MESSAGE } from '../../copy';

export interface MapFile {
  path: string;
  content: string;
}

export type CandidateRead = { status: 'ok'; files: MapFile[] } | { status: 'cancelled' };

export interface MapHost {
  isTrusted(): boolean;
  readCandidates(): Promise<CandidateRead>;
}

export interface DiagramSystem {
  name: string;
  entityRef: string;
}

export interface DiagramLink {
  fromName: string;
  toName: string;
  fromRef: string;
  toRef: string;
}

export interface DiagramView {
  diagramName: string;
  sourcePath: string;
  systems: DiagramSystem[];
  links: DiagramLink[];
}

export type OpenMapResult =
  | { kind: 'blocked'; message: typeof UNTRUSTED_FOLDER_MESSAGE }
  | { kind: 'cancelled' }
  | { kind: 'empty'; message: typeof EMPTY_MAP_MESSAGE }
  | { kind: 'not-blueprint' }
  | { kind: 'diagram'; view: DiagramView };

export interface MapSelection {
  invokedPath?: string;
  activePath?: string;
}

interface ParsedFile {
  path: string;
  schema?: SystemSchema;
}

export function linkText(link: DiagramLink): string {
  return `${link.fromName} to ${link.toName}`;
}

export function projectDiagram(schema: SystemSchema, sourcePath: string): DiagramView {
  const names = new Map(schema.nodes.map(node => [node.entityRef, node.name]));
  return {
    diagramName: schema.name,
    sourcePath,
    systems: schema.nodes.map(node => ({ name: node.name, entityRef: node.entityRef })),
    links: schema.dependencies.map(link => ({
      fromName: names.get(link.from) ?? link.from,
      toName: names.get(link.to) ?? link.to,
      fromRef: link.from,
      toRef: link.to,
    })),
  };
}

export function tryParseBlueprint(content: string): SystemSchema | undefined {
  try {
    return parseSchemaFromYaml(content);
  } catch (error: unknown) {
    if (error instanceof Error) return undefined;
    return undefined;
  }
}

export function selectBlueprint(files: MapFile[], selection: MapSelection = {}): OpenMapResult {
  const parsed: ParsedFile[] = files.map(file => ({
    path: file.path,
    schema: tryParseBlueprint(file.content),
  }));
  if (selection.invokedPath) {
    const invoked = parsed.find(file => file.path === selection.invokedPath);
    if (!invoked?.schema) return { kind: 'not-blueprint' };
    return { kind: 'diagram', view: projectDiagram(invoked.schema, invoked.path) };
  }
  if (selection.activePath) {
    const active = parsed.find(file => file.path === selection.activePath && file.schema);
    if (active?.schema)
      return { kind: 'diagram', view: projectDiagram(active.schema, active.path) };
  }
  const valid = parsed.filter((file): file is ParsedFile & { schema: SystemSchema } =>
    Boolean(file.schema)
  );
  const contexts = valid.filter(file => file.schema.level === 'context');
  const pool = contexts.length > 0 ? contexts : valid;
  const chosen = [...pool].sort((a, b) => a.path.localeCompare(b.path))[0];
  if (!chosen) return { kind: 'empty', message: EMPTY_MAP_MESSAGE };
  return { kind: 'diagram', view: projectDiagram(chosen.schema, chosen.path) };
}

export function previewAfterSave(
  current: DiagramView,
  saved: { path: string; content: string }
): { kind: 'unchanged'; view: DiagramView } | { kind: 'diagram'; view: DiagramView } {
  if (saved.path !== current.sourcePath) return { kind: 'unchanged', view: current };
  const schema = tryParseBlueprint(saved.content);
  if (!schema) return { kind: 'unchanged', view: current };
  return { kind: 'diagram', view: projectDiagram(schema, saved.path) };
}

export async function openArchitectureMap(
  host: MapHost,
  selection: MapSelection = {}
): Promise<OpenMapResult> {
  if (!host.isTrusted()) {
    return { kind: 'blocked', message: UNTRUSTED_FOLDER_MESSAGE };
  }
  const read = await host.readCandidates();
  if (read.status === 'cancelled') return { kind: 'cancelled' };
  return selectBlueprint(read.files, selection);
}
