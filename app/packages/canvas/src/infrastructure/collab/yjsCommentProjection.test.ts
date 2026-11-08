import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { commentsFromRecord, type NodeComment } from '@archlens/core';
import {
  deleteStoredComment,
  mirrorNestedComments,
  readComments,
  resolveStoredComment,
  syncLegacyCommentDeletes,
  writeComment,
  YJS_COMMENTS_MAP,
} from './yjsCommentProjection';

function comment(id: string, body: string, createdAtMs: number): NodeComment {
  return {
    id,
    nodeEntityRef: 'shop',
    authorName: 'Ada',
    authorClientId: 7,
    authorKey: 'ada-stable',
    body,
    createdAtMs,
    status: 'open',
  };
}

function writeFlat(ydoc: Y.Doc, row: NodeComment): void {
  const map = new Y.Map<unknown>();
  map.set('id', row.id);
  map.set('nodeEntityRef', row.nodeEntityRef);
  map.set('authorName', row.authorName);
  map.set('authorClientId', row.authorClientId);
  map.set('authorKey', row.authorKey);
  map.set('body', row.body);
  map.set('createdAtMs', row.createdAtMs);
  map.set('status', row.status);
  ydoc.getMap(YJS_COMMENTS_MAP).set(row.id, map);
}

function flatBodies(ydoc: Y.Doc): string[] {
  const raw = ydoc.getMap(YJS_COMMENTS_MAP).toJSON() as Record<string, unknown>;
  return commentsFromRecord(raw).map(row => row.body);
}

describe('yjs comment projection', () => {
  it('copies a nested-only row onto the flat root older clients parse', () => {
    const ydoc = new Y.Doc();
    const row = comment('c-nested', 'nested only', 1);
    const diagram = new Y.Map<unknown>();
    const stored = new Y.Map<unknown>();
    stored.set('id', row.id);
    stored.set('nodeEntityRef', row.nodeEntityRef);
    stored.set('authorName', row.authorName);
    stored.set('authorClientId', row.authorClientId);
    stored.set('authorKey', row.authorKey);
    stored.set('body', row.body);
    stored.set('createdAtMs', row.createdAtMs);
    stored.set('status', row.status);
    diagram.set(row.id, stored);
    ydoc.getMap(YJS_COMMENTS_MAP).set('context.yaml', diagram);

    expect(flatBodies(ydoc)).toEqual([]);
    mirrorNestedComments(ydoc);
    expect(flatBodies(ydoc)).toEqual(['nested only']);
    expect(readComments(ydoc, 'containers.yaml')).toEqual([]);
  });

  it('reads a flat comment row from an already-open room', () => {
    const ydoc = new Y.Doc();
    writeFlat(ydoc, comment('c-flat', 'shipped layout', 1));

    expect(readComments(ydoc, 'context.yaml').map(row => row.body)).toEqual(['shipped layout']);
  });

  it('mirrors a nested comment onto the flat root older clients still parse', () => {
    const ydoc = new Y.Doc();
    writeComment(ydoc, 'context.yaml', comment('c-new', 'from a new client', 2));

    expect(flatBodies(ydoc)).toEqual(['from a new client']);
    expect(readComments(ydoc, 'context.yaml').map(row => row.body)).toEqual(['from a new client']);
    expect(readComments(ydoc, 'containers.yaml').map(row => row.body)).toEqual([]);
  });

  it('keeps an unscoped flat comment visible beside a newer per-diagram thread', () => {
    const ydoc = new Y.Doc();
    writeFlat(ydoc, comment('c-flat', 'shipped layout', 1));
    writeComment(ydoc, 'containers.yaml', comment('c-new', 'on containers', 2));

    expect(readComments(ydoc, 'context.yaml').map(row => row.body)).toEqual(['shipped layout']);
    expect(readComments(ydoc, 'containers.yaml').map(row => row.body)).toEqual([
      'shipped layout',
      'on containers',
    ]);
  });

  it('follows an older client resolve and delete of the flat row', () => {
    const ydoc = new Y.Doc();
    const row = comment('c-flat', 'shipped layout', 1);
    writeComment(ydoc, 'context.yaml', row);
    const root = ydoc.getMap(YJS_COMMENTS_MAP);
    const flat = root.get(row.id);
    expect(flat).toBeInstanceOf(Y.Map);
    if (!(flat instanceof Y.Map)) return;
    flat.set('status', 'resolved');

    expect(readComments(ydoc, 'context.yaml')[0]?.status).toBe('resolved');

    root.observeDeep((events, transaction) => {
      syncLegacyCommentDeletes(ydoc, events, transaction.origin);
    });
    ydoc.transact(() => root.delete(row.id));

    expect(readComments(ydoc, 'context.yaml')).toEqual([]);
    expect(flatBodies(ydoc)).toEqual([]);
  });

  it('removes the flat row when this client resolves or deletes', () => {
    const ydoc = new Y.Doc();
    const row = comment('c-new', 'from a new client', 2);
    writeComment(ydoc, 'context.yaml', row);
    resolveStoredComment(ydoc, 'context.yaml', row.id);

    expect(flatBodies(ydoc)).toEqual(['from a new client']);
    expect(readComments(ydoc, 'context.yaml')[0]?.status).toBe('resolved');

    deleteStoredComment(ydoc, 'context.yaml', row.id);
    expect(readComments(ydoc, 'context.yaml')).toEqual([]);
    expect(flatBodies(ydoc)).toEqual([]);
  });
});
