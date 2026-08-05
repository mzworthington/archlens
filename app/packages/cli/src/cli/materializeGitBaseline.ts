import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

export type GitBaselineMaterialization =
  { ok: true; directory: string; cleanup: () => Promise<void> } | { ok: false; reason: string };

function runGit(
  args: string[],
  cwd: string
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise(resolve => {
    const child = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += String(chunk);
    });
    child.stderr.on('data', chunk => {
      stderr += String(chunk);
    });
    child.on('close', code => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

/**
 * Extract `blueprintsPath` (relative to repo root) from `commitRef` into a temp directory.
 * Uses `git archive` so existing codebases can compare without a full worktree checkout.
 */
export async function materializeGitBaselineBlueprints(
  repoRoot: string,
  commitRef: string,
  blueprintsPath: string
): Promise<GitBaselineMaterialization> {
  const normalized = blueprintsPath.replace(/^\.\//, '').replace(/\/$/, '');
  const list = await runGit(
    ['ls-tree', '-r', '--name-only', commitRef, '--', normalized],
    repoRoot
  );
  if (list.code !== 0) {
    return {
      ok: false,
      reason: `Could not read commit "${commitRef}" (${list.stderr.trim() || 'git ls-tree failed'}).`,
    };
  }
  if (!list.stdout.trim()) {
    return {
      ok: false,
      reason:
        `No blueprints at "${normalized}" in commit ${commitRef}. ` +
        `Scan that revision into a folder and pass --baseline=<dir>.`,
    };
  }

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'archlens-baseline-'));
  const strip = normalized.split('/').filter(Boolean).length;
  const archive = spawn('git', ['archive', commitRef, '--', normalized], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const tar = spawn('tar', ['-x', `-C`, tempRoot, `--strip-components=${strip}`], {
    stdio: [archive.stdout, 'pipe', 'pipe'],
  });

  let archiveErr = '';
  let tarErr = '';
  archive.stderr.on('data', chunk => {
    archiveErr += String(chunk);
  });
  tar.stderr.on('data', chunk => {
    tarErr += String(chunk);
  });

  const [archiveCode, tarCode] = await Promise.all([
    new Promise<number>(resolve => archive.on('close', code => resolve(code ?? 1))),
    new Promise<number>(resolve => tar.on('close', code => resolve(code ?? 1))),
  ]);

  if (archiveCode !== 0 || tarCode !== 0) {
    await rm(tempRoot, { recursive: true, force: true });
    return {
      ok: false,
      reason: `Failed to extract blueprints from ${commitRef}: ${(archiveErr || tarErr).trim()}`,
    };
  }

  return {
    ok: true,
    directory: tempRoot,
    cleanup: async () => {
      await rm(tempRoot, { recursive: true, force: true });
    },
  };
}
