import {
  parseSchemaFromYaml,
  serializeSchemaToMermaid,
  validateGraph,
  type NodeForensics,
  type SystemSchema,
} from '@archlens/core';
import type { BlueprintFile, DiagramCrumb, DiagramView, GenerateChoice } from './ports';

export const TRUST_COPY = 'ArchLens does not read this folder until the workspace is trusted.';
export const EMPTY_MAP_COPY = 'No map in this folder.';
export const GENERATE_TITLE = 'Generate diagram from workspace';
export const GENERATE_OFF_COPY = 'Generating a diagram from code is turned off in this preview.';
export const TELL_US_COPY = 'Tell us you want this';
export const CANCEL_COPY = 'Cancel';
export const INTEREST_DISCUSSION_URL = 'https://github.com/mzworthington/archlens/discussions';
export const NO_SOURCE_COPY = 'This system has no source file in the workspace.';
export const NO_LOWER_COPY = 'No lower diagram for this system.';
export const NOTHING_TO_COPY = 'Nothing to copy.';
export const NO_GIT_HOTSPOTS_COPY = 'Hotspots need a git history for this folder.';

const DEFAULT_BLUEPRINTS_FOLDER = 'blueprints';

export type OpenMapDecision =
  | { readonly kind: 'diagram'; readonly diagram: DiagramView }
  | { readonly kind: 'empty' }
  | { readonly kind: 'not-blueprint' };

export type GenerateDecision =
  | { readonly kind: 'untrusted'; readonly message: string }
  | {
      readonly kind: 'prompt';
      readonly title: string;
      readonly message: string;
      readonly tellLabel: string;
      readonly cancelLabel: string;
      readonly readsSource: false;
    }
  | { readonly kind: 'open-discussion'; readonly url: string; readonly readsSource: false }
  | { readonly kind: 'closed'; readonly readsSource: false };

export function safeBlueprintsFolder(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '' || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
    return DEFAULT_BLUEPRINTS_FOLDER;
  }
  return trimmed;
}

export function decideOpenMap(input: {
  files: readonly BlueprintFile[];
  selectedPath?: string;
  blueprintsFolder?: string;
}): OpenMapDecision {
  if (input.selectedPath) {
    const selected = input.files.find(file => file.path === input.selectedPath);
    if (!selected) return { kind: 'not-blueprint' };
    const diagram = projectFile(selected);
    return diagram ? { kind: 'diagram', diagram } : { kind: 'not-blueprint' };
  }

  const folderName = safeBlueprintsFolder(input.blueprintsFolder ?? DEFAULT_BLUEPRINTS_FOLDER);
  const diagrams = input.files
    .filter(file => pathHasSegment(file.path, folderName))
    .flatMap(file => {
      const diagram = projectFile(file);
      return diagram ? [diagram] : [];
    })
    .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));

  const context = diagrams.find(diagram => isContextFile(diagram.sourcePath)) ?? diagrams[0];
  return context ? { kind: 'diagram', diagram: context } : { kind: 'empty' };
}

export function generateDecision(input: {
  trusted: boolean;
  enabled: boolean;
  choice?: GenerateChoice;
}): GenerateDecision {
  if (!input.trusted) {
    return { kind: 'untrusted', message: TRUST_COPY };
  }

  return decisionForChoice(input.choice);
}

function decisionForChoice(choice: GenerateChoice | undefined): GenerateDecision {
  switch (choice) {
    case 'tell':
      return {
        kind: 'open-discussion',
        url: INTEREST_DISCUSSION_URL,
        readsSource: false,
      };
    case 'cancel':
    case 'escape':
      return { kind: 'closed', readsSource: false };
    case undefined:
      return {
        kind: 'prompt',
        title: GENERATE_TITLE,
        message: GENERATE_OFF_COPY,
        tellLabel: TELL_US_COPY,
        cancelLabel: CANCEL_COPY,
        readsSource: false,
      };
    default: {
      const unexpected: never = choice;
      return unexpected;
    }
  }
}

export type OpenSourceDecision =
  | { readonly kind: 'open'; readonly path: string; readonly status: string }
  | { readonly kind: 'missing'; readonly message: string };

/** A source path is usable only when it stays inside the workspace root. */
export function resolveSourceFile(input: {
  sourceFile: string;
  workspaceRoot: string;
}): string | undefined {
  const root = normalizeEditorPath(input.workspaceRoot);
  const requested = normalizeEditorPath(input.sourceFile.trim());
  if (root.length === 0 || requested.length === 0) return undefined;
  if (requested.split('/').includes('..')) return undefined;
  const absolute = isAbsoluteEditorPath(requested) ? requested : `${root}/${requested}`;
  return isInsideEditorPath(absolute, root) && absolute !== root ? absolute : undefined;
}

export interface BlueprintProblem {
  readonly message: string;
  readonly line: number;
}

/** Problems for a blueprint. A YAML file that is not a blueprint contributes none. */
export function blueprintProblems(content: string): readonly BlueprintProblem[] {
  let schema: SystemSchema;
  try {
    schema = parseSchemaFromYaml(content);
  } catch (error) {
    if (!looksLikeBlueprint(content)) return [];
    return [{ message: plainSchemaMessage(error), line: 0 }];
  }

  const issues = validateGraph(schema).issues;
  const cycle = issues.find(issue => issue.type === 'cycle' && issue.path);
  if (cycle?.path) {
    return [{ message: cycleSentence(schema, cycle.path), line: lineOf(content, cycle.path[0]) }];
  }

  const first = issues[0];
  return first ? [{ message: first.message, line: 0 }] : [];
}

export type DrillDecision =
  | { readonly kind: 'child'; readonly diagram: DiagramView; readonly schema: SystemSchema }
  | { readonly kind: 'none'; readonly message: string };

/** Enter drills into the child diagram whose identity is the focused system. */
export function decideDrill(input: {
  files: readonly BlueprintFile[];
  focusedEntityRef?: string;
  currentPath: string;
}): DrillDecision {
  if (!input.focusedEntityRef) return { kind: 'none', message: NO_LOWER_COPY };
  const child = input.files
    .filter(file => !sameEditorPath(file.path, input.currentPath))
    .map(readBlueprint)
    .filter((blueprint): blueprint is ParsedBlueprint => blueprint !== undefined)
    .filter(
      blueprint =>
        blueprint.schema.entityRef === input.focusedEntityRef &&
        blueprint.schema.level !== 'context'
    )
    .sort((left, right) => left.diagram.sourcePath.localeCompare(right.diagram.sourcePath))[0];
  return child
    ? { kind: 'child', diagram: child.diagram, schema: child.schema }
    : { kind: 'none', message: NO_LOWER_COPY };
}

export type BackDecision =
  | {
      readonly kind: 'parent';
      readonly diagram: DiagramView;
      readonly schema: SystemSchema;
      readonly breadcrumb: readonly DiagramCrumb[];
    }
  | { readonly kind: 'stay' };

/** Alt+Left, or a parent in the breadcrumb, returns that diagram. */
export function decideBack(input: {
  breadcrumb: readonly DiagramCrumb[];
  files: readonly BlueprintFile[];
  sourcePath?: string;
}): BackDecision {
  const index = input.sourcePath
    ? input.breadcrumb.findIndex(crumb => sameEditorPath(crumb.sourcePath, input.sourcePath ?? ''))
    : input.breadcrumb.length - 2;
  if (index < 0 || index >= input.breadcrumb.length - 1) return { kind: 'stay' };
  const crumb = input.breadcrumb[index];
  if (!crumb) return { kind: 'stay' };
  const file = input.files.find(candidate => sameEditorPath(candidate.path, crumb.sourcePath));
  const blueprint = file ? readBlueprint(file) : undefined;
  if (!blueprint) return { kind: 'stay' };
  return {
    kind: 'parent',
    diagram: blueprint.diagram,
    schema: blueprint.schema,
    breadcrumb: input.breadcrumb.slice(0, index + 1),
  };
}

export type CopyDecision =
  | { readonly kind: 'copy'; readonly text: string }
  | { readonly kind: 'empty'; readonly message: string };

export type ShowHotspotsDecision =
  | { readonly kind: 'untrusted'; readonly message: string }
  | { readonly kind: 'no-git'; readonly message: string }
  | { readonly kind: 'show' }
  | { readonly kind: 'hide' };

/** Hotspot marks come from the blueprint. A folder with no git history stays unmarked. */
export function decideShowHotspots(input: {
  trusted: boolean;
  hasGitHistory: boolean;
  showing: boolean;
}): ShowHotspotsDecision {
  if (!input.trusted) return { kind: 'untrusted', message: TRUST_COPY };
  if (input.showing) return { kind: 'hide' };
  if (!input.hasGitHistory) return { kind: 'no-git', message: NO_GIT_HOTSPOTS_COPY };
  return { kind: 'show' };
}

/** Overlay recorded hotspot signals. Turning them off leaves the systems as they were. */
export function presentHotspots(
  diagram: DiagramView,
  nodes: readonly { entityRef: string; forensics?: NodeForensics }[],
  on: boolean
): DiagramView {
  const counts = on ? hotspotCounts(nodes) : new Map<string, number>();
  return {
    ...diagram,
    systems: diagram.systems.map(system => {
      const count = counts.get(system.entityRef);
      const plain = {
        name: system.name,
        entityRef: system.entityRef,
        ...(system.sourceFile ? { sourceFile: system.sourceFile } : {}),
      };
      return count === undefined ? plain : { ...plain, hotspotCount: count };
    }),
  };
}

/** Mermaid is a picture of the systems on screen. It does not change the YAML. */
export function decideCopyMermaid(schema: SystemSchema | undefined): CopyDecision {
  if (!schema || schema.nodes.length === 0) {
    return { kind: 'empty', message: NOTHING_TO_COPY };
  }
  return { kind: 'copy', text: serializeSchemaToMermaid(schema) };
}

export function decideOpenSource(input: {
  systemName?: string;
  sourceFile?: string;
  resolvedPath?: string;
}): OpenSourceDecision {
  if (!input.systemName || !input.sourceFile || !input.resolvedPath) {
    return { kind: 'missing', message: NO_SOURCE_COPY };
  }
  return {
    kind: 'open',
    path: input.resolvedPath,
    status: `Opened ${input.resolvedPath} from ${input.systemName}.`,
  };
}

interface ParsedBlueprint {
  readonly diagram: DiagramView;
  readonly schema: SystemSchema;
}

function readBlueprint(file: BlueprintFile): ParsedBlueprint | undefined {
  const diagram = projectFile(file);
  if (!diagram) return undefined;
  try {
    return { diagram, schema: parseSchemaFromYaml(file.content) };
  } catch {
    return undefined;
  }
}

function projectFile(file: BlueprintFile): DiagramView | undefined {
  try {
    const schema = parseSchemaFromYaml(file.content);
    return {
      sourcePath: file.path,
      systems: schema.nodes.map(node => {
        const sourceFile = sourceFileOf(node.properties?.filepath);
        return {
          name: node.name,
          entityRef: node.entityRef,
          ...(sourceFile ? { sourceFile } : {}),
        };
      }),
      links: schema.dependencies.map(dependency => ({
        fromName: nameFor(schema, dependency.from),
        toName: nameFor(schema, dependency.to),
      })),
    };
  } catch {
    return undefined;
  }
}

function nameFor(schema: SystemSchema, entityRef: string): string {
  return schema.nodes.find(node => node.entityRef === entityRef)?.name ?? entityRef;
}

function pathHasSegment(filePath: string, segment: string): boolean {
  return filePath.split(/[/\\]/).includes(segment);
}

function isContextFile(filePath: string): boolean {
  const name = filePath.split(/[/\\]/).pop();
  return name === 'context.yaml' || name === 'context.yml';
}

function sourceFileOf(value: string | number | boolean | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeEditorPath(value: string): string {
  let path = value.replaceAll('\\', '/');
  while (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

function isAbsoluteEditorPath(value: string): boolean {
  return value.startsWith('/') || /^[A-Za-z]:\//.test(value);
}

function isInsideEditorPath(file: string, folder: string): boolean {
  return file === folder || file.startsWith(`${folder}/`);
}

function sameEditorPath(left: string, right: string): boolean {
  return normalizeEditorPath(left) === normalizeEditorPath(right);
}

function looksLikeBlueprint(content: string): boolean {
  return /\blevel\s*:/.test(content) && /\bnodes\s*:/.test(content);
}

function plainSchemaMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'This blueprint could not be read.';
  const stripped = raw.replace(
    /^Invalid schema YAML\. (?:Schema Validation Error|YAML Parsing Error): /,
    ''
  );
  return stripped.split('; ')[0] ?? stripped;
}

function cycleSentence(schema: SystemSchema, path: readonly string[]): string {
  const refs = path[0] === path[path.length - 1] ? path.slice(0, -1) : [...path];
  const names = refs.map(ref => nameFor(schema, ref));
  if (names.length === 2) {
    return `Cycle: ${names[0]} calls ${names[1]} and ${names[1]} calls ${names[0]}.`;
  }
  const calls = names.map((name, index) => `${name} calls ${names[(index + 1) % names.length]}`);
  const last = calls[calls.length - 1];
  const head = calls.slice(0, -1).join(', ');
  return `Cycle: ${head}, and ${last}.`;
}

function hotspotCounts(
  nodes: readonly { entityRef: string; forensics?: NodeForensics }[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    const count = recordedChangeCount(node.forensics);
    if (count === undefined) continue;
    counts.set(node.entityRef, count);
  }
  return counts;
}

function recordedChangeCount(forensics: NodeForensics | undefined): number | undefined {
  if (!forensics) return undefined;
  const classified = forensics.classifications?.includes('hotspot') === true;
  const rolledUp = (forensics.hotspotCount ?? 0) > 0;
  if (!classified && !rolledUp) return undefined;
  const weeks = forensics.churnByWeek;
  const latest = weeks && weeks.length > 0 ? weeks[weeks.length - 1] : undefined;
  if (latest !== undefined) return latest;
  if (forensics.churn !== undefined) return forensics.churn;
  if (forensics.hotspotCount !== undefined) return forensics.hotspotCount;
  return 0;
}

function lineOf(content: string, entityRef: string | undefined): number {
  if (!entityRef) return 0;
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex(line => line.includes(`from: ${entityRef}`));
  return index < 0 ? 0 : index;
}
