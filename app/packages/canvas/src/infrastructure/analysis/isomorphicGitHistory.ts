import git, { type FsClient } from 'isomorphic-git';
import { throwIfAborted } from '@archlens/analysis/cancellation';
import type { GitCommit } from '@archlens/core/forensics';
import { DEFAULT_FORENSICS_OPTIONS } from '@archlens/analysis/forensics';
import { createDirectoryHandleFs } from './directoryHandleFs';

/** Mirrors application `BrowserGitHistoryStatus` without importing inward. */
type GitHistoryStatus = 'included' | 'missing' | 'failed';

export type BrowserGitHistoryResult = {
  status: GitHistoryStatus;
  commits: GitCommit[];
};

const MAX_COMMITS = 2000;

function toGitCommit(entry: {
  oid: string;
  commit: {
    parent: string[];
    author: { email: string; timestamp: number };
    changes?: (string | null)[][];
  };
}): GitCommit | null {
  if (entry.commit.parent.length > 1) return null;
  const paths = (entry.commit.changes ?? [])
    .map(change => change[2])
    .filter((path): path is string => typeof path === 'string' && path.length > 0)
    .map(path => path.replace(/\\/g, '/'));
  if (paths.length === 0) return null;
  return {
    hash: entry.oid,
    authorEmail: entry.commit.author.email || 'unknown',
    authorDate: new Date(entry.commit.author.timestamp * 1000),
    paths,
  };
}

export async function loadGitHistoryFromFs(args: {
  fs: FsClient;
  dir?: string;
  sinceDays?: number;
  signal?: AbortSignal;
}): Promise<GitCommit[]> {
  throwIfAborted(args.signal);
  const sinceDays = args.sinceDays ?? DEFAULT_FORENSICS_OPTIONS.sinceDays;
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const log = await git.log({
    fs: args.fs,
    dir: args.dir ?? '/',
    since,
    depth: MAX_COMMITS,
    includeChanges: true,
  });
  throwIfAborted(args.signal);

  const commits: GitCommit[] = [];
  for (const entry of log) {
    throwIfAborted(args.signal);
    const commit = toGitCommit(entry);
    if (commit) commits.push(commit);
  }
  return commits;
}

async function hasGitDirectory(root: FileSystemDirectoryHandle): Promise<boolean> {
  if (typeof root.getDirectoryHandle !== 'function') return false;
  try {
    await root.getDirectoryHandle('.git');
    return true;
  } catch {
    return false;
  }
}

export async function loadBrowserGitHistory(
  root: FileSystemDirectoryHandle,
  options: { sinceDays?: number; signal?: AbortSignal } = {}
): Promise<BrowserGitHistoryResult> {
  try {
    if (!(await hasGitDirectory(root))) {
      return { status: 'missing', commits: [] };
    }
    const fs = createDirectoryHandleFs(root);
    const commits = await loadGitHistoryFromFs({
      fs,
      dir: '/',
      sinceDays: options.sinceDays,
      signal: options.signal,
    });
    return { status: commits.length > 0 ? 'included' : 'missing', commits };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return { status: 'failed', commits: [] };
  }
}
