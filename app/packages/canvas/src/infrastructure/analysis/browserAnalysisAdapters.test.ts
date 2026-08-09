import { describe, it, expect } from 'vitest';
import { BrowserMemoryFileSystem } from './browserMemoryFileSystem';
import { BrowserSourceParser } from './browserSourceParser';
import { CodebaseAnalyzer } from '@archlens/analysis';
import { createAnalysisLogger } from './analysisLogger';

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
    const analyzer = new CodebaseAnalyzer({
      parser,
      fileSystem,
      logger: createAnalysisLogger({
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      }),
    });

    await analyzer.runAnalysis('demo-app', '/scan/blueprints', '**/*.{ts,tsx}');
    const yamlFiles = fileSystem.collectWrittenYamlFiles('/scan/blueprints');
    expect(yamlFiles.length).toBeGreaterThan(0);
    expect(yamlFiles.some(f => f.name.includes('context.yaml'))).toBe(true);
    expect(yamlFiles.some(f => f.content.includes('level: container'))).toBe(true);
  });
});
