import { describe, expect, it } from 'vitest';
import {
  defaultEstateKeyPrefix,
  parseArchlensCommand,
  parseCatalogComposeArgv,
  parseCatalogPublishFragmentArgv,
} from './parseArchlensArgv.ts';

describe('parse catalog commands', () => {
  it('defaults compose key prefix from estate id and skips validation', () => {
    const plan = parseCatalogComposeArgv(['catalog', 'compose', '--estate=archlens']);
    expect(plan.estateId).toBe('archlens');
    expect(plan.keyPrefix).toBe('estates/archlens');
    expect(plan.dryRun).toBe(true);
    expect(plan.skipValidation).toBe(true);
    expect(plan.maxRetries).toBe(3);
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
  });

  it('rejects missing required flags', () => {
    expect(() => parseCatalogComposeArgv(['catalog', 'compose'])).toThrow(/--estate/);
    expect(() =>
      parseCatalogPublishFragmentArgv(['catalog', 'publish-fragment', '--estate=x'])
    ).toThrow(/--product/);
  });
});
