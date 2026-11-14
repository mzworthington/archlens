import { slugify, type SystemSchema } from '@archlens/core';
import {
  EMPTY_WORKSPACE_ENTITY_REF,
  EMPTY_WORKSPACE_PATH,
} from '../diagramState/resetToEmptyWorkspace';
import { isBlankWorkspacePlacement, type BlankWorkspacePlacement } from './blankWorkspacePlacement';

export type BlankCanvasSession = {
  filePath: string;
  entityRef: string;
  name: string;
  placement: BlankWorkspacePlacement;
};

const STORAGE_KEY = 'archlens.blankCanvas.session';

export function blankCanvasEntityRefFromName(name: string): string {
  return slugify(name).replace(/_/g, '-') || EMPTY_WORKSPACE_ENTITY_REF;
}

export function persistBlankCanvasSession(session: BlankCanvasSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* private mode / quota */
  }
}

export function readBlankCanvasSession(): BlankCanvasSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStringRecord(parsed)) return null;
    if (
      typeof parsed.filePath !== 'string' ||
      typeof parsed.entityRef !== 'string' ||
      typeof parsed.name !== 'string'
    ) {
      return null;
    }
    const placement = isBlankWorkspacePlacement(parsed.placement)
      ? parsed.placement
      : parsed.filePath === EMPTY_WORKSPACE_PATH
        ? 'unsaved'
        : 'file';
    return {
      filePath: parsed.filePath,
      entityRef: parsed.entityRef,
      name: parsed.name,
      placement,
    };
  } catch {
    return null;
  }
}

export function clearBlankCanvasSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function persistBlankCanvasSessionFromSchema(
  filePath: string,
  schema: Pick<SystemSchema, 'name' | 'entityRef'>,
  placement: BlankWorkspacePlacement = 'file'
): void {
  persistBlankCanvasSession({
    filePath,
    entityRef: schema.entityRef || blankCanvasEntityRefFromName(schema.name),
    name: schema.name,
    placement,
  });
}

/** True when the URL is the blank starter or a create-zoom child under it. */
function isEmptyWorkspaceUrlEntityRef(urlEntityRef: string): boolean {
  return (
    urlEntityRef === EMPTY_WORKSPACE_ENTITY_REF ||
    urlEntityRef.startsWith(`${EMPTY_WORKSPACE_ENTITY_REF}/`)
  );
}

/** True when the URL is the blank session root or a create-zoom child under it. */
function isBlankSessionUrlEntityRef(urlEntityRef: string, sessionEntityRef: string): boolean {
  return urlEntityRef === sessionEntityRef || urlEntityRef.startsWith(`${sessionEntityRef}/`);
}

/**
 * Deep-link should rehydrate the Ideate draft instead of opening the demo.
 * Create-zoom child URLs under the blank session must stay protected too —
 * otherwise bootstrap reloads Samples after the user leaves `/empty-workspace`.
 */
export function shouldRestoreBlankCanvasForUrl(input: {
  urlEntityRef: string | undefined;
  session: BlankCanvasSession | null;
}): boolean {
  if (!input.urlEntityRef) return false;
  if (isEmptyWorkspaceUrlEntityRef(input.urlEntityRef)) return true;
  const sessionRef = input.session?.entityRef?.trim();
  if (!sessionRef) return false;
  return isBlankSessionUrlEntityRef(input.urlEntityRef, sessionRef);
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
