import { serializeSchemaToMermaid, type NodeForensics, type SystemSchema } from '@archlens/core';
import type { BlueprintFile, DiagramCrumb, DiagramView } from '../ports';
import {
  DEFAULT_BLUEPRINTS_FOLDER,
  isContextFile,
  isInsideEditorPath,
  NO_GIT_HOTSPOTS_COPY,
  NO_LOWER_COPY,
  normalizeEditorPath,
  NOTHING_TO_COPY,
  type ParsedBlueprint,
  pathHasSegment,
  projectFile,
  readBlueprint,
  safeBlueprintsFolder,
  sameEditorPath,
  TRUST_COPY,
} from './copyConstants';

export type OpenMapDecision =
  | { readonly kind: 'diagram'; readonly diagram: DiagramView }
  | { readonly kind: 'empty' }
  | { readonly kind: 'not-blueprint' };

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
    .filter(blueprint => blueprint.schema.entityRef === input.focusedEntityRef)
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
