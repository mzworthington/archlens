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

function isDirectCommentRow(value: Y.Map<unknown>): boolean {
  return typeof value.get('id') === 'string' && typeof value.get('body') === 'string';
}

function recordFromJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function diagramComments(ydoc: Y.Doc, path: string): Y.Map<unknown> | null {
  const existing = commentsRoot(ydoc).get(path);
  if (!(existing instanceof Y.Map) || isDirectCommentRow(existing)) return null;
  return existing;
}

function ensureDiagramComments(ydoc: Y.Doc, path: string): Y.Map<unknown> {
  const existing = diagramComments(ydoc, path);
  if (existing) return existing;
  const created = new Y.Map<unknown>();
  commentsRoot(ydoc).set(path, created);
  return created;
}

function byCreated(a: NodeComment, b: NodeComment): number {
  return a.createdAtMs - b.createdAtMs || a.id.localeCompare(b.id);
}

/**
 * Comments for one diagram.
 * Rows nested under `path` are that file's threads. A flat `commentId → fields`
 * row is the layout already shipped to rooms: it stays visible, except when a
 * nested map has already claimed that id for a different file.
 */
export function readComments(ydoc: Y.Doc, path: string): NodeComment[] {
  const root = commentsRoot(ydoc);
  const flatRecord: Record<string, unknown> = {};
  root.forEach((value, key) => {
    if (value instanceof Y.Map && isDirectCommentRow(value)) flatRecord[key] = value.toJSON();
  });
  const flatById = new Map(commentsFromRecord(flatRecord).map(comment => [comment.id, comment]));

  const ownedByOther = new Set<string>();
  let nested: NodeComment[] = [];
  root.forEach((value, key) => {
    if (!(value instanceof Y.Map) || isDirectCommentRow(value)) return;
    const rows = commentsFromRecord(recordFromJson(value.toJSON()));
    if (key === path) nested = rows;
    else for (const row of rows) ownedByOther.add(row.id);
  });

  const merged = new Map<string, NodeComment>();
  for (const comment of nested) merged.set(comment.id, flatById.get(comment.id) ?? comment);
  for (const [id, comment] of flatById) {
    if (merged.has(id) || ownedByOther.has(id)) continue;
    merged.set(id, comment);
  }
  return [...merged.values()].sort(byCreated);
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

function upsertCommentRow(parent: Y.Map<unknown>, comment: NodeComment): void {
  const existing = parent.get(comment.id);
  const row =
    existing instanceof Y.Map && isDirectCommentRow(existing) ? existing : new Y.Map<unknown>();
  writeCommentFields(row, comment);
  if (existing !== row) parent.set(comment.id, row);
}

/** Copy nested rows onto the flat root when an older client would otherwise miss them. */
export function mirrorNestedComments(ydoc: Y.Doc, origin: unknown = YJS_LOCAL_ORIGIN): void {
  const root = commentsRoot(ydoc);
  const missing: NodeComment[] = [];
  root.forEach(value => {
    if (!(value instanceof Y.Map) || isDirectCommentRow(value)) return;
    for (const row of commentsFromRecord(recordFromJson(value.toJSON()))) {
      if (!flatCommentRow(ydoc, row.id)) missing.push(row);
    }
  });
  if (missing.length === 0) return;
  ydoc.transact(() => {
    for (const row of missing) upsertCommentRow(root, row);
  }, origin);
}

export function writeComment(
  ydoc: Y.Doc,
  path: string,
  comment: NodeComment,
  origin: unknown = YJS_LOCAL_ORIGIN
): void {
  ydoc.transact(() => {
    upsertCommentRow(ensureDiagramComments(ydoc, path), comment);
    // Root row is what already-shipped clients parse. Nested row is per file.
    upsertCommentRow(commentsRoot(ydoc), comment);
  }, origin);
}

function flatCommentRow(ydoc: Y.Doc, id: string): Y.Map<unknown> | null {
  const existing = commentsRoot(ydoc).get(id);
  return existing instanceof Y.Map && isDirectCommentRow(existing) ? existing : null;
}

export function resolveStoredComment(
  ydoc: Y.Doc,
  path: string,
  id: string,
  origin: unknown = YJS_LOCAL_ORIGIN
): void {
  ydoc.transact(() => {
    const nested = diagramComments(ydoc, path)?.get(id);
    if (nested instanceof Y.Map && isDirectCommentRow(nested)) nested.set('status', 'resolved');
    flatCommentRow(ydoc, id)?.set('status', 'resolved');
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
    const flat = flatCommentRow(ydoc, id);
    if (flat) commentsRoot(ydoc).delete(id);
    deletedIds(ydoc).set(id, true);
  }, origin);
}

type LegacyDeleteEvent = {
  target: object;
  changes: {
    keys: ReadonlyMap<string, { action: string }>;
  };
};

/**
 * An older client deletes the flat root row and leaves the nested copy behind.
 * Drop that copy so the thread stays gone for clients on the nested layout.
 */
export function syncLegacyCommentDeletes(
  ydoc: Y.Doc,
  events: readonly LegacyDeleteEvent[],
  origin: unknown
): void {
  if (origin === YJS_LOCAL_ORIGIN) return;
  const root = commentsRoot(ydoc);
  const removed: string[] = [];
  for (const event of events) {
    if (event.target !== root) continue;
    for (const [key, change] of event.changes.keys) {
      if (change.action === 'delete') removed.push(key);
    }
  }
  if (removed.length === 0) return;
  ydoc.transact(() => {
    for (const id of removed) {
      let nested = false;
      root.forEach(value => {
        if (!(value instanceof Y.Map) || isDirectCommentRow(value)) return;
        if (!value.has(id)) return;
        value.delete(id);
        nested = true;
      });
      if (nested) deletedIds(ydoc).set(id, true);
    }
  }, YJS_LOCAL_ORIGIN);
}
