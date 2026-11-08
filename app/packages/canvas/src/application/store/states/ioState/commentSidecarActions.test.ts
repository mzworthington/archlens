import { describe, expect, it } from 'vitest';
import { emptyCommentDocument } from '@archlens/core';
import {
  mergeCommentDocuments,
  standaloneAddComment,
  standaloneDeleteComment,
  standaloneResolveComment,
  type StandaloneAuthor,
} from './commentSidecarActions';

const author: StandaloneAuthor = { name: 'Ada', clientId: 0, key: 'key-ada' };

describe('standaloneAddComment', () => {
  it('creates a comment owned by the author', () => {
    const { doc, comment } = standaloneAddComment(
      emptyCommentDocument(),
      { nodeEntityRef: 'shop/api', body: 'needs retry' },
      author
    );
    expect(comment).not.toBeNull();
    expect(Object.keys(doc.comments)).toHaveLength(1);
    expect(Object.values(doc.comments)[0]?.authorKey).toBe('key-ada');
  });

  it('returns null comment for blank body', () => {
    const { comment } = standaloneAddComment(
      emptyCommentDocument(),
      { nodeEntityRef: 'shop/api', body: '   ' },
      author
    );
    expect(comment).toBeNull();
  });
});

describe('standaloneResolveComment', () => {
  it('resolves a comment owned by the author', () => {
    let doc = emptyCommentDocument();
    const { doc: withComment, comment } = standaloneAddComment(
      doc,
      { nodeEntityRef: 'shop/api', body: 'x' },
      author
    );
    doc = withComment;
    const resolved = standaloneResolveComment(doc, comment!.id, author);
    expect(resolved.comments[comment!.id]?.status).toBe('resolved');
  });

  it('ignores resolve from a different author', () => {
    let doc = emptyCommentDocument();
    const { doc: withComment, comment } = standaloneAddComment(
      doc,
      { nodeEntityRef: 'shop/api', body: 'x' },
      author
    );
    doc = withComment;
    const other: StandaloneAuthor = { name: 'Grace', clientId: 0, key: 'key-grace' };
    const result = standaloneResolveComment(doc, comment!.id, other);
    expect(result.comments[comment!.id]?.status).toBe('open');
  });
});

describe('standaloneDeleteComment', () => {
  it('deletes a comment owned by the author', () => {
    let doc = emptyCommentDocument();
    const { doc: withComment, comment } = standaloneAddComment(
      doc,
      { nodeEntityRef: 'shop/api', body: 'x' },
      author
    );
    doc = withComment;
    const result = standaloneDeleteComment(doc, comment!.id, author);
    expect(comment!.id in result.comments).toBe(false);
  });

  it('ignores delete from a different author', () => {
    let doc = emptyCommentDocument();
    const { doc: withComment, comment } = standaloneAddComment(
      doc,
      { nodeEntityRef: 'shop/api', body: 'x' },
      author
    );
    doc = withComment;
    const other: StandaloneAuthor = { name: 'Grace', clientId: 0, key: 'key-grace' };
    const result = standaloneDeleteComment(doc, comment!.id, other);
    expect(comment!.id in result.comments).toBe(true);
  });
});

describe('mergeCommentDocuments (via commentSidecarActions re-export)', () => {
  it('merges two disjoint sets', () => {
    const a = emptyCommentDocument();
    const { doc: docA, comment: c1 } = standaloneAddComment(
      a,
      { nodeEntityRef: 'x', body: 'a' },
      author
    );

    const otherAuthor: StandaloneAuthor = { name: 'B', clientId: 0, key: 'key-b' };
    const b = emptyCommentDocument();
    const { comment: c2 } = standaloneAddComment(b, { nodeEntityRef: 'x', body: 'b' }, otherAuthor);

    const result = mergeCommentDocuments(docA, [{ ...c2!, nodeEntityRef: 'x' }]);
    expect(Object.keys(result.comments)).toHaveLength(2);
    expect(c1!.id in result.comments).toBe(true);
    expect(c2!.id in result.comments).toBe(true);
  });
});
