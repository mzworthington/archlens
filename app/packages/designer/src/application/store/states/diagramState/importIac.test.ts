import { describe, it, expect } from 'vitest';
import { previewIacImport } from './importIac';
import type { SystemSchema } from '@blueprint/core';

const baseSchema: SystemSchema = {
  name: 'Test Workspace',
  apiVersion: 'blueprint.dev/v4', kind: 'Diagram',
  level: 'container',
  entityRef: 'test-workspace',
  nodes: [{ entityRef: 'test-workspace/gateway', type: 'rest-api', name: 'Gateway', x: 0, y: 0 }],
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
    expect(preview.parseResult.schema.nodes).toHaveLength(1);
    expect(preview.parseResult.schema.nodes[0]?.name).toBe('gcp:container:Cluster.gke-cluster');
  });
});
