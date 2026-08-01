import { describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { parseSchemaFromYaml } from '@archlens/core';
import { IacAnalyzer } from './iacAnalyzer.ts';
import { ContextLevelWriter } from '../../writers/contextLevelWriter.ts';
import { discoverSystems } from './systemDiscovery.ts';
import { MockFileSystem } from '../../test/fakes.ts';
import type { DiscoveredSystem } from './systemDiscovery.ts';

class SilentLogger {
  infos: string[] = [];
  warns: string[] = [];
  info(message: string) {
    this.infos.push(message);
  }
  warn(message: string) {
    this.warns.push(message);
  }
  error() {}
}

const fallbackRepo: DiscoveredSystem[] = [
  {
    id: 'repo',
    displayName: 'Repo',
    rootPath: '',
    kind: 'fallback',
    productId: 'repo',
  },
];

describe('IacAnalyzer', () => {
  it('parses a terraform root and writes containers.yaml + context node', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const infra = path.resolve('/repo/infra');
    const out = path.resolve('/repo/blueprints');

    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['infra']);
    fs.directories.set(infra, ['main.tf']);
    fs.textFiles.set(
      path.resolve('/repo/infra/main.tf'),
      `
resource "aws_lambda_function" "api" {
  function_name = "api"
  role          = aws_iam_role.lambda.arn
}
resource "aws_iam_role" "lambda" {
  name = "lambda"
}
`
    );
    fs.existingFiles.add(path.resolve('/repo/infra/main.tf'));

    const analyzer = new IacAnalyzer({
      fileSystem: fs,
      logger: new SilentLogger(),
    });

    const result = await analyzer.run('Acme', out, {
      scanRoot: scan,
      discoveredSystems: fallbackRepo,
    });
    expect(result.rootsAnalyzed).toBe(1);
    expect(result.terraformRoots).toBe(1);
    expect(result.pulumiRoots).toBe(0);

    const containersPath = path.resolve('/repo/blueprints/infra/containers.yaml');
    expect(fs.writtenFiles.has(containersPath)).toBe(true);
    const schema = parseSchemaFromYaml(fs.writtenFiles.get(containersPath)!);
    expect(schema.level).toBe('container');
    expect(schema.entityRef).toBe('acme/infra');
    expect(
      schema.nodes.some(n => n.properties?.['iac.provider_type'] === 'aws_lambda_function')
    ).toBe(true);
    const lambda = schema.nodes.find(
      n => n.properties?.['iac.provider_type'] === 'aws_lambda_function'
    );
    expect(lambda?.properties?.filepath).toBe('infra/main.tf');
    expect(schema.dependencies.length).toBeGreaterThanOrEqual(1);

    const contextPath = path.resolve('/repo/blueprints/acme/context.yaml');
    expect(fs.writtenFiles.has(contextPath)).toBe(true);
    const context = parseSchemaFromYaml(fs.writtenFiles.get(contextPath)!);

    expect(context.nodes.find(n => n.entityRef === 'acme/infrastructure')).toBeUndefined();
    expect(context.nodes.find(n => n.entityRef === 'acme/infra')).toMatchObject({
      parentEntityRef: undefined,
      properties: expect.objectContaining({ productId: 'repo' }),
    });
  });

  it('parses a pulumi project and writes containers.yaml + context node', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const infra = path.resolve('/repo/infra');
    const out = path.resolve('/repo/blueprints');

    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['infra']);
    fs.directories.set(infra, ['Pulumi.yaml']);
    fs.textFiles.set(
      path.resolve('/repo/infra/Pulumi.yaml'),
      `
name: infra
runtime: yaml
resources:
  api:
    type: aws:lambda:Function
    properties:
      functionName: api
      role: \${lambdaRole.arn}
  lambdaRole:
    type: aws:iam:Role
    properties:
      assumeRolePolicy: "{}"
`
    );
    fs.existingFiles.add(path.resolve('/repo/infra/Pulumi.yaml'));

    const analyzer = new IacAnalyzer({
      fileSystem: fs,
      logger: new SilentLogger(),
    });

    const result = await analyzer.run('Acme', out, {
      scanRoot: scan,
      discoveredSystems: fallbackRepo,
    });
    expect(result.rootsAnalyzed).toBe(1);
    expect(result.terraformRoots).toBe(0);
    expect(result.pulumiRoots).toBe(1);

    const containersPath = path.resolve('/repo/blueprints/infra/containers.yaml');
    const schema = parseSchemaFromYaml(fs.writtenFiles.get(containersPath)!);
    expect(schema.entityRef).toBe('acme/infra');
    expect(
      schema.nodes.some(n => n.properties?.['iac.provider_type'] === 'aws_lambda_function')
    ).toBe(true);

    const context = parseSchemaFromYaml(
      fs.writtenFiles.get(path.resolve('/repo/blueprints/acme/context.yaml'))!
    );
    expect(context.nodes.find(n => n.entityRef === 'acme/infra')).toMatchObject({
      parentEntityRef: undefined,
      properties: expect.objectContaining({ productId: 'repo' }),
    });
  });

  it('parses a python pulumi project with nested runtime and __main__.py', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const project = path.resolve('/repo/gcp-py-gke');
    const out = path.resolve('/repo/blueprints');

    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['gcp-py-gke']);
    fs.directories.set(project, ['Pulumi.yaml', '__main__.py']);
    fs.textFiles.set(
      path.resolve('/repo/gcp-py-gke/Pulumi.yaml'),
      `name: gcp-py-gke
runtime:
  name: python
`
    );
    fs.textFiles.set(
      path.resolve('/repo/gcp-py-gke/__main__.py'),
      `from pulumi_gcp.container import Cluster

k8s_cluster = Cluster(
    "gke-cluster",
    initial_node_count=3,
)
`
    );
    fs.existingFiles.add(path.resolve('/repo/gcp-py-gke/Pulumi.yaml'));
    fs.existingFiles.add(path.resolve('/repo/gcp-py-gke/__main__.py'));

    const analyzer = new IacAnalyzer({
      fileSystem: fs,
      logger: new SilentLogger(),
    });

    const result = await analyzer.run('Blueprint', out, {
      scanRoot: scan,
      discoveredSystems: fallbackRepo,
    });

    expect(result.pulumiRoots).toBe(1);
    const containersPath = path.resolve('/repo/blueprints/gcp-py-gke/containers.yaml');
    const schema = parseSchemaFromYaml(fs.writtenFiles.get(containersPath)!);
    expect(schema.nodes.length).toBeGreaterThan(0);
    expect(schema.nodes.some(n => n.name === 'gcp:container:Cluster.gke-cluster')).toBe(true);
  });

  it('writes terraform and pulumi roots to context in one pass', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const tf = path.resolve('/repo/tf-stack');
    const pu = path.resolve('/repo/pu-stack');
    const out = path.resolve('/repo/blueprints');

    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['tf-stack', 'pu-stack']);
    fs.directories.set(tf, ['main.tf']);
    fs.directories.set(pu, ['Pulumi.yaml']);
    fs.textFiles.set(path.resolve(tf, 'main.tf'), `resource "aws_s3_bucket" "a" {}`);
    fs.textFiles.set(
      path.resolve(pu, 'Pulumi.yaml'),
      `name: pu\nruntime: yaml\nresources:\n  bucket:\n    type: aws:s3:Bucket\n`
    );
    fs.existingFiles.add(path.resolve(tf, 'main.tf'));
    fs.existingFiles.add(path.resolve(pu, 'Pulumi.yaml'));

    const analyzer = new IacAnalyzer({ fileSystem: fs, logger: new SilentLogger() });
    const result = await analyzer.run('Acme', out, {
      scanRoot: scan,
      discoveredSystems: fallbackRepo,
    });

    expect(result.rootsAnalyzed).toBe(2);
    expect(result.terraformRoots).toBe(1);
    expect(result.pulumiRoots).toBe(1);

    const context = parseSchemaFromYaml(
      fs.writtenFiles.get(path.resolve('/repo/blueprints/acme/context.yaml'))!
    );
    expect(context.nodes.some(n => n.entityRef === 'acme/tf-stack')).toBe(true);
    expect(context.nodes.some(n => n.entityRef === 'acme/pu-stack')).toBe(true);
  });

  it('links multiple terraform roots under the owning product hub', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const a = path.resolve('/repo/stack-a');
    const b = path.resolve('/repo/stack-b');
    const out = path.resolve('/repo/blueprints');

    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['stack-a', 'stack-b']);
    fs.directories.set(a, ['main.tf']);
    fs.directories.set(b, ['main.tf']);
    fs.textFiles.set(path.resolve('/repo/stack-a/main.tf'), `resource "aws_s3_bucket" "a" {}`);
    fs.textFiles.set(path.resolve('/repo/stack-b/main.tf'), `resource "aws_s3_bucket" "b" {}`);
    fs.existingFiles.add(path.resolve('/repo/stack-a/main.tf'));
    fs.existingFiles.add(path.resolve('/repo/stack-b/main.tf'));

    const analyzer = new IacAnalyzer({ fileSystem: fs, logger: new SilentLogger() });
    const result = await analyzer.run('Acme', out, {
      scanRoot: scan,
      discoveredSystems: fallbackRepo,
    });
    expect(result.rootsAnalyzed).toBe(2);

    const context = parseSchemaFromYaml(
      fs.writtenFiles.get(path.resolve('/repo/blueprints/acme/context.yaml'))!
    );
    expect(
      context.nodes.filter(n => n.entityRef === 'acme/stack-a' || n.entityRef === 'acme/stack-b')
    ).toHaveLength(2);
  });

  it('nests terraform roots under the product hub that owns their path', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const tfRoot = path.resolve('/repo/contrib/terraform/techdocs-s3-storage');
    const out = path.resolve('/repo/blueprints');

    fs.existingFiles.add(scan);
    fs.textFiles.set(
      path.resolve('/repo/package.json'),
      JSON.stringify({ name: 'backstage', workspaces: ['packages/*', 'plugins/*'] })
    );
    fs.directories.set(scan, ['contrib', 'packages', 'plugins', 'microsite']);
    fs.directories.set(path.resolve('/repo/contrib'), ['terraform']);
    fs.directories.set(path.resolve('/repo/contrib/terraform'), ['techdocs-s3-storage']);
    fs.directories.set(tfRoot, ['main.tf']);
    fs.textFiles.set(path.resolve(tfRoot, 'main.tf'), `resource "aws_s3_bucket" "docs" {}`);
    fs.existingFiles.add(path.resolve(tfRoot, 'main.tf'));

    const discoveredSystems = discoverSystems(scan, fs, { fallbackId: 'backstage' });
    const analyzer = new IacAnalyzer({ fileSystem: fs, logger: new SilentLogger() });
    await analyzer.run('backstage', out, { scanRoot: scan, discoveredSystems });

    const context = parseSchemaFromYaml(
      fs.writtenFiles.get(path.resolve('/repo/blueprints/backstage/context.yaml'))!
    );
    expect(context.nodes.find(n => n.entityRef === 'backstage')?.type).toBe('group');
    expect(context.nodes.find(n => n.entityRef === 'backstage/techdocs-s3-storage')).toMatchObject({
      parentEntityRef: 'backstage',
      properties: expect.objectContaining({ productId: 'backstage' }),
    });
  });

  it('groups sibling terraform modules under a shared folder frame', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const awsRedirect = path.resolve('/repo/aws/aws_domain_redirect');
    const awsLambda = path.resolve('/repo/aws/aws_lambda_api');
    const out = path.resolve('/repo/blueprints');

    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['aws']);
    fs.directories.set(path.resolve('/repo/aws'), ['aws_domain_redirect', 'aws_lambda_api']);
    fs.directories.set(awsRedirect, ['main.tf']);
    fs.directories.set(awsLambda, ['main.tf']);
    fs.textFiles.set(
      path.resolve(awsRedirect, 'main.tf'),
      `resource "aws_s3_bucket" "redirect" {}`
    );
    fs.textFiles.set(path.resolve(awsLambda, 'main.tf'), `resource "aws_lambda_function" "api" {}`);
    fs.existingFiles.add(path.resolve(awsRedirect, 'main.tf'));
    fs.existingFiles.add(path.resolve(awsLambda, 'main.tf'));

    const analyzer = new IacAnalyzer({ fileSystem: fs, logger: new SilentLogger() });
    await analyzer.run('Acme', out, { scanRoot: scan, discoveredSystems: fallbackRepo });

    const context = parseSchemaFromYaml(
      fs.writtenFiles.get(path.resolve('/repo/blueprints/acme/context.yaml'))!
    );
    expect(context.nodes.find(n => n.entityRef === 'acme/aws')).toMatchObject({
      type: 'group',
      name: 'Aws System',
    });
    expect(context.nodes.find(n => n.entityRef === 'acme/aws-lambda-api')).toMatchObject({
      parentEntityRef: 'acme/aws',
    });
  });

  it('nests IaC modules under an existing product hub instead of a folder group', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const awsRedirect = path.resolve('/repo/aws/aws_domain_redirect');
    const awsLambda = path.resolve('/repo/aws/aws_lambda_api');
    const out = path.resolve('/repo/blueprints');

    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['aws']);
    fs.directories.set(path.resolve('/repo/aws'), ['aws_domain_redirect', 'aws_lambda_api']);
    fs.directories.set(awsRedirect, ['main.tf']);
    fs.directories.set(awsLambda, ['main.tf']);
    fs.textFiles.set(
      path.resolve(awsRedirect, 'main.tf'),
      `resource "aws_s3_bucket" "redirect" {}`
    );
    fs.textFiles.set(path.resolve(awsLambda, 'main.tf'), `resource "aws_lambda_function" "api" {}`);
    fs.existingFiles.add(path.resolve(awsRedirect, 'main.tf'));
    fs.existingFiles.add(path.resolve(awsLambda, 'main.tf'));
    fs.textFiles.set(
      path.resolve('/repo/package.json'),
      JSON.stringify({ name: 'terraform-examples' })
    );
    fs.existingFiles.add(path.resolve('/repo/package.json'));

    const discoveredSystems = discoverSystems(scan, fs, { fallbackId: 'terraform-examples' });
    const contextWriter = new ContextLevelWriter(fs, new SilentLogger());
    await contextWriter.write(out, 'infrastructure', 'terraform-examples', 'Terraform Examples');

    const analyzer = new IacAnalyzer({ fileSystem: fs, logger: new SilentLogger() });
    await analyzer.run('infrastructure', out, { scanRoot: scan, discoveredSystems });

    const context = parseSchemaFromYaml(
      fs.writtenFiles.get(path.resolve('/repo/blueprints/infrastructure/context.yaml'))!
    );
    expect(context.nodes.find(n => n.entityRef === 'infrastructure/aws')).toBeUndefined();
    expect(context.nodes.find(n => n.entityRef === 'infrastructure/terraform-examples')?.type).toBe(
      'group'
    );
    expect(context.nodes.find(n => n.entityRef === 'infrastructure/aws-lambda-api')).toMatchObject({
      parentEntityRef: 'infrastructure/terraform-examples',
    });
    expect(
      fs.writtenFiles.has(
        path.resolve('/repo/blueprints/infrastructure/aws-lambda-api/containers.yaml')
      )
    ).toBe(true);
    expect(
      fs.writtenFiles.has(path.resolve('/repo/blueprints/aws-lambda-api/containers.yaml'))
    ).toBe(false);
  });

  it('does not run code-scan fallback for empty terraform roots', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const infra = path.resolve('/repo/infra');
    const out = path.resolve('/repo/blueprints');

    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['infra']);
    fs.directories.set(infra, ['main.tf', 'helpers.ts']);
    fs.textFiles.set(path.resolve('/repo/infra/main.tf'), '# empty terraform root');
    fs.textFiles.set(path.resolve('/repo/infra/helpers.ts'), 'export const unused = 1;');
    fs.existingFiles.add(path.resolve('/repo/infra/main.tf'));
    fs.existingFiles.add(path.resolve('/repo/infra/helpers.ts'));

    const parseSourceFiles = vi.fn().mockResolvedValue([]);
    const analyzer = new IacAnalyzer({
      fileSystem: fs,
      logger: new SilentLogger(),
      parser: { parseSourceFiles },
    });

    const result = await analyzer.run('Acme', out, {
      scanRoot: scan,
      discoveredSystems: fallbackRepo,
    });

    expect(result.terraformRoots).toBe(1);
    expect(parseSourceFiles).not.toHaveBeenCalled();
  });

  it('no-ops when no IaC roots exist', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['src']);
    fs.directories.set(path.resolve('/repo/src'), []);

    const analyzer = new IacAnalyzer({ fileSystem: fs, logger: new SilentLogger() });
    const result = await analyzer.run('Acme', path.resolve('/repo/blueprints'), {
      scanRoot: scan,
      discoveredSystems: fallbackRepo,
    });
    expect(result.rootsAnalyzed).toBe(0);
    expect(fs.writtenFiles.size).toBe(0);
  });
});
