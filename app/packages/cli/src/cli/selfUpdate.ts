import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { execFile as execFileCb } from 'node:child_process';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  detectReleaseAsset,
  releaseDownloadUrl,
  type ReleaseArchiveKind,
} from './releaseAssets.ts';

const execFile = promisify(execFileCb);

export interface SelfUpdateOptions {
  tag: string;
  installDir?: string;
  fetchImpl?: typeof fetch;
  execPath?: string;
  platform?: NodeJS.Platform;
  arch?: string;
}

export function getInstallDir(execPath = process.execPath): string {
  return path.dirname(execPath);
}

async function downloadToFile(
  url: string,
  destination: string,
  fetchImpl: typeof fetch
): Promise<void> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Failed to download release (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fsp.writeFile(destination, buffer);
}

async function verifyChecksumIfPresent(
  archivePath: string,
  assetName: string,
  tag: string,
  fetchImpl: typeof fetch
): Promise<void> {
  const repo = process.env.ARCHLENS_GITHUB_REPO ?? 'mzworthington/archlens';
  const checksumsUrl = `https://github.com/${repo}/releases/download/${tag}/checksums.txt`;
  let content: string;
  try {
    const response = await fetchImpl(checksumsUrl);
    if (!response.ok) return;
    content = await response.text();
  } catch {
    return;
  }

  const expected = content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [hash, name] = line.split(/\s+/, 2);
      return { hash, name };
    })
    .find(entry => entry.name === assetName)?.hash;

  if (!expected) return;

  const actual = createHash('sha256')
    .update(await fsp.readFile(archivePath))
    .digest('hex');
  if (actual !== expected) {
    throw new Error(`Checksum mismatch for ${assetName}`);
  }
}

async function extractArchive(
  archivePath: string,
  destDir: string,
  kind: ReleaseArchiveKind
): Promise<void> {
  if (kind === 'tar.gz') {
    await execFile('tar', ['-xzf', archivePath, '-C', destDir]);
    return;
  }

  const command = `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`;
  await execFile('powershell', ['-NoProfile', '-Command', command]);
}

/** Runtime `tree-sitter.wasm` and language `tree-sitter-*.wasm` parsers. */
export function isBundledTreeSitterWasm(entry: string): boolean {
  return entry.startsWith('tree-sitter') && entry.endsWith('.wasm');
}

async function copyInstalledFiles(
  sourceDir: string,
  installDir: string,
  binaryName: string
): Promise<void> {
  await fsp.mkdir(installDir, { recursive: true });
  const binarySource = path.join(sourceDir, binaryName);
  const binaryTarget = path.join(installDir, binaryName);
  await fsp.copyFile(binarySource, binaryTarget);
  if (process.platform !== 'win32') {
    await fsp.chmod(binaryTarget, 0o755);
  }

  const entries = await fsp.readdir(sourceDir);
  for (const entry of entries) {
    if (isBundledTreeSitterWasm(entry)) {
      await fsp.copyFile(path.join(sourceDir, entry), path.join(installDir, entry));
    }
  }
}

async function installUnix(
  archivePath: string,
  kind: ReleaseArchiveKind,
  installDir: string,
  binaryName: string
): Promise<string> {
  const extractDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'archlens-update-'));
  try {
    await extractArchive(archivePath, extractDir, kind);
    await copyInstalledFiles(extractDir, installDir, binaryName);
  } finally {
    await fsp.rm(extractDir, { recursive: true, force: true });
  }
  return path.join(installDir, binaryName);
}

function quoteCmdArg(arg: string): string {
  if (!/\s|"/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

async function installWindows(
  archivePath: string,
  installDir: string,
  binaryName: string,
  relaunchArgs: string[]
): Promise<string> {
  const extractDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'archlens-update-'));
  const stagedBinary = path.join(installDir, `${binaryName}.update`);
  const targetBinary = path.join(installDir, binaryName);

  try {
    await extractArchive(archivePath, extractDir, 'zip');
    await fsp.copyFile(path.join(extractDir, binaryName), stagedBinary);

    const wasmEntries = (await fsp.readdir(extractDir)).filter(isBundledTreeSitterWasm);
    for (const wasm of wasmEntries) {
      await fsp.copyFile(path.join(extractDir, wasm), path.join(installDir, wasm));
    }
  } finally {
    await fsp.rm(extractDir, { recursive: true, force: true });
  }

  const scriptPath = path.join(installDir, 'archlens-update.cmd');
  const quotedArgs = relaunchArgs.map(quoteCmdArg).join(' ');
  const script = `@echo off\r\ntimeout /t 1 /nobreak >nul\r\nmove /y "${stagedBinary}" "${targetBinary}" >nul\r\n"${targetBinary}" ${quotedArgs}\r\ndel "%~f0"\r\n`;
  await fsp.writeFile(scriptPath, script, 'utf8');
  return scriptPath;
}

export async function installRelease(options: SelfUpdateOptions): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const platform = options.platform ?? process.platform;
  const release = detectReleaseAsset(platform, options.arch ?? process.arch);
  const installDir = options.installDir ?? getInstallDir(options.execPath);
  const url = releaseDownloadUrl(options.tag, release.asset);

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'archlens-download-'));
  const archivePath = path.join(tempDir, release.asset);

  try {
    await downloadToFile(url, archivePath, fetchImpl);
    await verifyChecksumIfPresent(archivePath, release.asset, options.tag, fetchImpl);

    if (platform === 'win32') {
      return installWindows(
        archivePath,
        installDir,
        release.binaryName,
        relaunchArgsWithNoUpdateCheck()
      );
    }
    return installUnix(archivePath, release.kind, installDir, release.binaryName);
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
}

export function relaunchArgsWithNoUpdateCheck(argv: string[] = process.argv): string[] {
  const args = argv.slice(2).filter(arg => arg !== 'update');
  if (!args.includes('--no-update-check')) {
    args.push('--no-update-check');
  }
  return args;
}

export function reExecCli(launchPath: string, args: string[]): void {
  const child = spawn(launchPath, args, {
    stdio: 'inherit',
    env: process.env,
    detached: process.platform === 'win32',
  });

  child.on('error', error => {
    console.error(error.message);
    process.exit(1);
  });

  child.on('exit', code => {
    process.exit(code ?? 0);
  });

  if (process.platform === 'win32') {
    child.unref();
  }
}

export async function performSelfUpdate(
  tag: string,
  options: SelfUpdateOptions = {}
): Promise<void> {
  const relaunchArgs = relaunchArgsWithNoUpdateCheck();
  const launchPath = await installRelease({ ...options, tag });

  if (process.platform === 'win32' && launchPath.endsWith('.cmd')) {
    const child = spawn('cmd.exe', ['/c', launchPath], {
      stdio: 'ignore',
      detached: true,
    });
    child.unref();
    process.exit(0);
  }

  reExecCli(launchPath, relaunchArgs);
}
