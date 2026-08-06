import { describe, expect, it } from 'vitest';
import {
  defaultEstateKeyPrefix,
  parseArchlensCommand,
  parseCatalogComposeArgv,
  parseCatalogPruneArgv,
  parseCatalogPublishFragmentArgv,
} from './parseArchlensArgv.ts';

describe('parse catalog commands', () => {
  it('defaults compose key prefix from estate id and skips validation', () => {
    const plan = parseCatalogComposeArgv(['catalog', 'compose', '--estate=archlens']);
    expect(plan.estateId).toBe('archlens');
    expect(plan.keyPrefix).toBe('estates/archlens');
    expect(plan.dryRun).toBe(true);
    expect(plan.skipValidation).toBe(true);
    expect(plan.allowEmpty).toBe(false);
    expect(plan.maxRetries).toBe(8);
    expect(defaultEstateKeyPrefix('acme')).toBe('estates/acme');
  });

  it('parses publish-fragment required flags', () => {
    const plan = parseCatalogPublishFragmentArgv([
      'catalog',
      'publish-fragment',
      'out/',
      '--estate=acme',
      '--product=payments',
      '--system=api',
      '--source-ref=repo@abc',
      '--no-dry-run',
    ]);
    expect(plan.targetPath).toBe('out/');
    expect(plan.productId).toBe('payments');
    expect(plan.systemId).toBe('api');
    expect(plan.sourceRef).toBe('repo@abc');
    expect(plan.dryRun).toBe(false);
    expect(plan.keyPrefix).toBe('estates/acme');
  });

  it('defaults prune retention policy and key prefix', () => {
    const plan = parseCatalogPruneArgv(['catalog', 'prune', '--estate=samples']);
    expect(plan.estateId).toBe('samples');
    expect(plan.keyPrefix).toBe('estates/samples');
    expect(plan.dryRun).toBe(true);
    expect(plan.keepSnapshotCount).toBe(7);
    expect(plan.keepSnapshotDays).toBe(14);
    expect(plan.keepFragmentRuns).toBe(2);
  });

  it('routes catalog actions through parseArchlensCommand', () => {
    const compose = parseArchlensCommand(['catalog', 'compose', '--estate=x']);
    expect(compose.kind).toBe('catalog-compose');
    const fragment = parseArchlensCommand([
      'catalog',
      'publish-fragment',
      '--estate=x',
      '--product=y',
      '--source-ref=z',
    ]);
    expect(fragment.kind).toBe('catalog-publish-fragment');
    const accept = parseArchlensCommand([
      'catalog',
      'accept-overlay',
      '--estate=x',
      '--file=overlay.yaml',
    ]);
    expect(accept.kind).toBe('catalog-accept-overlay');
    const reject = parseArchlensCommand([
      'catalog',
      'reject-overlay',
      '--estate=x',
      '--overlay-id=add-billing',
    ]);
    expect(reject.kind).toBe('catalog-reject-overlay');
    const prune = parseArchlensCommand([
      'catalog',
      'prune',
      '--estate=samples',
      '--keep-snapshots=5',
      '--no-dry-run',
    ]);
    expect(prune.kind).toBe('catalog-prune');
    if (prune.kind === 'catalog-prune') {
      expect(prune.plan.keepSnapshotCount).toBe(5);
      expect(prune.plan.dryRun).toBe(false);
    }
  });

  it('rejects missing required flags', () => {
    expect(() => parseCatalogComposeArgv(['catalog', 'compose'])).toThrow(/--estate/);
    expect(() =>
      parseCatalogPublishFragmentArgv(['catalog', 'publish-fragment', '--estate=x'])
    ).toThrow(/--product/);
    expect(() => parseCatalogPruneArgv(['catalog', 'prune'])).toThrow(/--estate/);
  });
});
