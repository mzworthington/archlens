export const DEFAULT_GITHUB_REPO = 'mzworthington/archlens';

export type ReleaseArchiveKind = 'tar.gz' | 'zip';

export interface ReleaseAsset {
  asset: string;
  kind: ReleaseArchiveKind;
  binaryName: string;
}

export function detectReleaseAsset(platform = process.platform, arch = process.arch): ReleaseAsset {
  if (platform === 'darwin') {
    if (arch === 'arm64') {
      return {
        asset: 'archlens-macos-arm64.tar.gz',
        kind: 'tar.gz',
        binaryName: 'archlens',
      };
    }
    if (arch === 'x64') {
      return {
        asset: 'archlens-macos-x64.tar.gz',
        kind: 'tar.gz',
        binaryName: 'archlens',
      };
    }
    throw new Error(`Unsupported macOS architecture: ${arch}`);
  }

  if (platform === 'linux') {
    if (arch === 'x64') {
      return {
        asset: 'archlens-linux-x64.tar.gz',
        kind: 'tar.gz',
        binaryName: 'archlens',
      };
    }
    throw new Error(`Unsupported Linux architecture: ${arch}`);
  }

  if (platform === 'win32') {
    if (arch === 'x64') {
      return {
        asset: 'archlens-windows-x64.zip',
        kind: 'zip',
        binaryName: 'archlens.exe',
      };
    }
    throw new Error(`Unsupported Windows architecture: ${arch}`);
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

export function releaseDownloadUrl(
  tag: string,
  asset: string,
  repo = process.env.ARCHLENS_GITHUB_REPO ?? DEFAULT_GITHUB_REPO
): string {
  return `https://github.com/${repo}/releases/download/${tag}/${asset}`;
}
