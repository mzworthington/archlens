import * as Y from 'yjs';
import { commentsFromRecord, type NodeComment } from '@archlens/core';
import { YJS_LOCAL_ORIGIN } from './yjsSchemaProjection';

export const YJS_COMMENTS_MAP = 'comments';

export function readComments(ydoc: Y.Doc): NodeComment[] {
  const raw = ydoc.getMap(YJS_COMMENTS_MAP).toJSON() as Record<string, unknown>;
  return commentsFromRecord(raw);
}

function commentsMap(ydoc: Y.Doc): Y.Map<unknown> {
  return ydoc.getMap(YJS_COMMENTS_MAP);
}

function writeCommentFields(target: Y.Map<unknown>, comment: NodeComment): void {
  target.set('id', comment.id);
  target.set('nodeEntityRef', comment.nodeEntityRef);
  target.set('authorName', comment.authorName);
  target.set('authorClientId', comment.authorClientId);
  target.set('body', comment.body);
  target.set('createdAtMs', comment.createdAtMs);
  target.set('status', comment.status);
}

export function writeComment(
  ydoc: Y.Doc,
  comment: NodeComment,
  origin: unknown = YJS_LOCAL_ORIGIN
): void {
  ydoc.transact(() => {
    const existing = commentsMap(ydoc).get(comment.id);
    const row = existing instanceof Y.Map ? existing : new Y.Map<unknown>();
    writeCommentFields(row, comment);
    if (!(existing instanceof Y.Map)) {
      commentsMap(ydoc).set(comment.id, row);
    }
  }, origin);
}

export function resolveStoredComment(
  ydoc: Y.Doc,
  id: string,
  origin: unknown = YJS_LOCAL_ORIGIN
): void {
  ydoc.transact(() => {
    const row = commentsMap(ydoc).get(id);
    if (!(row instanceof Y.Map)) return;
    row.set('status', 'resolved');
  }, origin);
}

export function deleteStoredComment(
  ydoc: Y.Doc,
  id: string,
  origin: unknown = YJS_LOCAL_ORIGIN
): void {
  ydoc.transact(() => {
    commentsMap(ydoc).delete(id);
  }, origin);
}
