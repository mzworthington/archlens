import * as Y from 'yjs';
import { commentsFromRecord, type NodeComment } from '@archlens/core';
import { YJS_LOCAL_ORIGIN } from './yjsSchemaProjection';

export const YJS_COMMENTS_MAP = 'comments';
const YJS_DELETED_COMMENT_IDS = 'deletedCommentIds';

function commentsRoot(ydoc: Y.Doc): Y.Map<unknown> {
  return ydoc.getMap(YJS_COMMENTS_MAP);
}

function deletedIds(ydoc: Y.Doc): Y.Map<unknown> {
  return ydoc.getMap(YJS_DELETED_COMMENT_IDS);
}

/** True when this room has already removed the id. Absence is not a new row. */
export function isDeletedComment(ydoc: Y.Doc, id: string): boolean {
  return deletedIds(ydoc).has(id);
}

function diagramComments(ydoc: Y.Doc, path: string): Y.Map<unknown> | null {
  const existing = commentsRoot(ydoc).get(path);
  return existing instanceof Y.Map ? existing : null;
}

function ensureDiagramComments(ydoc: Y.Doc, path: string): Y.Map<unknown> {
  const existing = diagramComments(ydoc, path);
  if (existing) return existing;
  const created = new Y.Map<unknown>();
  commentsRoot(ydoc).set(path, created);
  return created;
}

export function readComments(ydoc: Y.Doc, path: string): NodeComment[] {
  const diagram = diagramComments(ydoc, path);
  if (!diagram) return [];
  return commentsFromRecord(diagram.toJSON() as Record<string, unknown>);
}

function writeCommentFields(target: Y.Map<unknown>, comment: NodeComment): void {
  target.set('id', comment.id);
  target.set('nodeEntityRef', comment.nodeEntityRef);
  target.set('authorName', comment.authorName);
  target.set('authorClientId', comment.authorClientId);
  if (comment.authorKey) target.set('authorKey', comment.authorKey);
  target.set('body', comment.body);
  target.set('createdAtMs', comment.createdAtMs);
  target.set('status', comment.status);
}

export function writeComment(
  ydoc: Y.Doc,
  path: string,
  comment: NodeComment,
  origin: unknown = YJS_LOCAL_ORIGIN
): void {
  ydoc.transact(() => {
    const diagram = ensureDiagramComments(ydoc, path);
    const existing = diagram.get(comment.id);
    const row = existing instanceof Y.Map ? existing : new Y.Map<unknown>();
    writeCommentFields(row, comment);
    if (!(existing instanceof Y.Map)) diagram.set(comment.id, row);
  }, origin);
}

export function resolveStoredComment(
  ydoc: Y.Doc,
  path: string,
  id: string,
  origin: unknown = YJS_LOCAL_ORIGIN
): void {
  ydoc.transact(() => {
    const row = diagramComments(ydoc, path)?.get(id);
    if (!(row instanceof Y.Map)) return;
    row.set('status', 'resolved');
  }, origin);
}

export function deleteStoredComment(
  ydoc: Y.Doc,
  path: string,
  id: string,
  origin: unknown = YJS_LOCAL_ORIGIN
): void {
  ydoc.transact(() => {
    diagramComments(ydoc, path)?.delete(id);
    deletedIds(ydoc).set(id, true);
  }, origin);
}
