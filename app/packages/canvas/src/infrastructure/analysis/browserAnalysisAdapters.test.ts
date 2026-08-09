import { describe, it, expect } from 'vitest';
import { parseSchemaFromYaml, type SystemSchema } from '@archlens/core';
import { BrowserMemoryFileSystem } from './browserMemoryFileSystem';
import { BrowserSourceParser } from './browserSourceParser';
import { createBrowserAnalysisDeps } from './createBrowserAnalysisDeps';
import { CodebaseAnalyzer } from '@archlens/analysis/analyzer';
import { createAnalysisLogger } from './analysisLogger';
import { runBrowserAnalysis } from '../../application/analysis/runBrowserAnalysis';

const silentLogger = createAnalysisLogger({
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
});

function dependencyKeys(schema: SystemSchema): string[] {
  return schema.dependencies.map(dep => `${dep.from}->${dep.to}:${dep.type}`).sort();
}

describe('browser analysis adapters', () => {
  it('parses walked sources into ParsedSourceFile records', async () => {
    const parser = new BrowserSourceParser([
      {
        relativePath: 'src/a.ts',
        content: `import { b } from './b';\n`,
      },
      {
        relativePath: 'src/b.ts',
        content: `export const b = 1;\n`,
      },
    ]);

    const files = await parser.parseSourceFiles('**/*.{ts,tsx}');
    expect(files).toHaveLength(2);
    expect(files[0]?.imports).toEqual([{ moduleSpecifier: './b' }]);
  });

  it('keeps non-JS/TS files without applying the JS/TS import regex', async () => {
    const parser = new BrowserSourceParser([
      {
        relativePath: 'src/service.py',
        content: 'import os\nfrom orders import service\n',
      },
    ]);

    const files = await parser.parseSourceFiles('**/*.{py}');
    expect(files).toHaveLength(1);
    expect(files[0]?.relativePath).toBe('src/service.py');
    expect(files[0]?.imports).toEqual([]);
    expect(files[0]?.reExports).toEqual([]);
  });

  it('skips metadata manifests when parsing sources', async () => {
    const parser = new BrowserSourceParser([
      { relativePath: 'package.json', content: '{"name":"demo"}' },
      { relativePath: 'pnpm-workspace.yaml', content: 'packages:\n  - packages/*\n' },
      { relativePath: 'src/a.ts', content: `export const a = 1;\n` },
    ]);

    const files = await parser.parseSourceFiles('**/*.{ts,tsx}');
    expect(files.map(f => f.relativePath)).toEqual(['src/a.ts']);
  });

  it('runs CodebaseAnalyzer against memory FS and emits YAML', async () => {
    const sources = [
      {
        relativePath: 'src/domain/graph.ts',
        content: `export const x = 1;\n`,
      },
      {
        relativePath: 'src/adapters/ui.ts',
        content: `import { x } from '../domain/graph';\n`,
      },
      {
        relativePath: 'package.json',
        content: JSON.stringify({ name: 'demo-app' }),
      },
    ];
    const fileSystem = new BrowserMemoryFileSystem(sources, { cwd: '/scan' });
    // package.json is not a source file for the parser, but must exist for naming
    const parser = new BrowserSourceParser(
      sources.filter(s => s.relativePath.endsWith('.ts')),
      '/scan'
    );
    const analyzer = new CodebaseAnalyzer({ parser, fileSystem, logger: silentLogger });

    await analyzer.runAnalysis('demo-app', '/scan/blueprints', '**/*.{ts,tsx}');
    const yamlFiles = fileSystem.collectWrittenYamlFiles('/scan/blueprints');
    expect(yamlFiles.length).toBeGreaterThan(0);
    expect(yamlFiles.some(f => f.name.includes('context.yaml'))).toBe(true);
    expect(yamlFiles.some(f => f.content.includes('level: container'))).toBe(true);
  });

  it('preserves semantic parity between direct browser adapters and browser scan runner', async () => {
    const sources = [
      {
        relativePath: 'package.json',
        content: JSON.stringify({ name: '@acme/browser-parity' }),
      },
      {
        relativePath: 'src/domain/order.ts',
        content: `export const order = 1;\n`,
      },
      {
        relativePath: 'src/ui/page.tsx',
        content: `import { order } from '../domain/order';\nexport const Page = () => order;\n`,
      },
    ];
    const fileSystem = new BrowserMemoryFileSystem(sources, { cwd: '/scan' });
    const parser = new BrowserSourceParser(sources, '/scan');
    const analyzer = new CodebaseAnalyzer({ parser, fileSystem, logger: silentLogger });
    await analyzer.runAnalysis('acme-browser-parity', '/scan/blueprints', '**/*.{ts,tsx,js,jsx}');

    const directFiles = fileSystem.collectWrittenYamlFiles('/scan/blueprints');
    const runnerFiles = (
      await runBrowserAnalysis({
        directoryName: '@acme/browser-parity',
        deps: createBrowserAnalysisDeps({ sources }),
      })
    ).yamlFiles;

    expect(runnerFiles.some(f => f.name.startsWith('acme-browser-parity/'))).toBe(true);
    expect(runnerFiles.map(f => f.name.split('/').pop()).sort()).toEqual(
      directFiles.map(f => f.name.split('/').pop()).sort()
    );

    for (const directFile of directFiles) {
      const leaf = directFile.name.split('/').pop();
      const runnerFile = runnerFiles.find(f => f.name.split('/').pop() === leaf);
      expect(runnerFile, `missing ${leaf} in runner output`).toBeDefined();

      const direct = parseSchemaFromYaml(directFile.content);
      const runner = parseSchemaFromYaml(runnerFile!.content);
      expect(runner.level, leaf).toEqual(direct.level);
      expect(runner.nodes.map(n => n.entityRef).sort(), leaf).toEqual(
        direct.nodes.map(n => n.entityRef).sort()
      );
      expect(dependencyKeys(runner), leaf).toEqual(dependencyKeys(direct));
    }
  });

  it('runs IacAnalyzer for Terraform roots during browser scan', async () => {
    const sources = [
      {
        relativePath: 'infra/main.tf',
        content: `
resource "aws_lambda_function" "api" {
  function_name = "api"
  role          = aws_iam_role.lambda.arn
}
resource "aws_iam_role" "lambda" {
  name = "lambda"
}
`,
      },
    ];

    const result = await runBrowserAnalysis({
      directoryName: 'tf-demo',
      deps: createBrowserAnalysisDeps({ sources }),
    });

    expect(result.yamlFiles.map(f => f.name).sort()).toEqual(
      expect.arrayContaining([expect.stringMatching(/containers\.yaml$/)])
    );
    const containers = result.yamlFiles.find(
      f => f.name.endsWith('containers.yaml') && f.content.includes('iac.view')
    );
    expect(containers).toBeDefined();
    const schema = parseSchemaFromYaml(containers!.content);
    expect(
      schema.nodes.some(
        n => n.properties?.['iac.view'] === 'resource' && n.properties?.['iac.product'] === 'lambda'
      )
    ).toBe(true);
  });
});
