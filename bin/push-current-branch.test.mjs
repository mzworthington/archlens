import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'push-current-branch.sh');

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

function git(cwd, args) {
  return execFileSync('git', args, { cwd, env: gitEnv, encoding: 'utf8' });
}

test('rebases a derived commit onto newer origin/main and pushes it', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'push-derived-'));
  const seed = path.join(root, 'seed');
  const remote = path.join(root, 'remote.git');
  const local = path.join(root, 'local');
  const other = path.join(root, 'other');
  mkdirSync(seed);

  git(seed, ['init', '-b', 'main']);
  git(seed, ['config', 'user.email', 'test@example.com']);
  git(seed, ['config', 'user.name', 'Test']);
  writeFileSync(path.join(seed, 'readme.txt'), 'base\n');
  git(seed, ['add', 'readme.txt']);
  git(seed, ['commit', '-m', 'base']);
  git(root, ['clone', '--bare', seed, remote]);

  git(root, ['clone', remote, local]);
  git(local, ['config', 'user.email', 'test@example.com']);
  git(local, ['config', 'user.name', 'Test']);
  git(root, ['clone', remote, other]);
  git(other, ['config', 'user.email', 'test@example.com']);
  git(other, ['config', 'user.name', 'Test']);

  writeFileSync(path.join(other, 'remote.txt'), 'moved\n');
  git(other, ['add', 'remote.txt']);
  git(other, ['commit', '-m', 'remote-only']);
  git(other, ['push', 'origin', 'HEAD']);

  writeFileSync(path.join(local, 'derived.txt'), 'docs\n');
  git(local, ['add', 'derived.txt']);
  git(local, ['commit', '-m', 'derived']);

  execFileSync(script, [], { cwd: local, env: gitEnv, stdio: 'inherit' });

  const subjects = git(remote, ['log', '--format=%s', 'main']).trim().split('\n');
  assert.deepEqual(subjects, ['derived', 'remote-only', 'base']);
});
