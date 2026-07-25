import { describe, expect, it } from 'vitest';
import { filterPulumiStackFiles, parsePulumiStackToSchema } from './pulumiStack';

describe('pulumiStack', () => {
  it('keeps only Python program files for python runtime', () => {
    const filtered = filterPulumiStackFiles(
      [
        { path: 'Pulumi.yaml', content: 'name: stack\nruntime:\n  name: python\n' },
        { path: '__main__.py', content: 'from pulumi_gcp.container import Cluster\n' },
      ],
      'python'
    );
    expect(filtered.map(file => file.path)).toEqual(['__main__.py']);
  });

  it('keeps YAML resources for yaml runtime and skips stack config files', () => {
    const filtered = filterPulumiStackFiles(
      [
        {
          path: 'Pulumi.yaml',
          content: 'name: stack\nruntime: yaml\nresources:\n  bucket:\n    type: aws:s3:Bucket\n',
        },
        { path: 'Pulumi.dev.yaml', content: 'config:\n  aws:region: us-east-1\n' },
      ],
      'yaml'
    );
    expect(filtered.map(file => file.path)).toEqual(['Pulumi.yaml']);
  });

  it('parses imperative Python stacks without project metadata YAML', () => {
    const result = parsePulumiStackToSchema(
      [
        { path: 'Pulumi.yaml', content: 'name: gcp-py-gke\nruntime:\n  name: python\n' },
        {
          path: '__main__.py',
          content: `from pulumi_gcp.container import Cluster

k8s_cluster = Cluster(
    "gke-cluster",
    initial_node_count=3,
)
`,
        },
      ],
      'python',
      { targetLevel: 'container', parentEntityRef: 'blueprint/gcp-py-gke' }
    );

    expect(result.schema.nodes).toHaveLength(1);
    expect(result.schema.nodes[0]?.name).toBe('gke-cluster');
  });
});
