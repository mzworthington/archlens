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

  it('classifies AWS Lambda, S3, and RDS as primary products', () => {
    expect(classifyIacResource(node('aws_lambda_function'))).toMatchObject({
      vendorSlug: 'aws',
      productSlug: 'lambda',
      significance: 'primary',
    });
    expect(classifyIacResource(node('aws_s3_bucket'))).toMatchObject({
      vendorSlug: 'aws',
      productSlug: 's3',
      significance: 'primary',
    });
    expect(classifyIacResource(node('aws_rds_instance'))).toMatchObject({
      vendorSlug: 'aws',
      productSlug: 'rds',
      significance: 'primary',
    });
  });

  it('classifies AWS IAM and networking helpers as supporting', () => {
    expect(classifyIacResource(node('aws_iam_role')).significance).toBe('supporting');
    expect(classifyIacResource(node('aws_security_group')).significance).toBe('supporting');
    expect(classifyIacResource(node('aws_s3_bucket_policy')).significance).toBe('supporting');
  });

  it('classifies Azure and GCP primaries', () => {
    expect(classifyIacResource(node('azurerm_function_app'))).toMatchObject({
      vendorSlug: 'azure',
      productSlug: 'functions',
      significance: 'primary',
    });
    expect(classifyIacResource(node('google_cloudfunctions_function'))).toMatchObject({
      vendorSlug: 'gcp',
      productSlug: 'functions',
      significance: 'primary',
    });
    expect(classifyIacResource(node('google_container_cluster'))).toMatchObject({
      vendorSlug: 'gcp',
      productSlug: 'compute',
      significance: 'primary',
    });
  });

  it('returns null for providers outside known packs', () => {
    expect(classifyIacResource(node('datadog_monitor'))).toBeNull();
    expect(classifyIacResource(node('random_string'))).toBeNull();
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
  const infraSystemEntityRef = 'archlens/platform';
  const servedSystemRefs = ['archlens'];

  function schemaFromProviderTypes(
    entries: Array<{ providerType: string; kind?: IacResourceKind; address: string }>
  ): SystemSchema {
    return {
      version: 'https://archlens.dev/schemas/v4/blueprint.schema.json',
      level: 'container',
      entityRef: infraSystemEntityRef,
      name: 'Platform Infrastructure',
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
        providerType: 'cloudflare_index_r2bucket',
        address: 'cloudflare:index:R2Bucket.blueprint-catalog',
      },
      {
        providerType: 'cloudflare_index_r2bucketcors',
        address: 'cloudflare:index:R2BucketCors.blueprint-catalog-cors',
      },
    ]);

    const result = projectMeaningfulIacExternals(schema, {
      landscapeEntityRef,
      infraSystemEntityRef,
      servedSystemRefs,
    });

    expect(result.containerSchema.nodes.map(n => n.properties?.['iac.product']).sort()).toEqual([
      'pages',
      'r2',
    ]);
    expect(result.proposedThirdParties).toHaveLength(1);
    expect(result.proposedThirdParties[0]).toMatchObject({
      entityRef: 'archlens/vendor-cloudflare',
      properties: { vendorSlug: 'cloudflare' },
    });
  });

  it('projects multiple vendors from one Pulumi stack', () => {
    const schema = schemaFromProviderTypes([
      {
        providerType: 'cloudflare_index_pagesproject',
        address: 'cloudflare:index:PagesProject.site',
      },
      { providerType: 'cloudflare_index_dnsrecord', address: 'cloudflare:index:DnsRecord.apex' },
      { providerType: 'aws_lambda_function', address: 'aws:lambda:Function.api' },
      { providerType: 'aws_iam_role', address: 'aws:iam:Role.lambda' },
      { providerType: 'aws_s3_bucket', address: 'aws:s3:Bucket.assets' },
      { providerType: 'aws_s3_bucket_policy', address: 'aws:s3:BucketPolicy.assets' },
    ]);

    const result = projectMeaningfulIacExternals(schema, {
      landscapeEntityRef,
      infraSystemEntityRef,
      servedSystemRefs,
    });

    const products = result.containerSchema.nodes
      .map(n => `${n.properties?.vendorSlug}/${n.properties?.['iac.product']}`)
      .sort();
    expect(products).toEqual(['aws/lambda', 'aws/s3', 'cloudflare/pages']);

    expect(result.proposedThirdParties.map(n => n.properties?.vendorSlug).sort()).toEqual([
      'aws',
      'cloudflare',
    ]);
    expect(result.proposedDependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'archlens', to: 'archlens/vendor-aws' }),
        expect.objectContaining({ from: 'archlens', to: 'archlens/vendor-cloudflare' }),
      ])
    );
    expect(result.containerSchema.nodes.some(n => /iam|dns|policy/i.test(n.name))).toBe(false);
  });

  it('passes through resources outside known vendor packs', () => {
    const schema = schemaFromProviderTypes([
      { providerType: 'datadog_monitor', address: 'datadog_monitor.api' },
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
    ).toEqual(['cloudflare_index_pagesproject', 'datadog_monitor'].sort());
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

  it('projects multi-provider Pulumi TypeScript in one stack', () => {
    const ts = `
import * as cloudflare from "@pulumi/cloudflare";
import * as aws from "@pulumi/aws";

const pages = new cloudflare.PagesProject("site", {
  accountId: "acct",
  name: "site",
  productionBranch: "main",
});

const role = new aws.iam.Role("lambda", { assumeRolePolicy: "{}" });
const api = new aws.lambda.Function("api", {
  functionName: "api",
  role: role.arn,
});
const bucket = new aws.s3.Bucket("assets", {});
`;
    const parsed = parsePulumiToSchema(ts, {
      targetLevel: 'container',
      parentEntityRef: infraSystemEntityRef,
      sourceFormat: 'typescript',
    });

    const result = projectMeaningfulIacExternals(parsed.schema, {
      landscapeEntityRef,
      infraSystemEntityRef,
      servedSystemRefs,
    });

    expect(result.containerSchema.nodes.map(n => n.properties?.['iac.product']).sort()).toEqual([
      'lambda',
      'pages',
      's3',
    ]);
    expect(result.proposedThirdParties.map(n => n.properties?.vendorSlug).sort()).toEqual([
      'aws',
      'cloudflare',
    ]);
  });
});
