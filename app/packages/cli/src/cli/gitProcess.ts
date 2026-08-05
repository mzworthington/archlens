import { spawn } from 'node:child_process';

export type GitProcessResult = {
  code: number;
  stdout: string;
  stderr: string;
};

/** Spawn `git` with captured stdout/stderr (no stdin). */
export function runGit(args: string[], cwd: string): Promise<GitProcessResult> {
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

/** Resolve the git repository root containing `startDir`. */
export async function findGitRoot(startDir: string): Promise<string> {
  const result = await runGit(['rev-parse', '--show-toplevel'], startDir);
  if (result.code === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }
  throw new Error(result.stderr.trim() || 'Not inside a git repository.');
}
