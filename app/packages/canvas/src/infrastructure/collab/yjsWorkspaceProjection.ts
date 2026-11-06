import * as Y from 'yjs';
import {
  collabPatchIsEmpty,
  diffCollabDocuments,
  type CollabDocument,
  type CollabWorkspace,
  emptyCollabWorkspace,
} from '@archlens/core';
import {
  applyCollabPatchToMap,
  readCollabDocumentFromMap,
  YJS_LOCAL_ORIGIN,
} from './yjsSchemaProjection';

const YJS_DIAGRAMS_MAP = 'diagrams';

export function readCollabWorkspace(ydoc: Y.Doc): CollabWorkspace {
  const diagrams = ydoc.getMap(YJS_DIAGRAMS_MAP);
  const next: CollabWorkspace['diagrams'] = {};
  diagrams.forEach((value: unknown, key: string) => {
    if (value instanceof Y.Map) next[key] = readCollabDocumentFromMap(value);
  });
  if (Object.keys(next).length === 0) return emptyCollabWorkspace();
  return { diagrams: next };
}

function diagramContainer(ydoc: Y.Doc, path: string, origin: unknown): Y.Map<unknown> {
  const diagrams = ydoc.getMap(YJS_DIAGRAMS_MAP);
  const existing = diagrams.get(path);
  if (existing instanceof Y.Map) return existing;
  const created = new Y.Map<unknown>();
  ydoc.transact(() => {
    diagrams.set(path, created);
  }, origin);
  return created;
}

export function writeCollabDiagram(
  ydoc: Y.Doc,
  path: string,
  document: CollabDocument,
  origin: unknown = YJS_LOCAL_ORIGIN
): void {
  const container = diagramContainer(ydoc, path, origin);
  const patch = diffCollabDocuments(readCollabDocumentFromMap(container), document);
  if (collabPatchIsEmpty(patch)) return;
  applyCollabPatchToMap(container, patch, origin);
}
