import { parseSchemaFromYaml, type SystemSchema } from '@archlens/core';
import type { BlueprintFile, DiagramView, GenerateChoice } from './ports';

export const TRUST_COPY = 'ArchLens does not read this folder until the workspace is trusted.';
export const EMPTY_MAP_COPY = 'No map in this folder.';
export const GENERATE_TITLE = 'Generate diagram from workspace';
export const GENERATE_OFF_COPY = 'Generating a diagram from code is turned off in this preview.';
export const TELL_US_COPY = 'Tell us you want this';
export const CANCEL_COPY = 'Cancel';
export const INTEREST_DISCUSSION_URL = 'https://github.com/mzworthington/archlens/discussions';
export const NO_SOURCE_COPY = 'This system has no source file in the workspace.';

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
