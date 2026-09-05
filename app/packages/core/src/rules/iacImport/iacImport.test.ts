import { describe, it, expect } from 'vitest';
import {
  defaultIacPathForKind,
  detectIacSourceKind,
  inferPulumiRuntime,
  parseIacBatchToSchema,
  parseIacToSchema,
  vendorForKind,
} from './index';

describe('detectIacSourceKind', () => {
  it('detects terraform hcl from path and content', () => {
    expect(detectIacSourceKind('main.tf', 'resource "aws_s3_bucket" "x" {}')).toBe('terraform-hcl');
  });

  it('detects pulumi yaml from project file name', () => {
    expect(detectIacSourceKind('Pulumi.yaml', 'name: stack\nruntime: yaml')).toBe('pulumi-yaml');
  });

  it('detects pulumi typescript from imports', () => {
    expect(
      detectIacSourceKind(
        'index.ts',
        'import * as aws from "@pulumi/aws";\nnew aws.lambda.Function("api", {});'
      )
    ).toBe('pulumi-typescript');
  });

  it('detects pulumi python from path before import heuristics', () => {
    expect(
      detectIacSourceKind(
        '__main__.py',
        'import pulumi\nimport pulumi_gcp as gcp\n\ncluster = gcp.container.Cluster("x")'
      )
    ).toBe('pulumi-python');
  });
});

describe('parseIacToSchema', () => {
  it('parses terraform hcl through the unified entrypoint', () => {
    const hcl = `
resource "aws_lambda_function" "api" {
  function_name = "api"
}
`;
    const result = parseIacToSchema(hcl, 'main.tf', {
      targetLevel: 'container',
      parentEntityRef: 'infra/prod',
    });

    expect(result.vendor).toBe('terraform');
    expect(result.format).toBe('hcl');
    expect(result.schema.nodes.some(n => n.type === 'serverless-function')).toBe(true);
    const lambda = result.schema.nodes.find(n => n.type === 'serverless-function');
    expect(lambda?.properties?.filepath).toBe('main.tf');
  });

  it('parses pulumi yaml through the unified entrypoint', () => {
    const yaml = `
name: api-stack
runtime: yaml
resources:
  api:
    type: aws:lambda:Function
    properties:
      functionName: api
`;
    const result = parseIacToSchema(yaml, 'Pulumi.yaml', {
      targetLevel: 'container',
      parentEntityRef: 'infra/prod',
    });

    expect(result.vendor).toBe('pulumi');
    expect(result.format).toBe('yaml');
    expect(result.schema.nodes.some(n => n.type === 'serverless-function')).toBe(true);
  });

  it('parses pulumi python through the unified entrypoint', () => {
    const py = `
import pulumi_gcp as gcp

cluster = gcp.container.Cluster("hello-world")
`;
    const result = parseIacToSchema(py, '__main__.py', {
      targetLevel: 'container',
      parentEntityRef: 'application/gcp-py-gke',
    });

    expect(result.vendor).toBe('pulumi');
    expect(result.format).toBe('python');
    expect(result.schema.nodes).toHaveLength(1);
  });
});

describe('parseIacBatchToSchema', () => {
  it('merges multiple terraform files', () => {
    const result = parseIacBatchToSchema(
      [
        {
          path: 'main.tf',
          content: 'resource "aws_lambda_function" "api" { function_name = "api" }',
        },
        {
          path: 'iam.tf',
          content: 'resource "aws_iam_role" "lambda" { name = "lambda" }',
        },
      ],
      { targetLevel: 'container', parentEntityRef: 'infra/prod' }
    );

    expect(result.vendor).toBe('terraform');
    expect(result.schema.nodes.length).toBe(2);

    const lambda = result.schema.nodes.find(
      n => n.properties?.['iac.address'] === 'aws_lambda_function.api'
    );
    const role = result.schema.nodes.find(
      n => n.properties?.['iac.address'] === 'aws_iam_role.lambda'
    );
    expect(lambda?.properties?.filepath).toBe('main.tf');
    expect(role?.properties?.filepath).toBe('iam.tf');
  });

  it('rejects mixed terraform and pulumi vendors', () => {
    expect(() =>
      parseIacBatchToSchema(
        [
          { path: 'main.tf', content: 'resource "aws_s3_bucket" "x" {}' },
          {
            path: 'Pulumi.yaml',
            content:
              'name: s\nruntime: yaml\nresources:\n  api:\n    type: aws:lambda:Function\n    properties: {}',
          },
        ],
        { targetLevel: 'container' }
      )
    ).toThrow(/mixed-vendor/);
  });

  it('uses pulumiRuntime to parse imperative stacks without project metadata', () => {
    const result = parseIacBatchToSchema(
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
      ],
      {
        targetLevel: 'container',
        parentEntityRef: 'application/gcp-py-gke',
        pulumiRuntime: 'python',
      }
    );

    expect(result.vendor).toBe('pulumi');
    expect(result.schema.nodes).toHaveLength(1);
    expect(result.schema.nodes[0]?.name).toBe('gcp:container:Cluster.gke-cluster');
  });

  it('infers pulumiRuntime from Pulumi.yaml when not passed explicitly', () => {
    const result = parseIacBatchToSchema(
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
        targetLevel: 'container',
        parentEntityRef: 'application/gcp-py-gke',
      }
    );

    expect(result.schema.nodes).toHaveLength(1);
    expect(result.schema.nodes[0]?.name).toBe('gcp:container:Cluster.gke-cluster');
  });
});

describe('vendorForKind', () => {
  it('maps kinds to vendors', () => {
    expect(vendorForKind('terraform-hcl')).toBe('terraform');
    expect(vendorForKind('pulumi-yaml')).toBe('pulumi');
  });
});

describe('defaultIacPathForKind', () => {
  it('returns virtual paths for paste imports', () => {
    expect(defaultIacPathForKind('auto')).toBe('main.tf');
    expect(defaultIacPathForKind('pulumi-python')).toBe('__main__.py');
    expect(defaultIacPathForKind('pulumi-typescript')).toBe('index.ts');
  });
});

describe('inferPulumiRuntime', () => {
  it('reads nested runtime.name from project metadata', () => {
    expect(
      inferPulumiRuntime(
        [{ path: 'Pulumi.yaml', content: 'name: stack\nruntime:\n  name: python\n' }],
        {}
      )
    ).toBe('python');
  });
});
