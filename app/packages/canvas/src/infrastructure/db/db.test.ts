import { beforeEach, describe, expect, it } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import {
  computeSchemaDiff,
  db,
  loadWorkingSchema,
  pathHasStoredData,
  revertWorkingSchema,
  saveBaselineSchema,
  saveWorkingSchema,
} from './db';

describe('IndexedDB working-copy persistence (db.ts)', () => {
  beforeEach(async () => {
    await Promise.all([
      db.originalNodes.clear(),
      db.workingNodes.clear(),
      db.originalDependencies.clear(),
      db.workingDependencies.clear(),
      db.originalMeta.clear(),
      db.workingMeta.clear(),
    ]);
  });

  const baselineSchema: SystemSchema = {
    name: 'Payments System',
    version: '1.0.0',
    level: 'container',
    entityRef: 'payments',
    source: {
      remoteUrl: 'https://github.com/org/payments.git',
      defaultBranch: 'main',
      scannedAtCommit: 'abc1234',
    },
    nodes: [
      {
        entityRef: 'payments/core-group',
        type: 'group',
        name: 'Core Group',
      },
      {
        entityRef: 'payments/api',
        type: 'rest-api',
        name: 'Payments API',
        parentEntityRef: 'payments/core-group',
        position: { x: 100, y: 200 },
        forensics: {
          complexity: 14,
          churn: 9,
          hotspotScore: 126,
        },
        resilience: {
          circuitBreaker: true,
          retry: false,
        },
      },
      {
        entityRef: 'payments/db',
        type: 'relational-database',
        name: 'Payments DB',
        external: false,
      },
    ],
    dependencies: [
      {
        from: 'payments/api',
        to: 'payments/db',
        type: 'read-write',
        description: 'Queries ledger',
      },
      {
        from: 'payments/api',
        to: 'payments/db',
        type: 'provisions',
        description: 'Runs migrations',
      },
    ],
  };

  it('preserves parentEntityRef, forensics, resilience, source and parallel dependency types on load and revert', async () => {
    const filePath = 'payments/containers.yaml';
    await saveBaselineSchema(filePath, baselineSchema, 'payments', {});

    const mutatedWorking: SystemSchema = {
      ...baselineSchema,
      nodes: baselineSchema.nodes.map(node =>
        node.entityRef === 'payments/api'
          ? {
              ...node,
              resilience: { circuitBreaker: false, bulkhead: true },
              parentEntityRef: undefined,
            }
          : node
      ),
    };
    await saveWorkingSchema(filePath, mutatedWorking, 'payments', {});

    const diff = await computeSchemaDiff(filePath);
    expect(diff.nodes.modified).toHaveLength(1);
    expect(diff.nodes.modified[0]?.current.entityRef).toBe('payments/api');

    const loadedWorking = await loadWorkingSchema(
      filePath,
      'Payments System',
      '1.0.0',
      'container',
      'payments'
    );
    expect(loadedWorking?.source).toEqual(baselineSchema.source);
    expect(loadedWorking?.dependencies).toHaveLength(2);
    expect(loadedWorking?.dependencies.map(d => d.type).sort()).toEqual([
      'provisions',
      'read-write',
    ]);

    const reverted = await revertWorkingSchema(
      filePath,
      'Payments System',
      '1.0.0',
      'container',
      'payments'
    );
    const apiNode = reverted.nodes.find(n => n.entityRef === 'payments/api');
    expect(apiNode?.parentEntityRef).toBe('payments/core-group');
    expect(apiNode?.forensics).toEqual({
      complexity: 14,
      churn: 9,
      hotspotScore: 126,
    });
    expect(apiNode?.resilience).toEqual({
      circuitBreaker: true,
      retry: false,
    });
    expect(reverted.source).toEqual(baselineSchema.source);
    expect(reverted.dependencies).toHaveLength(2);
  });

  it('counts a saved empty diagram as stored data', async () => {
    const filePath = 'handler-code.yaml';
    await saveWorkingSchema(
      filePath,
      {
        name: 'Handler Code',
        version: '1.0.0',
        level: 'code',
        entityRef: 'super-amazing/software-system-1204/handler',
        nodes: [],
        dependencies: [],
      },
      'super-amazing/software-system-1204/handler',
      {}
    );

    expect(await pathHasStoredData(filePath)).toBe(true);
    expect(await loadWorkingSchema(filePath)).toBeNull();
    expect(await pathHasStoredData('missing.yaml')).toBe(false);
  });
});
