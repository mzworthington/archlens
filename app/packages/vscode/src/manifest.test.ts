import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sourceFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  return entries.flatMap(entry => {
    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) return sourceFiles(fullPath);
    return fullPath.endsWith('.ts') && !fullPath.endsWith('.test.ts') ? [fullPath] : [];
  });
}

describe('marketplace pre-release', () => {
  const manifest = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
    name: string;
    displayName: string;
    publisher: string;
    preview: boolean;
    private: boolean;
    description: string;
    scripts: Record<string, string>;
    activationEvents: string[];
    contributes: {
      commands: { command: string; title: string }[];
      configuration: {
        properties: Record<string, { type: string; default: boolean | string }>;
      };
    };
    capabilities: {
      untrustedWorkspaces: { supported: string; description: string };
    };
  };

  it('lists ArchLens as a Marketplace pre-release with the preview commands', () => {
    expect(manifest.name).toBe('archlens');
    expect(manifest.displayName).toBe('ArchLens');
    expect(manifest.publisher).toBe('mzworthington');
    expect(manifest.preview).toBe(true);
    expect(manifest.private).toBe(true);
    expect(manifest.description).toContain('Preview a BlueprintSpec file');
    expect(manifest.description).toContain('turned off in this preview');
    expect(manifest.scripts['package:pre-release']).toContain('--pre-release');
    expect(manifest.scripts['package:pre-release']).not.toContain('publish');
    expect(manifest.contributes.commands.map(command => command.title)).toEqual([
      'Open architecture map',
      'Generate diagram from workspace',
    ]);
    expect(manifest.activationEvents).toEqual([
      'onCommand:archlens.openArchitectureMap',
      'onCommand:archlens.generateFromWorkspace',
    ]);
  });

  it('ships generate-from-workspace off and refuses to read an untrusted folder', () => {
    expect(
      manifest.contributes.configuration.properties['archlens.generateFromWorkspace.enabled']
    ).toEqual(expect.objectContaining({ type: 'boolean', default: false }));
    expect(manifest.capabilities.untrustedWorkspaces.supported).toBe('limited');
    expect(manifest.capabilities.untrustedWorkspaces.description).toBe(
      'ArchLens does not read this folder until the workspace is trusted.'
    );
  });

  it('has no file writer in the extension source', () => {
    const source = sourceFiles(path.join(packageRoot, 'src'))
      .map(file => readFileSync(file, 'utf8'))
      .join('\n');

    expect(source).not.toContain('writeFile');
    expect(source).not.toContain('writeFileSync');
  });
});
