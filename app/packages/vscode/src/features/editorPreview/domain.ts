import { resolveContainerFromPath } from '@archlens/analysis/container-grouping';
import {
  createMutableGitignoreFilter,
  createStructuralPathFilter,
} from '@archlens/analysis/path-filter';
import {
  blueprintYamlLanguageServerDirective,
  getNodePosition,
  parseSchemaFromYaml,
  serializeSchemaToMermaid,
  serializeSchemaToYaml,
  slugify,
  systemSchemaPublicUrl,
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
export const NO_LOWER_COPY = 'No lower diagram for this system.';
export const NOTHING_TO_COPY = 'Nothing to copy.';
export const NO_GIT_HOTSPOTS_COPY = 'Hotspots need a git history for this folder.';
export const NO_SOURCE_FILES_COPY = 'No supported source files in this folder.';
export const SCAN_FAILED_COPY = 'The scan did not finish. No blueprint files were written.';
export const REVIEW_TITLE = 'Review blueprint changes';
export const REVIEW_NOTE = 'Nothing is written until you choose Write blueprint.';
export const KEEP_FILES_COPY = 'Keep current files';
export const WRITE_BLUEPRINT_COPY = 'Write blueprint';
export const WRITE_FAILED_COPY =
  'Could not write the blueprint. Your previous files are unchanged.';
export const GENERATE_DIAGRAM_COPY = 'Generate diagram';
export const WHOLE_WORKSPACE_COPY = 'Whole workspace';
export const THIS_FOLDER_COPY = 'This folder';
export const CUSTOM_FILES_COPY = 'Custom files';
export const CUSTOM_GLOB_HINT =
  'TypeScript, JavaScript, C#, Python, Go, Java, Terraform and Pulumi.';
export const NO_CHANGES_COPY = 'No changes.';
export const UNSAVED_BLUEPRINT_COPY =
  'This blueprint has unsaved editor changes. Save or revert before a compare.';
export const DEFAULT_SOURCE_GLOB = '**/*.{ts,tsx,js,jsx,mjs,cjs,cs,py,go,java,tf}';

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

function normalizeEditorPath(value: string): string {
  let path = value.replaceAll('\\', '/');
  while (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

export function sameEditorPath(left: string, right: string): boolean {
  return normalizeEditorPath(left) === normalizeEditorPath(right);
}

export function isInsideEditorPath(file: string, folder: string): boolean {
  const filePath = normalizeEditorPath(file);
  const folderPath = normalizeEditorPath(folder);
  return filePath === folderPath || filePath.startsWith(`${folderPath}/`);
}

export function isYamlPath(file: string): boolean {
  const path = normalizeEditorPath(file).toLowerCase();
  return path.endsWith('.yaml') || path.endsWith('.yml');
}

export type FolderChoice =
  | { readonly kind: 'folder'; readonly path: string }
  | { readonly kind: 'pick'; readonly paths: readonly string[] }
  | { readonly kind: 'none' };

/** One workspace folder, or a pick. Roots are never merged into one estate. */
export function chooseWorkspaceFolder(input: {
  folders: readonly string[];
  hintPath?: string;
}): FolderChoice {
  const folders = input.folders
    .map(normalizeEditorPath)
    .filter(folder => folder.length > 0)
    .sort((left, right) => left.localeCompare(right));
  if (input.hintPath) {
    const closest = folders
      .filter(folder => isInsideEditorPath(input.hintPath ?? '', folder))
      .sort((left, right) => right.length - left.length)[0];
    if (closest) return { kind: 'folder', path: closest };
  }
  if (folders.length === 1) {
    const only = folders[0];
    if (only) return { kind: 'folder', path: only };
  }
  if (folders.length === 0) return { kind: 'none' };
  return { kind: 'pick', paths: folders };
}

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
    const selected = input.files.find(file => sameEditorPath(file.path, input.selectedPath ?? ''));
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

  const context =
    diagrams.find(diagram => diagram.level === 'context') ??
    diagrams.find(diagram => isContextFile(diagram.sourcePath)) ??
    diagrams[0];
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

const LANGUAGE_ORDER = [
  'TypeScript',
  'JavaScript',
  'C#',
  'Python',
  'Go',
  'Java',
  'Terraform',
  'Pulumi',
] as const;

const SKIPPED_SOURCE_SEGMENTS = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  'vendor',
  'target',
  '.git',
]);

export interface NamedSystem {
  readonly entityRef: string;
  readonly name: string;
  readonly sourceFile?: string;
}

export interface BlueprintDocument {
  readonly path: string;
  /** Absent when the blueprint file should be removed. */
  readonly content?: string;
}

export interface ReviewRow {
  readonly status: 'Added' | 'Changed' | 'Removed';
  readonly name: string;
}

/** Languages present in the file list, in the CLI's order. */
export function languagesInPaths(paths: readonly string[]): readonly string[] {
  const present = new Set<string>();
  for (const file of supportedSourcePaths(paths)) {
    const language = languageOf(file);
    if (language) present.add(language);
  }
  return LANGUAGE_ORDER.filter(language => present.has(language));
}

/** A dirty open blueprint blocks compare. A dirty source file does not. */
export function hasUnsavedBlueprint(
  documents: readonly { path: string; dirty: boolean; content: string }[],
  scope?: { readonly roots: readonly string[]; readonly blueprintsFolder?: string }
): boolean {
  const folder = safeBlueprintsFolder(scope?.blueprintsFolder ?? DEFAULT_BLUEPRINTS_FOLDER);
  const blueprintFolders = (scope?.roots ?? []).map(root => joinEditorPath(root, folder));
  return documents.some(
    document =>
      document.dirty &&
      isYamlPath(document.path) &&
      (looksLikeBlueprint(document.content) ||
        blueprintFolders.some(blueprintFolder =>
          isInsideEditorPath(document.path, blueprintFolder)
        ))
  );
}

export function foundLine(languages: readonly string[]): string {
  if (languages.length === 0) return 'Found: no supported languages';
  return `Found: ${languages.join(', ')}`;
}

/** Drop dependency folders, build output, and files the CLI languages do not cover. */
export function supportedSourcePaths(paths: readonly string[]): string[] {
  return paths.filter(file => !isSkippedSourcePath(file) && languageOf(file) !== undefined);
}

/** Drop paths the CLI would skip: `.gitignore` plus structural noise such as `.github`. */
export function pathsForScan(
  root: string,
  files: readonly string[],
  gitignoreText: string
): string[] {
  const gitignore = createMutableGitignoreFilter();
  gitignore.add(gitignoreText);
  const structural = createStructuralPathFilter({ ignore: [], include: [], allowIac: true });
  const normalizedRoot = root.replaceAll('\\', '/').replace(/\/+$/, '');
  return supportedSourcePaths(files).filter(file => {
    const normalized = file.replaceAll('\\', '/');
    const relative = normalized.startsWith(`${normalizedRoot}/`)
      ? normalized.slice(normalizedRoot.length + 1)
      : normalized;
    return !gitignore.ignores(relative) && !structural.shouldSkip(relative);
  });
}

/** One system per package or folder. Files inside it stay off the context map. */
export function systemsFromSourcePaths(root: string, files: readonly string[]): NamedSystem[] {
  const normalizedRoot = root.replaceAll('\\', '/').replace(/\/+$/, '');
  const byRef = new Map<string, NamedSystem>();
  for (const file of supportedSourcePaths(files)) {
    const normalized = file.replaceAll('\\', '/');
    const relative = normalized.startsWith(`${normalizedRoot}/`)
      ? normalized.slice(normalizedRoot.length + 1)
      : normalized.split('/').pop() || normalized;
    const container = resolveContainerFromPath(relative, { rollupModules: true });
    const entityRef = validEntityRef(container.containerId);
    if (byRef.has(entityRef)) continue;
    byRef.set(entityRef, { entityRef, name: container.displayName });
  }
  return [...byRef.values()].sort((left, right) => left.entityRef.localeCompare(right.entityRef));
}

export function systemsInBlueprints(files: readonly BlueprintFile[]): NamedSystem[] {
  const systems: NamedSystem[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    let schema: SystemSchema;
    try {
      schema = parseSchemaFromYaml(readableBlueprint(file.content));
    } catch {
      continue;
    }
    for (const node of schema.nodes) {
      if (seen.has(node.entityRef)) continue;
      seen.add(node.entityRef);
      systems.push({ entityRef: node.entityRef, name: node.name });
    }
  }
  return systems;
}

/** Added, changed and removed systems. An equal name is not a row. */
export function reviewRows(
  existing: readonly NamedSystem[],
  scanned: readonly NamedSystem[]
): ReviewRow[] {
  const existingByRef = new Map(existing.map(system => [system.entityRef, system]));
  const scannedByRef = new Map(scanned.map(system => [system.entityRef, system]));
  const rows: ReviewRow[] = [];
  for (const system of scanned) {
    const prior = existingByRef.get(system.entityRef);
    if (!prior) rows.push({ status: 'Added', name: system.name });
    else if (prior.name !== system.name) rows.push({ status: 'Changed', name: system.name });
  }
  for (const system of existing) {
    if (!scannedByRef.has(system.entityRef)) rows.push({ status: 'Removed', name: system.name });
  }
  return rows;
}

/** A short count for the review dialog. Names stay out of the modal. */
export function reviewSummary(rows: readonly ReviewRow[]): string {
  const counts = { Added: 0, Changed: 0, Removed: 0 };
  for (const row of rows) counts[row.status] += 1;
  const parts = (
    [
      ['Added', 'added'],
      ['Changed', 'changed'],
      ['Removed', 'removed'],
    ] as const
  ).flatMap(([status, label]) => (counts[status] > 0 ? [`${counts[status]} ${label}`] : []));
  return parts.length === 0 ? NO_CHANGES_COPY : `${parts.join(', ')}.`;
}

/** Files under the blueprints folder that make the review true. Other folders are left alone. */
export function blueprintWritePlan(input: {
  root: string;
  blueprintsFolder: string;
  files: readonly BlueprintFile[];
  scanned: readonly NamedSystem[];
}): { documents: readonly BlueprintDocument[]; diagram: DiagramView } {
  const folderPath = joinEditorPath(input.root, safeBlueprintsFolder(input.blueprintsFolder));
  const parsed = input.files.flatMap(file => {
    if (!isInsideEditorPath(file.path, folderPath)) return [];
    try {
      return [
        {
          path: file.path,
          original: file.content,
          schema: parseSchemaFromYaml(readableBlueprint(file.content)),
        },
      ];
    } catch {
      return [];
    }
  });
  const targetPath =
    parsed.find(file => file.schema.level === 'context')?.path ??
    parsed.find(file => isContextFile(file.path))?.path ??
    joinEditorPath(folderPath, 'context.yaml');
  const documents: BlueprintDocument[] = [];
  let diagram: DiagramView | undefined;

  for (const file of parsed) {
    const next = editedSchema(file.schema, input.scanned, file.path === targetPath);
    if (next.nodes.length === 0) {
      documents.push({ path: file.path });
      continue;
    }
    if (file.path === targetPath) diagram = diagramFrom(file.path, next);
    if (sameShape(file.schema, next)) continue;
    documents.push({ path: file.path, content: renderBlueprint(next, file.original) });
  }

  if (!parsed.some(file => file.path === targetPath)) {
    const next = editedSchema(freshSchema(input.root), input.scanned, true);
    diagram = diagramFrom(targetPath, next);
    documents.push({ path: targetPath, content: renderBlueprint(next, undefined) });
  }

  return {
    documents,
    diagram: diagram ?? diagramFrom(targetPath, freshSchema(input.root)),
  };
}

export function workspaceRootForSelection(input: {
  folders: readonly { path: string }[];
  selectedFolder?: string;
  picked?: string;
}): string | undefined {
  if (input.picked) return input.picked;
  if (input.folders.length === 1) return input.folders[0]?.path;
  if (!input.selectedFolder) return undefined;
  const selected = input.selectedFolder.replaceAll('\\', '/');
  return input.folders
    .map(folder => folder.path)
    .filter(folder => {
      const root = folder.replaceAll('\\', '/').replace(/\/+$/, '');
      return selected === root || selected.startsWith(`${root}/`);
    })
    .sort((left, right) => right.length - left.length)[0];
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
      const { hotspotCount: _hotspotCount, ...rest } = system;
      return count === undefined ? rest : { ...rest, hotspotCount: count };
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

interface ParsedBlueprint {
  readonly diagram: DiagramView;
  readonly schema: SystemSchema;
}

function readBlueprint(file: BlueprintFile): ParsedBlueprint | undefined {
  const diagram = projectFile(file);
  if (!diagram) return undefined;
  try {
    return { diagram, schema: parseSchemaFromYaml(readableBlueprint(file.content)) };
  } catch {
    return undefined;
  }
}

function projectFile(file: BlueprintFile): DiagramView | undefined {
  try {
    const schema = parseSchemaFromYaml(readableBlueprint(file.content));
    return {
      sourcePath: file.path,
      level: schema.level,
      ...placed(schema),
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

function joinEditorPath(root: string, ...parts: string[]): string {
  const slash = root.includes('\\') ? '\\' : '/';
  return [root.replace(/[/\\]+$/, ''), ...parts].join(slash);
}

function freshSchema(root: string): SystemSchema {
  const folder =
    root
      .replace(/[/\\]+$/, '')
      .split(/[/\\]/)
      .pop() || 'workspace';
  return {
    name: folder,
    entityRef: slugify(folder) || 'workspace',
    version: systemSchemaPublicUrl(),
    level: 'context',
    nodes: [],
    dependencies: [],
  };
}

function editedSchema(
  schema: SystemSchema,
  scanned: readonly NamedSystem[],
  acceptNew: boolean
): SystemSchema {
  const byRef = new Map(scanned.map(system => [system.entityRef, system]));
  const nodes = schema.nodes.flatMap(node => {
    const next = byRef.get(node.entityRef);
    if (!next) return [];
    return [{ ...node, name: next.name }];
  });
  if (acceptNew) {
    const present = new Set(nodes.map(node => node.entityRef));
    for (const system of scanned) {
      if (present.has(system.entityRef)) continue;
      nodes.push({
        entityRef: system.entityRef,
        type: 'software-system',
        name: system.name,
        ...(system.sourceFile ? { properties: { filepath: system.sourceFile } } : {}),
      });
    }
  }
  const present = new Set(nodes.map(node => node.entityRef));
  return {
    ...schema,
    nodes,
    dependencies: schema.dependencies.filter(
      dependency => present.has(dependency.from) && present.has(dependency.to)
    ),
  };
}

function sameShape(before: SystemSchema, after: SystemSchema): boolean {
  if (before.nodes.length !== after.nodes.length) return false;
  if (before.dependencies.length !== after.dependencies.length) return false;
  const nodesMatch = before.nodes.every(
    (node, index) =>
      node.entityRef === after.nodes[index]?.entityRef && node.name === after.nodes[index]?.name
  );
  const linksMatch = before.dependencies.every(
    (dependency, index) =>
      dependency.from === after.dependencies[index]?.from &&
      dependency.to === after.dependencies[index]?.to
  );
  return nodesMatch && linksMatch;
}

function renderBlueprint(schema: SystemSchema, original: string | undefined): string {
  const body = serializeSchemaToYaml(schema);
  const comment = original ? original.split(/\r?\n/, 1)[0] : blueprintYamlLanguageServerDirective();
  return comment?.startsWith('# yaml-language-server:') ? `${comment}\n${body}` : body;
}

function diagramFrom(path: string, schema: SystemSchema): DiagramView {
  return {
    sourcePath: path,
    level: schema.level,
    ...placed(schema),
  };
}

function placed(schema: SystemSchema): Pick<DiagramView, 'systems' | 'links'> {
  return {
    systems: schema.nodes.map(node => {
      const sourceFile = sourceFileOf(node.properties?.filepath);
      const position = getNodePosition(node);
      return {
        name: node.name,
        entityRef: node.entityRef,
        type: node.type,
        ...(node.external ? { external: true as const } : {}),
        ...(position ? { position } : {}),
        ...(sourceFile ? { sourceFile } : {}),
      };
    }),
    links: schema.dependencies.map(dependency => ({
      fromName: nameFor(schema, dependency.from),
      toName: nameFor(schema, dependency.to),
      fromRef: dependency.from,
      toRef: dependency.to,
    })),
  };
}

function sourceFileOf(value: string | number | boolean | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

function languageOf(file: string): string | undefined {
  const base = file.replaceAll('\\', '/').split('/').pop() ?? '';
  if (base === 'Pulumi.yaml' || base === 'Pulumi.yml' || /^Pulumi\..+\.ya?ml$/.test(base)) {
    return 'Pulumi';
  }
  if (base.endsWith('.tf') || base.endsWith('.tf.json')) return 'Terraform';
  if (base.endsWith('.ts') || base.endsWith('.tsx')) return 'TypeScript';
  if (/\.(js|jsx|mjs|cjs)$/.test(base)) return 'JavaScript';
  if (base.endsWith('.cs')) return 'C#';
  if (base.endsWith('.py')) return 'Python';
  if (base.endsWith('.go')) return 'Go';
  if (base.endsWith('.java')) return 'Java';
  return undefined;
}

function isSkippedSourcePath(file: string): boolean {
  return file
    .replaceAll('\\', '/')
    .split('/')
    .some(segment => SKIPPED_SOURCE_SEGMENTS.has(segment));
}

/** Dots in a file name are not legal inside an entityRef segment. */
export function readableBlueprint(content: string): string {
  return content.replace(
    /^([ \t]*(?:-[ \t]*)?(?:entityRef|parentEntityRef|from|to):[ \t]*)(['"]?)([^'"\s]+)\2[ \t]*$/gm,
    (_match, prefix: string, quote: string, value: string) =>
      `${prefix}${quote}${validEntityRef(value)}${quote}`
  );
}

function validEntityRef(ref: string): string {
  return ref
    .split('/')
    .map(segment => segment.replaceAll('.', '-'))
    .join('/');
}

function lineOf(content: string, entityRef: string | undefined): number {
  if (!entityRef) return 0;
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex(line => line.includes(`from: ${entityRef}`));
  return index < 0 ? 0 : index;
}
