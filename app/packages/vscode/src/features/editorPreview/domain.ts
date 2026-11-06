import { parseSchemaFromYaml, type SystemSchema } from '@archlens/core';
import type { BlueprintFile, DiagramView, GenerateChoice } from './ports';

export const TRUST_COPY = 'ArchLens does not read this folder until the workspace is trusted.';
export const EMPTY_MAP_COPY = 'No map in this folder.';
export const GENERATE_TITLE = 'Generate diagram from workspace';
export const GENERATE_OFF_COPY = 'Generating a diagram from code is turned off in this preview.';
export const TELL_US_COPY = 'Tell us you want this';
export const CANCEL_COPY = 'Cancel';
export const INTEREST_DISCUSSION_URL = 'https://github.com/mzworthington/archlens/discussions';

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

function projectFile(file: BlueprintFile): DiagramView | undefined {
  try {
    const schema = parseSchemaFromYaml(file.content);
    return {
      sourcePath: file.path,
      level: schema.level,
      systems: schema.nodes.map(node => ({
        name: node.name,
        entityRef: node.entityRef,
      })),
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
