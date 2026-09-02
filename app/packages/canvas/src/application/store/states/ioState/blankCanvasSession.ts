import { slugify, type SystemSchema } from '@archlens/core';
import { EMPTY_WORKSPACE_ENTITY_REF } from '../diagramState/resetToEmptyWorkspace';

export type BlankCanvasSession = {
  filePath: string;
  entityRef: string;
  name: string;
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
    const parsed = JSON.parse(raw) as BlankCanvasSession;
    if (!parsed.filePath || !parsed.entityRef || !parsed.name) return null;
    return parsed;
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
  schema: Pick<SystemSchema, 'name' | 'entityRef'>
): void {
  persistBlankCanvasSession({
    filePath,
    entityRef: schema.entityRef || blankCanvasEntityRefFromName(schema.name),
    name: schema.name,
  });
}

/** Deep-link should rehydrate the Ideate draft instead of opening the demo. */
export function shouldRestoreBlankCanvasForUrl(input: {
  urlEntityRef: string | undefined;
  session: BlankCanvasSession | null;
}): boolean {
  if (!input.urlEntityRef) return false;
  if (input.urlEntityRef === EMPTY_WORKSPACE_ENTITY_REF) return true;
  return input.session?.entityRef === input.urlEntityRef;
}
