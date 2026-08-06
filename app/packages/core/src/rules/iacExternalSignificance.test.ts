import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parsePulumiToSchema } from './pulumiImport';
import {
  classifyIacResource,
  infrastructureServesOf,
  projectMeaningfulIacExternals,
  type IacResourceKind,
} from './iacExternalSignificance';
import type { SystemNode, SystemSchema } from '../models/schema';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../../../');

function node(
  providerType: string,
  kind: IacResourceKind = 'resource',
  address?: string
): { providerType: string; kind: IacResourceKind; address: string } {
  return {
    providerType,
    kind,
    address: address ?? `${providerType}.example`,
  };
}

describe('classifyIacResource', () => {
  it('classifies Cloudflare Pages as a primary product', () => {
    expect(classifyIacResource(node('cloudflare_index_pagesproject'))).toMatchObject({
      vendorSlug: 'cloudflare',
      vendorName: 'Cloudflare',
      productSlug: 'pages',
      productName: 'Cloudflare Pages',
      significance: 'primary',
    });
    expect(classifyIacResource(node('cloudflare_pages_project'))).toMatchObject({
      productSlug: 'pages',
      significance: 'primary',
    });
  });

  it('classifies Cloudflare R2 bucket as a primary product', () => {
    expect(classifyIacResource(node('cloudflare_index_r2bucket'))).toMatchObject({
      productSlug: 'r2',
      productName: 'Cloudflare R2',
      significance: 'primary',
    });
    expect(classifyIacResource(node('cloudflare_r2_bucket'))).toMatchObject({
      productSlug: 'r2',
      significance: 'primary',
    });
  });

  it('classifies DNS, Pages domains, CORS, and custom domains as supporting', () => {
    for (const providerType of [
      'cloudflare_index_dnsrecord',
      'cloudflare_dns_record',
      'cloudflare_index_pagesdomain',
      'cloudflare_pages_domain',
      'cloudflare_index_r2bucketcors',
      'cloudflare_r2_bucket_cors',
      'cloudflare_index_r2customdomain',
      'cloudflare_r2_custom_domain',
    ]) {
      expect(classifyIacResource(node(providerType)).significance).toBe('supporting');
    }
  });

  it('classifies zone data sources as noise', () => {
    expect(classifyIacResource(node('cloudflare_index_getzone', 'data')).significance).toBe(
      'noise'
    );
    expect(classifyIacResource(node('cloudflare_zone', 'data')).significance).toBe('noise');
  });

  it('returns null for non-vendor / unclassified owned compute', () => {
    expect(classifyIacResource(node('aws_lambda_function'))).toBeNull();
  });
});

describe('infrastructureServesOf', () => {
  it('reads serves membership from an infrastructure spoke', () => {
    const spoke: SystemNode = {
      entityRef: 'archlens/cloudflare',
      type: 'software-system',
      name: 'Cloudflare Hosting',
      properties: {
        role: 'infrastructure',
        serves: 'archlens, archlens/other',
      },
    };
    expect(infrastructureServesOf(spoke)).toEqual(['archlens', 'archlens/other']);
  });

  it('returns empty when role is not infrastructure', () => {
    expect(
      infrastructureServesOf({
        entityRef: 'archlens',
        type: 'software-system',
        name: 'ArchLens',
        properties: { serves: 'archlens' },
      })
    ).toEqual([]);
  });
});

describe('projectMeaningfulIacExternals', () => {
  const landscapeEntityRef = 'archlens';
  const infraSystemEntityRef = 'archlens/cloudflare';
  const servedSystemRefs = ['archlens'];

  function schemaFromProviderTypes(
    entries: Array<{ providerType: string; kind?: IacResourceKind; address: string }>
  ): SystemSchema {
    return {
      version: 'https://archlens.dev/schemas/v4/blueprint.schema.json',
      level: 'container',
      entityRef: infraSystemEntityRef,
      name: 'Cloudflare Infrastructure',
      nodes: entries.map(entry => ({
        entityRef: `${infraSystemEntityRef}/${entry.address.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        type: 'container' as const,
        name: entry.address,
        properties: {
          'iac.address': entry.address,
          'iac.provider_type': entry.providerType,
          'iac.kind': entry.kind ?? 'resource',
        },
      })),
      dependencies: [],
    };
  }

  it('projects container primaries and a single context vendor for Cloudflare', () => {
    const schema = schemaFromProviderTypes([
      {
        providerType: 'cloudflare_index_pagesproject',
        address: 'cloudflare:index:PagesProject.archlens',
      },
      {
        providerType: 'cloudflare_index_dnsrecord',
        address: 'cloudflare:index:DnsRecord.apex-pages',
      },
      {
        providerType: 'cloudflare_index_dnsrecord',
        address: 'cloudflare:index:DnsRecord.www-pages',
      },
      {
        providerType: 'cloudflare_index_pagesdomain',
        address: 'cloudflare:index:PagesDomain.apex',
      },
      {
        providerType: 'cloudflare_index_r2bucket',
        address: 'cloudflare:index:R2Bucket.blueprint-catalog',
      },
      {
        providerType: 'cloudflare_index_r2bucketcors',
        address: 'cloudflare:index:R2BucketCors.blueprint-catalog-cors',
      },
      {
        providerType: 'cloudflare_index_r2customdomain',
        address: 'cloudflare:index:R2CustomDomain.blueprint-catalog-domain',
      },
      {
        providerType: 'cloudflare_index_getzone',
        kind: 'data',
        address: 'cloudflare:index:getZone',
      },
    ]);

    const result = projectMeaningfulIacExternals(schema, {
      landscapeEntityRef,
      infraSystemEntityRef,
      servedSystemRefs,
    });

    const productSlugs = result.containerSchema.nodes
      .map(n => n.properties?.['iac.product'])
      .sort();
    expect(productSlugs).toEqual(['pages', 'r2']);
    expect(
      result.containerSchema.nodes.every(n => n.parentEntityRef === infraSystemEntityRef)
    ).toBe(true);

    expect(result.proposedThirdParties).toHaveLength(1);
    expect(result.proposedThirdParties[0]).toMatchObject({
      entityRef: 'archlens/vendor-cloudflare',
      name: 'Cloudflare',
      external: true,
      properties: {
        classification: 'third-party',
        vendor: 'Cloudflare',
        vendorSlug: 'cloudflare',
      },
    });

    expect(result.proposedDependencies).toContainEqual({
      from: 'archlens',
      to: 'archlens/vendor-cloudflare',
      type: 'direct-call',
      description: 'Depends on Cloudflare',
    });
  });

  it('passes through unclassified owned resources unchanged', () => {
    const schema = schemaFromProviderTypes([
      { providerType: 'aws_lambda_function', address: 'aws_lambda_function.api' },
      {
        providerType: 'cloudflare_index_pagesproject',
        address: 'cloudflare:index:PagesProject.site',
      },
    ]);

    const result = projectMeaningfulIacExternals(schema, {
      landscapeEntityRef,
      infraSystemEntityRef,
      servedSystemRefs,
    });

    expect(
      result.containerSchema.nodes.map(n => n.properties?.['iac.provider_type']).sort()
    ).toEqual(['aws_lambda_function', 'cloudflare_index_pagesproject'].sort());
    expect(
      result.containerSchema.nodes.find(n => n.properties?.['iac.product'] === 'pages')
    ).toBeTruthy();
  });

  it('dogfoods ArchLens Cloudflare Pulumi source into meaningful externals', () => {
    const source = readFileSync(join(REPO_ROOT, 'infra/cloudflare/index.ts'), 'utf8');
    const parsed = parsePulumiToSchema(source, {
      targetLevel: 'container',
      parentEntityRef: infraSystemEntityRef,
      sourceFormat: 'typescript',
    });

    expect(parsed.schema.nodes.length).toBeGreaterThan(4);

    const result = projectMeaningfulIacExternals(parsed.schema, {
      landscapeEntityRef,
      infraSystemEntityRef,
      servedSystemRefs,
    });

    expect(result.containerSchema.nodes.map(n => n.properties?.['iac.product']).sort()).toEqual([
      'pages',
      'r2',
    ]);
    expect(result.proposedThirdParties).toMatchObject([
      {
        entityRef: 'archlens/vendor-cloudflare',
        properties: { vendorSlug: 'cloudflare', classification: 'third-party' },
      },
    ]);
    expect(result.containerSchema.nodes.some(n => /dns|cors|domain|zone/i.test(n.name))).toBe(
      false
    );
  });
});
