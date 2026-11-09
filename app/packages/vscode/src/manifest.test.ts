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
    expect(manifest.description).not.toContain('turned off');
    expect(manifest.scripts['package:pre-release']).toContain('--pre-release');
    expect(manifest.scripts['package:pre-release']).not.toContain('publish');
    expect(manifest.contributes.commands.map(command => command.title)).toEqual([
      'Open architecture map',
      'Generate diagram from workspace',
      'Compare with a fresh scan',
      'Copy diagram as Mermaid',
      'Show hotspots',
    ]);
    expect(manifest.activationEvents).toEqual([
      'onCommand:archlens.openArchitectureMap',
      'onCommand:archlens.generateFromWorkspace',
      'onCommand:archlens.compareWithScan',
      'onCommand:archlens.copyDiagram',
      'onCommand:archlens.showHotspots',
      'onLanguage:yaml',
    ]);
  });

  it('ships no generate-from-workspace setting and refuses to read an untrusted folder', () => {
    expect(
      manifest.contributes.configuration.properties['archlens.generateFromWorkspace.enabled']
    ).toBeUndefined();
    expect(JSON.stringify(manifest.capabilities)).not.toContain('generateFromWorkspace.enabled');
    expect(manifest.capabilities.untrustedWorkspaces.supported).toBe('limited');
    expect(manifest.capabilities.untrustedWorkspaces.description).toBe(
      'ArchLens does not read this folder until the workspace is trusted.'
    );
  });

  it('writes blueprint files only from the review host', () => {
    const files = sourceFiles(path.join(packageRoot, 'src'));
    const writers = files.filter(file => readFileSync(file, 'utf8').includes('writeFile'));

    expect(writers.map(file => path.basename(file))).toEqual(['vscodeHost.ts']);
    expect(files.some(file => readFileSync(file, 'utf8').includes('writeFileSync'))).toBe(false);
  });
});
