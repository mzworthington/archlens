import { describe, expect, it } from 'vitest';
import type { WorkspaceCatalogEntry } from '../lib/workspaceCatalog';
import type { ChaosSpecDocument } from './chaosSpecDocument';
import {
  mergeChaosSpecCatalogEntries,
  resolveChaosSpecCatalogAvailability,
  sortChaosSpecCatalogEntries,
  toChaosSpecCatalogEntry,
} from './chaosSpecCatalog';

function doc(
  name: string,
  diagramRef: string,
  faults = 1,
  description?: string
): Pick<ChaosSpecDocument, 'metadata' | 'faults'> {
  return {
    metadata: {
      name,
      diagramRef,
      ...(description ? { description } : {}),
    },
    faults: Array.from({ length: faults }, (_, i) => ({
      nodeId: `${diagramRef}/n${i}`,
      faultType: 'region-outage' as const,
    })),
  };
}

const shopHome: WorkspaceCatalogEntry = {
  path: 'shop.yaml',
  name: 'Shop',
  level: 'container',
  entityRef: 'shop',
  nodeEntityRefs: ['shop/api'],
};

describe('toChaosSpecCatalogEntry', () => {
  it('maps document metadata and fault count onto a catalog row', () => {
    expect(
      toChaosSpecCatalogEntry('payment-outage.yaml', doc('Payment outage', 'shop', 2, 'Blast'))
    ).toEqual({
      id: 'payment-outage.yaml',
      name: 'Payment outage',
      description: 'Blast',
      diagramRef: 'shop',
      faultCount: 2,
    });
  });
});

describe('sortChaosSpecCatalogEntries', () => {
  it('orders by name then id', () => {
    const sorted = sortChaosSpecCatalogEntries([
      toChaosSpecCatalogEntry('b.yaml', doc('Zebra', 'z')),
      toChaosSpecCatalogEntry('a.yaml', doc('Alpha', 'a')),
      toChaosSpecCatalogEntry('c.yaml', doc('Alpha', 'a2')),
    ]);
    expect(sorted.map(e => e.id)).toEqual(['a.yaml', 'c.yaml', 'b.yaml']);
  });
});

describe('resolveChaosSpecCatalogAvailability', () => {
  it('is available when diagramRef resolves in the workspace catalog', () => {
    expect(resolveChaosSpecCatalogAvailability({ diagramRef: 'shop' }, [shopHome])).toBe(
      'available'
    );
  });

  it('is diagram-missing when the target diagram is absent', () => {
    expect(resolveChaosSpecCatalogAvailability({ diagramRef: 'missing' }, [shopHome])).toBe(
      'diagram-missing'
    );
  });
});

describe('mergeChaosSpecCatalogEntries', () => {
  it('dedupes by id with later sources winning', () => {
    const bundled = [toChaosSpecCatalogEntry('a.yaml', doc('Bundled', 'shop'))];
    const workspace = [toChaosSpecCatalogEntry('a.yaml', doc('Workspace override', 'shop', 3))];
    const merged = mergeChaosSpecCatalogEntries(bundled, workspace);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.name).toBe('Workspace override');
    expect(merged[0]?.faultCount).toBe(3);
  });
});
