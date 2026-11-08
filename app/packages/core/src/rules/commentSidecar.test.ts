import { describe, expect, it } from 'vitest';
import type { NodeComment } from './collabComments';
import { emptyCommentDocument } from './collabComments';
import {
  commentSidecarPath,
  mergeCommentDocuments,
  parseCommentDocument,
  serializeCommentDocument,
} from './commentSidecar';

const makeComment = (overrides: Partial<NodeComment> = {}): NodeComment => ({
  id: 'c1',
  nodeEntityRef: 'shop/api',
  authorName: 'Ada',
  authorClientId: 7,
  authorKey: 'key-ada',
  body: 'needs a circuit breaker',
  createdAtMs: 1_731_000_000_000,
  status: 'open',
  ...overrides,
});

describe('commentSidecarPath', () => {
  it('replaces .yaml extension', () => {
    expect(commentSidecarPath('diagram.yaml')).toBe('diagram.comments.yaml');
  });

  it('replaces .yml extension', () => {
    expect(commentSidecarPath('ctx.yml')).toBe('ctx.comments.yaml');
  });

  it('handles nested paths', () => {
    expect(commentSidecarPath('my/path/containers.yaml')).toBe('my/path/containers.comments.yaml');
  });

  it('appends when no known extension', () => {
    expect(commentSidecarPath('no-extension')).toBe('no-extension.comments.yaml');
  });
});

describe('serializeCommentDocument + parseCommentDocument round-trip', () => {
  it('round-trips an open comment', () => {
    const doc = emptyCommentDocument();
    const c = makeComment();
    doc.comments[c.id] = c;

    const yaml = serializeCommentDocument(doc);
    expect(yaml).toContain('createdAt:');
    expect(yaml).not.toContain('createdAtMs:');
    // ISO date present
    expect(yaml).toContain('2024-11-07');

    const parsed = parseCommentDocument(yaml);
    expect(parsed.comments['c1']).toMatchObject({
      id: 'c1',
      nodeEntityRef: 'shop/api',
      authorName: 'Ada',
      authorKey: 'key-ada',
      body: 'needs a circuit breaker',
      status: 'open',
      createdAtMs: 1_731_000_000_000,
    });
  });

  it('preserves resolved status for audit', () => {
    const doc = emptyCommentDocument();
    const c = makeComment({ status: 'resolved' });
    doc.comments[c.id] = c;

    const parsed = parseCommentDocument(serializeCommentDocument(doc));
    expect(parsed.comments['c1']?.status).toBe('resolved');
  });

  it('omits authorClientId from YAML (session-ephemeral)', () => {
    const doc = emptyCommentDocument();
    doc.comments['c1'] = makeComment();
    const yaml = serializeCommentDocument(doc);
    expect(yaml).not.toContain('authorClientId');
  });

  it('returns empty document for blank input', () => {
    expect(parseCommentDocument('')).toEqual(emptyCommentDocument());
  });

  it('returns empty document for malformed YAML', () => {
    expect(parseCommentDocument(': bad: yaml: {')).toEqual(emptyCommentDocument());
  });

  it('round-trips multiple comments', () => {
    const doc = emptyCommentDocument();
    doc.comments['c1'] = makeComment({ id: 'c1', body: 'first' });
    doc.comments['c2'] = makeComment({ id: 'c2', body: 'second', status: 'resolved' });

    const parsed = parseCommentDocument(serializeCommentDocument(doc));
    expect(Object.keys(parsed.comments)).toHaveLength(2);
    expect(parsed.comments['c2']?.status).toBe('resolved');
  });
});

describe('mergeCommentDocuments', () => {
  it('adds incoming comments absent from persisted', () => {
    const persisted = emptyCommentDocument();
    const incoming = [makeComment({ id: 'c-new' })];
    const result = mergeCommentDocuments(persisted, incoming);
    expect('c-new' in result.comments).toBe(true);
  });

  it('last-write-wins: incoming wins when createdAtMs is higher', () => {
    const persisted = emptyCommentDocument();
    const old = makeComment({ id: 'c1', body: 'old', createdAtMs: 100 });
    persisted.comments['c1'] = old;

    const newer = makeComment({ id: 'c1', body: 'new', createdAtMs: 200 });
    const result = mergeCommentDocuments(persisted, [newer]);
    expect(result.comments['c1']?.body).toBe('new');
  });

  it('keeps persisted when it has a higher createdAtMs', () => {
    const persisted = emptyCommentDocument();
    const fresh = makeComment({ id: 'c1', body: 'persisted', createdAtMs: 300 });
    persisted.comments['c1'] = fresh;

    const stale = makeComment({ id: 'c1', body: 'stale', createdAtMs: 100 });
    const result = mergeCommentDocuments(persisted, [stale]);
    expect(result.comments['c1']?.body).toBe('persisted');
  });

  it('incoming wins on tie (resolve/delete propagates)', () => {
    const persisted = emptyCommentDocument();
    const c = makeComment({ id: 'c1', createdAtMs: 100, status: 'open' });
    persisted.comments['c1'] = c;

    const resolved = makeComment({ id: 'c1', createdAtMs: 100, status: 'resolved' });
    const result = mergeCommentDocuments(persisted, [resolved]);
    expect(result.comments['c1']?.status).toBe('resolved');
  });

  it('keeps all persisted comments not present in incoming', () => {
    const persisted = emptyCommentDocument();
    persisted.comments['c-keep'] = makeComment({ id: 'c-keep' });

    const result = mergeCommentDocuments(persisted, [makeComment({ id: 'c-new' })]);
    expect('c-keep' in result.comments).toBe(true);
    expect('c-new' in result.comments).toBe(true);
  });
});
