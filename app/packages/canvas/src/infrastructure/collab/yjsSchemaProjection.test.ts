import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  collabDocumentToSchema,
  diffCollabDocuments,
  emptyCollabDocument,
  schemaToCollabDocument,
  type SystemSchema,
} from '@archlens/core';
import { applyCollabPatch, readCollabDocument } from './yjsSchemaProjection';

function exchange(a: Y.Doc, b: Y.Doc): void {
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
}

function schemaA(): SystemSchema {
  return {
    name: 'Shop',
    version: '1.0.0',
    level: 'container',
    nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API', position: { x: 1, y: 2 } }],
    dependencies: [],
  };
}

function schemaB(): SystemSchema {
  return {
    name: 'Shop',
    version: '1.0.0',
    level: 'container',
    nodes: [{ entityRef: 'shop/web', type: 'web-app', name: 'Web' }],
    dependencies: [],
  };
}

describe('yjsSchemaProjection', () => {
  it('round-trips a schema through a Y.Doc', () => {
    const ydoc = new Y.Doc();
    const schema = schemaA();
    applyCollabPatch(
      ydoc,
      diffCollabDocuments(emptyCollabDocument(), schemaToCollabDocument(schema))
    );
    expect(collabDocumentToSchema(readCollabDocument(ydoc))).toEqual(schema);
  });

  it('merges concurrent node adds from two peers', () => {
    const peerA = new Y.Doc();
    const peerB = new Y.Doc();
    applyCollabPatch(
      peerA,
      diffCollabDocuments(emptyCollabDocument(), schemaToCollabDocument(schemaA()))
    );
    applyCollabPatch(
      peerB,
      diffCollabDocuments(emptyCollabDocument(), schemaToCollabDocument(schemaB()))
    );
    exchange(peerA, peerB);

    const merged = collabDocumentToSchema(readCollabDocument(peerA));
    expect(merged.nodes.map(n => n.entityRef).sort()).toEqual(['shop/api', 'shop/web']);
    expect(
      collabDocumentToSchema(readCollabDocument(peerB))
        .nodes.map(n => n.entityRef)
        .sort()
    ).toEqual(['shop/api', 'shop/web']);
  });

  it('merges concurrent field edits on the same node without splitting position', () => {
    const seed = schemaToCollabDocument(schemaA());
    const peerA = new Y.Doc();
    const peerB = new Y.Doc();
    applyCollabPatch(peerA, diffCollabDocuments(emptyCollabDocument(), seed));
    applyCollabPatch(peerB, diffCollabDocuments(emptyCollabDocument(), seed));
    exchange(peerA, peerB);

    const named = schemaToCollabDocument({
      ...schemaA(),
      nodes: [
        { entityRef: 'shop/api', type: 'rest-api', name: 'Gateway', position: { x: 1, y: 2 } },
      ],
    });
    const moved = schemaToCollabDocument({
      ...schemaA(),
      nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API', position: { x: 50, y: 60 } }],
    });
    applyCollabPatch(peerA, diffCollabDocuments(seed, named));
    applyCollabPatch(peerB, diffCollabDocuments(seed, moved));
    exchange(peerA, peerB);

    const node = readCollabDocument(peerA).nodes['shop/api'];
    expect(node.name).toBe('Gateway');
    expect(node.position).toEqual({ x: 50, y: 60 });
  });
});
