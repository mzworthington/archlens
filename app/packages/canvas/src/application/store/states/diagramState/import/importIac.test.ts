import { describe, it, expect } from 'vitest';
import { parseIacBatchToSchema, projectMeaningfulIacExternals } from '@archlens/core/import-iac';
import type { SystemSchema } from '@archlens/core';
import {
  describeIacImportPreview,
  IAC_IMPORT_FILTER_NOTE,
  IAC_IMPORT_MERGE_FOOTER,
} from './iacImportCopy';
import { previewIacImport } from './importIac';
import { parentEntityRefForImport, type DiagramImportContext } from './diagramImportShared';

const baseSchema: SystemSchema = {
  name: 'Test Workspace',
  version: '1.0.0',
  level: 'container',
  entityRef: 'test-workspace',
  nodes: [
    {
      entityRef: 'test-workspace/gateway',
      type: 'rest-api',
      name: 'Gateway',
      position: { x: 0, y: 0 },
    },
  ],
  dependencies: [],
};

function importContext(schema: SystemSchema = baseSchema): DiagramImportContext {
  return {
    baseSchema: schema,
    loadedSystems: [{ path: 'blueprint.yaml', name: 'Test Workspace', schema }],
    currentFilePath: 'blueprint.yaml',
    workspaceName: 'Test Workspace',
    isWorkspaceOpen: true,
  };
}

const CLOUDFLARE_PACK = `import * as cloudflare from "@pulumi/cloudflare";

const pages = new cloudflare.PagesProject("archlens", {
  accountId: "acct",
  name: "archlens",
  productionBranch: "main",
});

const bucket = new cloudflare.R2Bucket("catalog", {
  accountId: "acct",
  name: "catalog",
});

const dns = new cloudflare.DnsRecord("apex", {
  zoneId: "zone",
  name: "@",
  type: "CNAME",
  content: "archlens.pages.dev",
});

const cors = new cloudflare.R2BucketCors("catalog-cors", {
  bucket: bucket.name,
});
`;

const cloudflarePackFiles = [{ path: 'index.ts', content: CLOUDFLARE_PACK }];

describe('previewIacImport', () => {
  it('returns parse result and merge plan for terraform resources', () => {
    const preview = previewIacImport(
      [
        {
          path: 'main.tf',
          content: 'resource "aws_lambda_function" "api" { function_name = "api" }',
        },
      ],
      importContext()
    );

    expect(preview.parseResult.vendor).toBe('terraform');
    expect(preview.mergePlan.additions.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('parses multi-file python pulumi stacks using runtime from Pulumi.yaml', () => {
    const preview = previewIacImport(
      [
        {
          path: 'Pulumi.yaml',
          content: 'name: gcp-py-gke\nruntime:\n  name: python\n',
        },
        {
          path: '__main__.py',
          content: `from pulumi_gcp.container import Cluster

k8s_cluster = Cluster("gke-cluster", initial_node_count=3)
`,
        },
        {
          path: 'Pulumi.dev.yaml',
          content: 'config:\n  gcp:project: demo\n',
        },
      ],
      importContext()
    );

    expect(preview.parseResult.vendor).toBe('pulumi');
    expect(
      preview.parseResult.schema.nodes.some(n => n.name === 'gcp:container:Cluster.gke-cluster')
    ).toBe(true);
    expect(
      preview.parseResult.schema.nodes
        .filter(n => n.properties?.['iac.view'] === 'resource')
        .map(n => n.properties?.['iac.product'])
    ).toEqual(['compute']);
  });

  it('lands the same meaningful externals as a CLI scan of the same pack', () => {
    const context = importContext();
    const infraSystemEntityRef = parentEntityRefForImport(context);
    const landscapeEntityRef = infraSystemEntityRef.includes('/')
      ? infraSystemEntityRef.slice(0, infraSystemEntityRef.indexOf('/'))
      : infraSystemEntityRef;

    const parsed = parseIacBatchToSchema(cloudflarePackFiles, {
      targetLevel: context.baseSchema.level,
      parentEntityRef: infraSystemEntityRef,
    });
    const cli = projectMeaningfulIacExternals(parsed.schema, {
      landscapeEntityRef,
      infraSystemEntityRef,
      servedSystemRefs: [landscapeEntityRef],
    });

    const preview = previewIacImport(cloudflarePackFiles, context);

    const productsOf = (schema: SystemSchema) =>
      schema.nodes
        .filter(n => n.properties?.['iac.view'] === 'resource')
        .map(n => n.properties?.['iac.product'])
        .sort();

    expect(productsOf(preview.scopedImported)).toEqual(productsOf(cli.containerSchema));
    expect(productsOf(preview.scopedImported)).toEqual(['pages', 'r2']);
    expect(
      preview.scopedImported.nodes.some(
        n => /dns|cors/i.test(n.name) && n.properties?.['iac.view'] === 'resource'
      )
    ).toBe(false);
    expect(
      preview.scopedImported.nodes.filter(n => n.properties?.['iac.view'] === 'declaration').length
    ).toBeGreaterThanOrEqual(4);
  });

  it('lists a real name collision in the merge conflict preview', () => {
    const files = [
      {
        path: 'main.tf',
        content: 'resource "aws_lambda_function" "api" { function_name = "api" }',
      },
    ];
    const emptyPreview = previewIacImport(files, importContext());
    const imported = emptyPreview.scopedImported.nodes.find(
      n => n.properties?.['iac.view'] === 'resource'
    );
    expect(imported).toBeDefined();

    const collidingSchema: SystemSchema = {
      ...baseSchema,
      nodes: [
        ...baseSchema.nodes,
        {
          entityRef: imported!.entityRef,
          type: 'database',
          name: 'Existing product',
          position: { x: 40, y: 40 },
        },
      ],
    };

    const preview = previewIacImport(files, importContext(collidingSchema));
    expect(preview.mergePlan.conflicts.map(c => c.entityRef)).toContain(imported!.entityRef);
  });

  it('rejects mixed terraform and pulumi vendors', () => {
    expect(() =>
      previewIacImport(
        [
          { path: 'main.tf', content: 'resource "aws_s3_bucket" "x" {}' },
          {
            path: 'Pulumi.yaml',
            content:
              'name: s\nruntime: yaml\nresources:\n  api:\n    type: aws:lambda:Function\n    properties: {}',
          },
        ],
        importContext()
      )
    ).toThrow(/mixed-vendor/);
  });
});

describe('describeIacImportPreview', () => {
  it('names meaningful externals from the same filter the preview applies', () => {
    const preview = previewIacImport(cloudflarePackFiles, importContext());
    expect(describeIacImportPreview(preview.parseResult.schema)).toMatch(
      /2 meaningful externals \(pages, r2\), \d+ IaC declarations/
    );
    expect(IAC_IMPORT_FILTER_NOTE).toMatch(/same filter as a CLI scan/i);
    expect(IAC_IMPORT_MERGE_FOOTER).toMatch(/meaningful externals match a CLI scan/i);
  });
});
