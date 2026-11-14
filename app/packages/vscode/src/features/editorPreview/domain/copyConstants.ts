import {
  blueprintYamlLanguageServerDirective,
  getNodePosition,
  parseSchemaFromYaml,
  serializeSchemaToYaml,
  slugify,
  type SystemSchema,
} from '@archlens/core';
import type { BlueprintFile, DiagramView } from '../ports';

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

export const DEFAULT_BLUEPRINTS_FOLDER = 'blueprints';

export function normalizeEditorPath(value: string): string {
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

export function safeBlueprintsFolder(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '' || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
    return DEFAULT_BLUEPRINTS_FOLDER;
  }
  return trimmed;
}

export function pathHasSegment(filePath: string, segment: string): boolean {
  return filePath.split(/[/\\]/).includes(segment);
}

export function isContextFile(filePath: string): boolean {
  const name = filePath.split(/[/\\]/).pop();
  return name === 'context.yaml' || name === 'context.yml';
}

export function joinEditorPath(root: string, ...parts: string[]): string {
  const slash = root.includes('\\') ? '\\' : '/';
  return [root.replace(/[/\\]+$/, ''), ...parts].join(slash);
}

export function workspaceSlug(root: string): string {
  const folder =
    root
      .replace(/[/\\]+$/, '')
      .split(/[/\\]/)
      .pop() || 'workspace';
  return slugify(folder) || 'workspace';
}

export function looksLikeBlueprint(content: string): boolean {
  return /\blevel\s*:/.test(content) && /\bnodes\s*:/.test(content);
}

/** Dots in a file name are not legal inside an entityRef segment. */
export function readableBlueprint(content: string): string {
  return content.replace(
    /^([ \t]*(?:-[ \t]*)?(?:entityRef|parentEntityRef|from|to):[ \t]*)(['"]?)([^'"\s]+)\2[ \t]*$/gm,
    (_match, prefix: string, quote: string, value: string) =>
      `${prefix}${quote}${validEntityRef(value)}${quote}`
  );
}

export function validEntityRef(ref: string): string {
  return ref
    .split('/')
    .map(segment => segment.replaceAll('.', '-'))
    .join('/');
}

export function nameFor(schema: SystemSchema, entityRef: string): string {
  return schema.nodes.find(node => node.entityRef === entityRef)?.name ?? entityRef;
}

function sourceFileOf(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

export function diagramFrom(path: string, schema: SystemSchema): DiagramView {
  return {
    sourcePath: path,
    level: schema.level,
    ...placed(schema),
  };
}

export function projectFile(file: BlueprintFile): DiagramView | undefined {
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

export interface ParsedBlueprint {
  readonly diagram: DiagramView;
  readonly schema: SystemSchema;
}

export function readBlueprint(file: BlueprintFile): ParsedBlueprint | undefined {
  const diagram = projectFile(file);
  if (!diagram) return undefined;
  try {
    return { diagram, schema: parseSchemaFromYaml(readableBlueprint(file.content)) };
  } catch {
    return undefined;
  }
}

export function renderBlueprint(schema: SystemSchema, original: string | undefined): string {
  const body = serializeSchemaToYaml(schema);
  const comment = original ? original.split(/\r?\n/, 1)[0] : blueprintYamlLanguageServerDirective();
  return comment?.startsWith('# yaml-language-server:') ? `${comment}\n${body}` : body;
}
