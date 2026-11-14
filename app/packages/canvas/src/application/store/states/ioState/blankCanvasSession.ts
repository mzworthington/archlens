import { slugify, type SystemSchema } from '@archlens/core';
import {
  EMPTY_WORKSPACE_ENTITY_REF,
  EMPTY_WORKSPACE_PATH,
} from '../diagramState/resetToEmptyWorkspace';
import { GOLDEN_JOURNEY_ENTITY_REF, SAMPLES_ENTITY_REF } from '../../samplesWorkspace';
import { isBlankWorkspacePlacement, type BlankWorkspacePlacement } from './blankWorkspacePlacement';

export type BlankCanvasSession = {
  filePath: string;
  entityRef: string;
  name: string;
  placement: BlankWorkspacePlacement;
};

const STORAGE_KEY = 'archlens.blankCanvas.session';

export function blankCanvasEntityRefFromName(name: string): string {
  const slug = slugify(name).replace(/_/g, '-') || EMPTY_WORKSPACE_ENTITY_REF;
  // Avoid colliding with the bundled Samples catalog slug.
  if (slug === SAMPLES_ENTITY_REF) return `${SAMPLES_ENTITY_REF}-workspace`;
  return slug;
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

function isEntityRefUnder(entityRef: string, root: string): boolean {
  if (!root) return false;
  return entityRef === root || entityRef.startsWith(`${root}/`);
}

/** Bundled Samples deep-links must not be claimed by a blank session named "Samples". */
function isBundledSampleDeepLink(urlEntityRef: string): boolean {
  return (
    urlEntityRef === GOLDEN_JOURNEY_ENTITY_REF ||
    urlEntityRef.startsWith(`${GOLDEN_JOURNEY_ENTITY_REF}/`)
  );
}

/** Session root, or `empty-workspace`, when the URL is that canvas or a child zoom under it. */
export function blankCanvasRootForUrl(input: {
  urlEntityRef: string | undefined;
  session: BlankCanvasSession | null;
}): string | undefined {
  const urlEntityRef = input.urlEntityRef;
  if (!urlEntityRef) return undefined;
  if (isBundledSampleDeepLink(urlEntityRef)) return undefined;
  const sessionRef = input.session?.entityRef;
  if (sessionRef && isEntityRefUnder(urlEntityRef, sessionRef)) return sessionRef;
  if (isEntityRefUnder(urlEntityRef, EMPTY_WORKSPACE_ENTITY_REF)) return EMPTY_WORKSPACE_ENTITY_REF;
  return undefined;
}

/** Deep-link should rehydrate the Ideate draft instead of opening the demo. */
export function shouldRestoreBlankCanvasForUrl(input: {
  urlEntityRef: string | undefined;
  session: BlankCanvasSession | null;
}): boolean {
  return blankCanvasRootForUrl(input) !== undefined;
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
