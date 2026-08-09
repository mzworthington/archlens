import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { discoverPulumiRoots } from './pulumiDiscovery.ts';
import { MockFileSystem } from '../test/fakes.ts';

describe('discoverPulumiRoots', () => {
  it('ignores marketplace catalog YAML named pulumi.yaml that is not a Pulumi project', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const catalog = path.resolve('/repo/microsite/data/plugins');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['microsite', 'plugins']);
    fs.directories.set(path.resolve('/repo/microsite'), ['data']);
    fs.directories.set(path.resolve('/repo/microsite/data'), ['plugins']);
    fs.directories.set(catalog, ['pulumi.yaml', 'github.yaml']);
    fs.directories.set(path.resolve('/repo/plugins'), []);
    fs.textFiles.set(
      path.resolve('/repo/microsite/data/plugins/pulumi.yaml'),
      [
        '---',
        'title: Pulumi',
        'author: Pulumi',
        'category: Infrastructure',
        'description: Use Pulumi scaffolder actions',
        '---',
        '',
      ].join('\n')
    );
    fs.existingFiles.add(path.resolve('/repo/microsite/data/plugins/pulumi.yaml'));

    expect(discoverPulumiRoots(scan, fs)).toEqual([]);
  });

  it('finds a project with Pulumi.yaml and yaml resources', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const infra = path.resolve('/repo/infra');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['infra']);
    fs.directories.set(infra, ['Pulumi.yaml']);
    fs.textFiles.set(
      path.resolve('/repo/infra/Pulumi.yaml'),
      `
name: infra
runtime: yaml
resources:
  bucket:
    type: aws:s3:Bucket
`
    );
    fs.existingFiles.add(path.resolve('/repo/infra/Pulumi.yaml'));

    const roots = discoverPulumiRoots(scan, fs);
    expect(roots).toHaveLength(1);
    expect(roots[0]).toMatchObject({
      rootPath: infra,
      systemId: 'infra',
      runtime: 'yaml',
    });
    expect(roots[0].filePaths).toContain(path.resolve('/repo/infra/Pulumi.yaml'));
  });

  it('collects TypeScript sources for nodejs runtime', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const project = path.resolve('/repo/iac');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['iac']);
    fs.directories.set(project, ['Pulumi.yaml', 'index.ts', 'Pulumi.dev.yaml']);
    fs.textFiles.set(
      path.resolve('/repo/iac/Pulumi.yaml'),
      `
name: iac
runtime: nodejs
`
    );
    fs.existingFiles.add(path.resolve('/repo/iac/Pulumi.yaml'));
    fs.existingFiles.add(path.resolve('/repo/iac/index.ts'));

    const roots = discoverPulumiRoots(scan, fs);
    expect(roots).toHaveLength(1);
    expect(roots[0].runtime).toBe('nodejs');
    expect(roots[0].filePaths).toContain(path.resolve('/repo/iac/index.ts'));
    expect(roots[0].filePaths).not.toContain(path.resolve('/repo/iac/Pulumi.yaml'));
    expect(roots[0].filePaths).not.toContain(path.resolve('/repo/iac/Pulumi.dev.yaml'));
  });

  it('collects Python sources when runtime is nested under runtime.name', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const project = path.resolve('/repo/gcp-py-gke');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['gcp-py-gke']);
    fs.directories.set(project, ['Pulumi.yaml', '__main__.py']);
    fs.textFiles.set(
      path.resolve('/repo/gcp-py-gke/Pulumi.yaml'),
      `name: gcp-py-gke
runtime:
  name: python
  options:
    virtualenv: venv
`
    );
    fs.existingFiles.add(path.resolve('/repo/gcp-py-gke/Pulumi.yaml'));
    fs.existingFiles.add(path.resolve('/repo/gcp-py-gke/__main__.py'));

    const roots = discoverPulumiRoots(scan, fs);
    expect(roots).toHaveLength(1);
    expect(roots[0].runtime).toBe('python');
    expect(roots[0].filePaths).toContain(path.resolve('/repo/gcp-py-gke/__main__.py'));
    expect(roots[0].filePaths).not.toContain(path.resolve('/repo/gcp-py-gke/Pulumi.yaml'));
  });

  it('skips nested projects under an outer root', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    const outer = path.resolve('/repo/platform');
    const inner = path.resolve('/repo/platform/modules/net');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['platform']);
    fs.directories.set(outer, ['Pulumi.yaml', 'modules']);
    fs.directories.set(path.resolve('/repo/platform/modules'), ['net']);
    fs.directories.set(inner, ['Pulumi.yaml']);
    fs.textFiles.set(path.resolve('/repo/platform/Pulumi.yaml'), 'name: platform\nruntime: yaml\n');
    fs.textFiles.set(
      path.resolve('/repo/platform/modules/net/Pulumi.yaml'),
      'name: net\nruntime: yaml\n'
    );
    fs.existingFiles.add(path.resolve('/repo/platform/Pulumi.yaml'));
    fs.existingFiles.add(path.resolve('/repo/platform/modules/net/Pulumi.yaml'));

    const roots = discoverPulumiRoots(scan, fs);
    expect(roots).toHaveLength(1);
    expect(roots[0].rootPath).toBe(outer);
  });

  it('returns empty when no Pulumi projects exist', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['src']);
    fs.directories.set(path.resolve('/repo/src'), []);

    expect(discoverPulumiRoots(scan, fs)).toEqual([]);
  });

  it('uses the directory slug when the Pulumi project is the scan root', () => {
    const fs = new MockFileSystem();
    const scan = path.resolve('/repo/infra/cloudflare');
    fs.existingFiles.add(scan);
    fs.directories.set(scan, ['Pulumi.yaml', 'index.ts']);
    fs.textFiles.set(
      path.resolve('/repo/infra/cloudflare/Pulumi.yaml'),
      `
name: archlens-cloudflare
runtime:
  name: nodejs
`
    );
    fs.existingFiles.add(path.resolve('/repo/infra/cloudflare/Pulumi.yaml'));
    fs.existingFiles.add(path.resolve('/repo/infra/cloudflare/index.ts'));

    const roots = discoverPulumiRoots(scan, fs);
    expect(roots).toHaveLength(1);
    expect(roots[0]).toMatchObject({
      rootPath: scan,
      systemId: 'cloudflare',
      runtime: 'nodejs',
    });
  });
});
