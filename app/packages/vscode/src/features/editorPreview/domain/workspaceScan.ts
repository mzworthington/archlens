import { resolveContainerFromPath } from '@archlens/analysis/container-grouping';
import {
  createMutableGitignoreFilter,
  createStructuralPathFilter,
} from '@archlens/analysis/path-filter';
import { EntityRef, parseSchemaFromYaml, type SystemSchema } from '@archlens/core';
import type { BlueprintFile, GenerateChoice } from '../ports';
import {
  CANCEL_COPY,
  DEFAULT_BLUEPRINTS_FOLDER,
  GENERATE_OFF_COPY,
  GENERATE_TITLE,
  INTEREST_DISCUSSION_URL,
  isInsideEditorPath,
  isYamlPath,
  joinEditorPath,
  looksLikeBlueprint,
  NO_CHANGES_COPY,
  readableBlueprint,
  safeBlueprintsFolder,
  TELL_US_COPY,
  TRUST_COPY,
  validEntityRef,
  workspaceSlug,
} from './copyConstants';

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
    const entityRef = validEntityRef(
      EntityRef.child(workspaceSlug(normalizedRoot), container.containerId)
    );
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
    if (schema.level !== 'context') continue;
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
