import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { serializeSchemaToYaml } from './graph/serialize';
import {
  addComment,
  createNodeComment,
  deleteComment,
  emptyCommentDocument,
  openCommentsForNode,
  resolveComment,
  type NodeComment,
} from './collabComments';

function comment(partial: Partial<NodeComment> & Pick<NodeComment, 'id' | 'body'>): NodeComment {
  return (
    createNodeComment({
      id: partial.id,
      nodeEntityRef: partial.nodeEntityRef ?? 'shop/api',
      authorName: partial.authorName ?? 'Ada',
      authorClientId: partial.authorClientId ?? 7,
      body: partial.body,
      createdAtMs: partial.createdAtMs ?? 1,
    }) ?? {
      id: partial.id,
      nodeEntityRef: 'shop/api',
      authorName: 'Ada',
      authorClientId: 7,
      body: partial.body,
      createdAtMs: 1,
      status: 'open',
    }
  );
}

describe('createNodeComment', () => {
  it('attaches a text comment and author to a node', () => {
    const comment = createNodeComment({
      id: 'c1',
      nodeEntityRef: 'shop/api',
      authorName: 'Ada',
      authorClientId: 7,
      body: 'This API should sit behind the gateway',
      createdAtMs: 1_700_000_000_000,
    });

    expect(comment).toEqual({
      id: 'c1',
      nodeEntityRef: 'shop/api',
      authorName: 'Ada',
      authorClientId: 7,
      body: 'This API should sit behind the gateway',
      createdAtMs: 1_700_000_000_000,
      status: 'open',
    });
  });

  it('keeps markup characters as text and rejects a blank body', () => {
    const withMarkup = createNodeComment({
      id: 'c2',
      nodeEntityRef: 'shop/api',
      authorName: 'Ada',
      authorClientId: 7,
      body: '  <b>do not render this</b>  ',
      createdAtMs: 1,
    });
    expect(withMarkup?.body).toBe('<b>do not render this</b>');

    expect(
      createNodeComment({
        id: 'c3',
        nodeEntityRef: 'shop/api',
        authorName: 'Ada',
        authorClientId: 7,
        body: '   ',
        createdAtMs: 1,
      })
    ).toBeNull();
  });
});

describe('collab comment document', () => {
  it('lists only open comments for a node after resolve or delete', () => {
    let doc = emptyCommentDocument();
    doc = addComment(doc, comment({ id: 'c1', body: 'first', createdAtMs: 1 }));
    doc = addComment(
      doc,
      comment({ id: 'c2', body: 'other node', nodeEntityRef: 'shop/db', createdAtMs: 2 })
    );
    doc = addComment(doc, comment({ id: 'c3', body: 'second', createdAtMs: 3 }));

    expect(openCommentsForNode(doc, 'shop/api').map(c => c.id)).toEqual(['c1', 'c3']);

    doc = resolveComment(doc, 'c1');
    expect(openCommentsForNode(doc, 'shop/api').map(c => c.id)).toEqual(['c3']);
    expect(doc.comments.c1?.status).toBe('resolved');

    doc = deleteComment(doc, 'c3');
    expect(openCommentsForNode(doc, 'shop/api')).toEqual([]);
    expect(doc.comments.c3).toBeUndefined();
  });
});

describe('comment sidecar vs BlueprintSpec', () => {
  it('does not change YAML export when a session sidecar holds comments', () => {
    const schema: SystemSchema = {
      name: 'Shop',
      version: '1.0.0',
      level: 'container',
      entityRef: 'shop',
      nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
      dependencies: [],
    };
    const yamlBefore = serializeSchemaToYaml(schema);
    const sidecar = addComment(
      emptyCommentDocument(),
      comment({ id: 'c1', body: 'sidecar only — must not appear in YAML' })
    );

    expect(serializeSchemaToYaml(schema)).toBe(yamlBefore);
    expect(yamlBefore).not.toContain('sidecar only');
    expect(yamlBefore).not.toMatch(/^comments:/m);
    expect(Object.keys(sidecar.comments)).toEqual(['c1']);
  });
});
