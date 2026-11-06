import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface ExtensionManifest {
  name: string;
  displayName: string;
  version: string;
  publisher: string;
  preview?: boolean;
  private?: boolean;
  scripts: Record<string, string>;
  contributes: {
    commands: Array<{ command: string; title: string }>;
    configuration: {
      properties: Record<string, { type: string; default?: boolean }>;
    };
  };
  capabilities?: {
    untrustedWorkspaces?: { supported?: string; description?: string };
  };
}

describe('Marketplace pre-release', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  ) as ExtensionManifest;

  it('is an ArchLens pre-release, not a stable listing', () => {
    expect(manifest.name).toBe('archlens');
    expect(manifest.displayName).toBe('ArchLens');
    expect(manifest.publisher).toBe('mzworthington');
    expect(manifest.preview).toBe(true);
    expect(manifest.version).toMatch(/-preview/);
    expect(manifest.private).toBe(true);
    expect(manifest.scripts['package:pre-release']).toContain('--pre-release');
    expect(manifest.scripts['package:pre-release']).not.toContain('publish');
  });

  it('offers Open architecture map and keeps generate-from-workspace off', () => {
    expect(manifest.contributes.commands.map(command => command.title)).toEqual([
      'Open architecture map',
      'Generate diagram from workspace',
    ]);
    expect(
      manifest.contributes.configuration.properties['archlens.generateFromWorkspace.enabled']
    ).toEqual(expect.objectContaining({ type: 'boolean', default: false }));
  });

  it('stays installed in Restricted Mode so the trust message can be shown', () => {
    expect(manifest.capabilities?.untrustedWorkspaces?.supported).toBe('limited');
    expect(manifest.capabilities?.untrustedWorkspaces?.description).toBe(
      'ArchLens does not read this folder until the workspace is trusted.'
    );
  });
});
