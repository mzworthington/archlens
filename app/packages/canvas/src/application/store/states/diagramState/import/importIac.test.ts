import { describe, it, expect } from 'vitest';
import { previewIacImport } from './importIac';
import type { SystemSchema } from '@archlens/core';

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

describe('previewIacImport', () => {
  it('returns parse result and merge plan for terraform resources', () => {
    const preview = previewIacImport(
      [
        {
          path: 'main.tf',
          content: 'resource "aws_lambda_function" "api" { function_name = "api" }',
        },
      ],
      {
        baseSchema,
        loadedSystems: [{ path: 'blueprint.yaml', name: 'Test Workspace', schema: baseSchema }],
        currentFilePath: 'blueprint.yaml',
        workspaceName: 'Test Workspace',
        isWorkspaceOpen: true,
      }
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
      {
        baseSchema,
        loadedSystems: [{ path: 'blueprint.yaml', name: 'Test Workspace', schema: baseSchema }],
        currentFilePath: 'blueprint.yaml',
        workspaceName: 'Test Workspace',
        isWorkspaceOpen: true,
      }
    );

    expect(preview.parseResult.vendor).toBe('pulumi');
    expect(preview.parsedNodeCount).toBe(1);
    expect(
      preview.parseResult.schema.nodes.some(n => n.name === 'gcp:container:Cluster.gke-cluster')
    ).toBe(true);
    expect(
      preview.parseResult.schema.nodes.some(n => n.properties?.['iac.product'] === 'compute')
    ).toBe(true);
  });

  it('omits supporting terraform resources from container merge additions', () => {
    const preview = previewIacImport(
      [
        {
          path: 'main.tf',
          content: `
resource "aws_lambda_function" "api" { function_name = "api" }
resource "aws_iam_role" "lambda" { name = "lambda" }
resource "aws_s3_bucket" "assets" { bucket = "assets" }
resource "aws_s3_bucket_policy" "assets" { bucket = "assets" }
`,
        },
      ],
      {
        baseSchema,
        loadedSystems: [{ path: 'blueprint.yaml', name: 'Test Workspace', schema: baseSchema }],
        currentFilePath: 'blueprint.yaml',
        workspaceName: 'Test Workspace',
        isWorkspaceOpen: true,
      }
    );

    expect(preview.omittedNodeCount).toBeGreaterThan(0);
    const products = preview.mergePlan.additions.nodes
      .filter(n => n.properties?.['iac.view'] === 'resource')
      .map(n => n.properties?.['iac.product']);
    expect(products.sort()).toEqual(['lambda', 's3']);
    expect(
      preview.mergePlan.additions.nodes.some(
        n => n.properties?.['iac.address'] === 'aws_iam_role.lambda'
      )
    ).toBe(false);
  });

  it('lists a name collision when a projected vendor already exists', () => {
    const contextSchema: SystemSchema = {
      name: 'Acme',
      version: '1.0.0',
      level: 'context',
      entityRef: 'acme',
      nodes: [
        {
          entityRef: 'acme/vendor-aws',
          type: 'software-system',
          name: 'Amazon Web Services',
          position: { x: 0, y: 0 },
          external: true,
        },
      ],
      dependencies: [],
    };

    const preview = previewIacImport(
      [
        {
          path: 'main.tf',
          content: 'resource "aws_lambda_function" "api" { function_name = "api" }',
        },
      ],
      {
        baseSchema: contextSchema,
        loadedSystems: [{ path: 'context.yaml', name: 'Acme', schema: contextSchema }],
        currentFilePath: 'context.yaml',
        workspaceName: 'Acme',
        isWorkspaceOpen: true,
      }
    );

    expect(preview.mergePlan.conflicts.map(c => c.entityRef)).toContain('acme/vendor-aws');
    expect(preview.parseResult.schema.nodes).toHaveLength(1);
  });

  it('still rejects mixed terraform and pulumi in one import', () => {
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
        {
          baseSchema,
          loadedSystems: [{ path: 'blueprint.yaml', name: 'Test Workspace', schema: baseSchema }],
          currentFilePath: 'blueprint.yaml',
          workspaceName: 'Test Workspace',
          isWorkspaceOpen: true,
        }
      )
    ).toThrow(/mixed-vendor/);
  });
});
