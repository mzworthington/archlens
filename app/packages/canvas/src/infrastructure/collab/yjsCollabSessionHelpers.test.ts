import { describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { emptyCollabDocument, schemaToCollabDocument, type SystemSchema } from '@archlens/core';
import {
  documentIsEmpty,
  schemaIsSeedable,
  waitForCollabAdmission,
} from './yjsCollabSessionHelpers';
import type { CollabTransport } from './collabTransport';

const loadingPlaceholder: SystemSchema = {
  name: 'Loading',
  version: '1.0.0',
  level: 'container',
  nodes: [],
  dependencies: [],
};

const namedBlank: SystemSchema = {
  name: 'Scratch',
  version: '1.0.0',
  level: 'container',
  nodes: [],
  dependencies: [],
};

const withNode: SystemSchema = {
  name: 'Shop',
  version: '1.0.0',
  level: 'container',
  nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
  dependencies: [],
};

describe('documentIsEmpty', () => {
  it('treats the boot Loading placeholder as empty even when meta.name is set', () => {
    expect(documentIsEmpty(schemaToCollabDocument(loadingPlaceholder))).toBe(true);
  });

  it('treats a named blank diagram as non-empty so intentional empty shares stay seedable', () => {
    expect(documentIsEmpty(schemaToCollabDocument(namedBlank))).toBe(false);
  });

  it('treats a true empty document as empty', () => {
    expect(documentIsEmpty(emptyCollabDocument())).toBe(true);
  });

  it('treats diagrams with nodes as non-empty', () => {
    expect(documentIsEmpty(schemaToCollabDocument(withNode))).toBe(false);
  });
});

describe('schemaIsSeedable', () => {
  it('refuses to seed the boot Loading placeholder into a room', () => {
    expect(schemaIsSeedable(loadingPlaceholder)).toBe(false);
  });

  it('allows seeding a named blank or a diagram with nodes', () => {
    expect(schemaIsSeedable(namedBlank)).toBe(true);
    expect(schemaIsSeedable(withNode)).toBe(true);
  });
});

describe('waitForCollabAdmission', () => {
  it('resolves early when a remote update arrives before the sync timeout', async () => {
    const doc = new Y.Doc();
    const peer = new Y.Doc();
    peer.getMap('meta').set('name', 'Shop');
    const awareness = { clientID: 1 } as never;
    const transport: CollabTransport = {
      connect: (_roomId, ydoc, _awareness, options) => {
        queueMicrotask(() => {
          options?.onControl?.({ v: 1, op: 'admitted', access: 'open' });
          Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(peer), 'remote');
        });
        return { dispose: () => {}, sendControl: () => {} };
      },
    };

    const started = Date.now();
    const result = await waitForCollabAdmission({
      transport,
      roomId: 'room',
      doc,
      awareness,
      controlWaitMs: 1_000,
      syncWaitMs: 5_000,
    });
    const elapsed = Date.now() - started;

    expect(result.admitted).toBe(true);
    expect(elapsed).toBeLessThan(2_000);
    result.dispose();
  });

  it('falls back to the sync timeout when no remote update arrives', async () => {
    vi.useFakeTimers();
    const doc = new Y.Doc();
    const awareness = { clientID: 1 } as never;
    const transport: CollabTransport = {
      connect: (_roomId, _ydoc, _awareness, options) => {
        queueMicrotask(() => options?.onControl?.({ v: 1, op: 'admitted', access: 'open' }));
        return { dispose: () => {}, sendControl: () => {} };
      },
    };

    const pending = waitForCollabAdmission({
      transport,
      roomId: 'room',
      doc,
      awareness,
      controlWaitMs: 1_000,
      syncWaitMs: 250,
    });
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.admitted).toBe(true);
    result.dispose();
    vi.useRealTimers();
  });
});
