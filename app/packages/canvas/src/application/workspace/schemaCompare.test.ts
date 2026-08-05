import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import { getNodePosition } from '@archlens/core';
import { resolveSchemaOnWorkspaceOpen, schemasTopologicallyEqual } from './schemaCompare';

const base: SystemSchema = {
  name: 'App Containers',
  version: '1.0.0',
  level: 'container',
  entityRef: 'blueprint/app',
  nodes: [
    {
      entityRef: 'blueprint/app/cli',
      type: 'container',
      name: 'Cli Service',
      position: { x: 10, y: 20 },
    },
    {
      entityRef: 'blueprint/app/core',
      type: 'container',
      name: 'Core Service',
      position: { x: 30, y: 40 },
    },
  ],
  dependencies: [{ from: 'blueprint/app/cli', to: 'blueprint/app/core', type: 'inter-container' }],
};

describe('schemaCompare', () => {
  it('treats position-only differences as equal topology', () => {
    const moved: SystemSchema = {
      ...base,
      nodes: base.nodes.map(n =>
        n.entityRef === 'blueprint/app/cli' ? { ...n, position: { x: 999, y: 999 } } : n
      ),
    };
    expect(schemasTopologicallyEqual(base, moved)).toBe(true);
  });

  it('detects extra / changed dependencies', () => {
    const polluted: SystemSchema = {
      ...base,
      dependencies: [
        ...base.dependencies,
        {
          from: 'blueprint/app/cli',
          to: 'application/blueprint',
          type: 'direct-call',
          description: 'Part of product system',
        },
      ],
    };
    expect(schemasTopologicallyEqual(base, polluted)).toBe(false);
  });

  it('keeps matching draft (with positions) on open', () => {
    const draft: SystemSchema = {
      ...base,
      nodes: base.nodes.map(n => {
        const pos = getNodePosition(n) ?? { x: 0, y: 0 };
        return { ...n, position: { x: pos.x + 50, y: pos.y } };
      }),
    };
    const result = resolveSchemaOnWorkspaceOpen(base, draft);
    expect(result.discardedStaleDraft).toBe(false);
    expect(result.schema).toBe(draft);
  });

  it('discards topologically stale draft in favor of disk', () => {
    const stale: SystemSchema = {
      ...base,
      dependencies: [
        {
          from: 'application/blueprint',
          to: 'blueprint/app/cli',
          type: 'direct-call',
          description: 'Part of product system',
        },
      ],
    };
    const result = resolveSchemaOnWorkspaceOpen(base, stale);
    expect(result.discardedStaleDraft).toBe(true);
    expect(result.schema).toBe(base);
  });

  it('uses disk when there is no draft', () => {
    const result = resolveSchemaOnWorkspaceOpen(base, null);
    expect(result).toEqual({ schema: base, discardedStaleDraft: false });
  });

  it('detects parentEntityRef changes as topology drift', () => {
    const disk: SystemSchema = {
      name: 'Context',
      version: '1.0.0',
      level: 'context',
      entityRef: 'blueprint',
      nodes: [
        { entityRef: 'application/hub', type: 'group', name: 'Hub' },
        {
          entityRef: 'application/child',
          type: 'software-system',
          name: 'Child',
          parentEntityRef: 'application/hub',
        },
      ],
      dependencies: [],
    };
    const staleDraft: SystemSchema = {
      ...disk,
      nodes: [
        { entityRef: 'application/hub', type: 'group', name: 'Hub', position: { x: 10, y: 20 } },
        {
          entityRef: 'application/child',
          type: 'software-system',
          name: 'Child',
          position: { x: 30, y: 40 },
        },
      ],
    };
    const result = resolveSchemaOnWorkspaceOpen(disk, staleDraft);
    expect(result.discardedStaleDraft).toBe(true);
    expect(result.schema).toBe(disk);
  });
});
