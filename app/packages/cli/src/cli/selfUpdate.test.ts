import { describe, expect, it } from 'vitest';
import { detectReleaseAsset } from './releaseAssets.ts';
import {
  getInstallDir,
  isBundledTreeSitterWasm,
  relaunchArgsWithNoUpdateCheck,
} from './selfUpdate.ts';

describe('releaseAssets', () => {
  it('maps darwin arm64 to macOS asset', () => {
    expect(detectReleaseAsset('darwin', 'arm64')).toEqual({
      asset: 'archlens-macos-arm64.tar.gz',
      kind: 'tar.gz',
      binaryName: 'archlens',
    });
  });

  it('maps win32 x64 to windows zip', () => {
    expect(detectReleaseAsset('win32', 'x64')).toEqual({
      asset: 'archlens-windows-x64.zip',
      kind: 'zip',
      binaryName: 'archlens.exe',
    });
  });
});

describe('selfUpdate helpers', () => {
  it('resolves install dir from exec path', () => {
    expect(getInstallDir('/home/user/.local/bin/archlens')).toBe('/home/user/.local/bin');
  });

  it('adds --no-update-check and strips update subcommand', () => {
    expect(
      relaunchArgsWithNoUpdateCheck(['node', 'archlens', 'update', '--glob', '**/*.ts'])
    ).toEqual(['--glob', '**/*.ts', '--no-update-check']);
  });

  it('matches runtime and language tree-sitter WASM filenames', () => {
    expect(isBundledTreeSitterWasm('tree-sitter.wasm')).toBe(true);
    expect(isBundledTreeSitterWasm('tree-sitter-typescript.wasm')).toBe(true);
    expect(isBundledTreeSitterWasm('archlens')).toBe(false);
    expect(isBundledTreeSitterWasm('other.wasm')).toBe(false);
  });
});
