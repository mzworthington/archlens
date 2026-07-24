import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { parseSchemaFromYaml } from '@blueprint/core';
import { TerraformAnalyzer } from './terraformAnalyzer.ts';
import { ContextLevelWriter } from '../../writers/contextLevelWriter.ts';
import { MockFileSystem } from '../../test/fakes.ts';

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

describe('TerraformAnalyzer', () => {
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

    const analyzer = new TerraformAnalyzer({
      fileSystem: fs,
      logger: new SilentLogger(),
    });

    const result = await analyzer.run('Acme', out, { scanRoot: scan });
    expect(result.rootsAnalyzed).toBe(1);

    const containersPath = path.resolve('/repo/blueprints/infra/containers.yaml');
    expect(fs.writtenFiles.has(containersPath)).toBe(true);
    const schema = parseSchemaFromYaml(fs.writtenFiles.get(containersPath)!);
    expect(schema.level).toBe('container');
    expect(schema.entityRef).toBe('acme/infra');
    expect(
      schema.nodes.some(n => n.properties?.['iac.provider_type'] === 'aws_lambda_function')
    ).toBe(true);
    expect(schema.dependencies.length).toBeGreaterThanOrEqual(1);

    const contextPath = path.resolve('/repo/blueprints/context.yaml');
    expect(fs.writtenFiles.has(contextPath)).toBe(true);
    const context = parseSchemaFromYaml(fs.writtenFiles.get(contextPath)!);

    const hub = context.nodes.find(n => n.entityRef === 'acme/infrastructure');
    expect(hub).toBeUndefined();

    const spoke = context.nodes.find(n => n.entityRef === 'acme/infra');
    expect(spoke).toMatchObject({
      parentEntityRef: undefined,
      properties: expect.objectContaining({
        productId: 'repo',
      }),
    });

    expect(
      context.dependencies.some(d => d.from === 'acme/infrastructure' && d.to === 'acme/infra')
    ).toBe(false);
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

    const analyzer = new TerraformAnalyzer({
      fileSystem: fs,
      logger: new SilentLogger(),
    });

    const result = await analyzer.run('Acme', out, { scanRoot: scan });
    expect(result.rootsAnalyzed).toBe(2);

    const context = parseSchemaFromYaml(
      fs.writtenFiles.get(path.resolve('/repo/blueprints/context.yaml'))!
    );
    expect(
      context.nodes.filter(n => n.entityRef === 'acme/stack-a' || n.entityRef === 'acme/stack-b')
    ).toHaveLength(2);
    expect(context.nodes.find(n => n.entityRef === 'acme/infrastructure')).toBeUndefined();
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

    const analyzer = new TerraformAnalyzer({
      fileSystem: fs,
      logger: new SilentLogger(),
    });

    await analyzer.run('blueprint', out, { scanRoot: scan });

    const context = parseSchemaFromYaml(
      fs.writtenFiles.get(path.resolve('/repo/blueprints/context.yaml'))!
    );
    const hub = context.nodes.find(n => n.entityRef === 'blueprint/backstage');
    expect(hub?.type).toBe('group');
    expect(context.nodes.find(n => n.entityRef === 'blueprint/infrastructure')).toBeUndefined();
    expect(context.nodes.find(n => n.entityRef === 'blueprint/techdocs-s3-storage')).toMatchObject({
      parentEntityRef: 'blueprint/backstage',
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

    const analyzer = new TerraformAnalyzer({
      fileSystem: fs,
      logger: new SilentLogger(),
    });

    await analyzer.run('Acme', out, { scanRoot: scan });

    const context = parseSchemaFromYaml(
      fs.writtenFiles.get(path.resolve('/repo/blueprints/context.yaml'))!
    );
    expect(context.nodes.find(n => n.entityRef === 'acme/aws')).toMatchObject({
      type: 'group',
      name: 'Aws System',
    });
    expect(context.nodes.find(n => n.entityRef === 'acme/aws-lambda-api')).toMatchObject({
      parentEntityRef: 'acme/aws',
    });
    expect(context.nodes.find(n => n.entityRef === 'acme/aws-domain-redirect')).toMatchObject({
      parentEntityRef: 'acme/aws',
    });
    expect(context.dependencies.some(d => d.from === 'acme/user' && d.to === 'acme/aws')).toBe(
      true
    );
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

    const contextWriter = new ContextLevelWriter(fs, new SilentLogger());
    await contextWriter.write(out, 'Acme', 'terraform-examples', 'Terraform Examples');

    const analyzer = new TerraformAnalyzer({
      fileSystem: fs,
      logger: new SilentLogger(),
    });

    await analyzer.run('Acme', out, { scanRoot: scan });

    const context = parseSchemaFromYaml(
      fs.writtenFiles.get(path.resolve('/repo/blueprints/context.yaml'))!
    );
    expect(context.nodes.find(n => n.entityRef === 'acme/aws')).toBeUndefined();
    expect(context.nodes.find(n => n.entityRef === 'acme/terraform-examples')?.type).toBe('group');
    expect(context.nodes.find(n => n.entityRef === 'acme/aws-lambda-api')).toMatchObject({
      parentEntityRef: 'acme/terraform-examples',
    });
    expect(
      context.dependencies.some(d => d.from === 'acme/user' && d.to === 'acme/terraform-examples')
    ).toBe(true);
    expect(context.dependencies.some(d => d.from === 'acme/user' && d.to === 'acme/aws')).toBe(
      false
    );
  });

  it('no-ops when no terraform roots exist', async () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['src']);
    fs.directories.set(path.resolve('/repo/src'), []);

    const logger = new SilentLogger();
    const analyzer = new TerraformAnalyzer({
      fileSystem: fs,
      logger,
    });

    const result = await analyzer.run('Acme', path.resolve('/repo/blueprints'), {
      scanRoot: scan,
    });
    expect(result.rootsAnalyzed).toBe(0);
    expect(fs.writtenFiles.size).toBe(0);
  });
});
