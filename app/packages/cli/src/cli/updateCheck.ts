import fs from 'fs';
import os from 'os';
import path from 'path';
import { DEFAULT_GITHUB_REPO } from './releaseAssets.ts';
import { isNewerVersion } from './semver.ts';

export const UPDATE_CHECK_TTL_MS = 24 * 60 * 60 * 1000;

export interface UpdateCheckCache {
  checkedAt: string;
  latestTag: string;
}

export interface UpdateAvailability {
  current: string;
  latest: string;
}

export interface UpdateCheckDeps {
  now?: () => number;
  readCache?: () => UpdateCheckCache | null;
  writeCache?: (cache: UpdateCheckCache) => void;
  fetchLatestTag?: (repo: string) => Promise<string>;
}

function defaultCachePath(): string {
  return path.join(os.homedir(), '.cache', 'archlens', 'update-check.json');
}

function readCacheFile(): UpdateCheckCache | null {
  try {
    const raw = fs.readFileSync(defaultCachePath(), 'utf8');
    const parsed = JSON.parse(raw) as UpdateCheckCache;
    if (!parsed.checkedAt || !parsed.latestTag) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCacheFile(cache: UpdateCheckCache): void {
  const filePath = defaultCachePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(cache, null, 2), 'utf8');
}

async function defaultFetchLatestTag(
  repo: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const response = await fetchImpl(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'archlens-cli',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API responded with ${response.status}`);
  }
  const body = (await response.json()) as { tag_name?: string };
  if (!body.tag_name) {
    throw new Error('GitHub API response missing tag_name');
  }
  return body.tag_name;
}

export function shouldCheckForUpdates(options: {
  argv: string[];
  isCompiledRelease: boolean;
  isHeadless: boolean;
  isInteractiveTty: boolean;
  isCi: boolean;
  skipUpdateCheckFlag: boolean;
  isUpdateSubcommand: boolean;
}): boolean {
  if (options.isUpdateSubcommand) return false;
  if (options.skipUpdateCheckFlag) return false;
  if (!options.isCompiledRelease) return false;
  if (options.isHeadless) return false;
  if (!options.isInteractiveTty) return false;
  if (options.isCi) return false;
  return true;
}

export async function resolveLatestTag(
  deps: UpdateCheckDeps = {},
  repo = process.env.ARCHLENS_GITHUB_REPO ?? DEFAULT_GITHUB_REPO
): Promise<string> {
  const now = deps.now ?? Date.now;
  const readCache = deps.readCache ?? readCacheFile;
  const writeCache = deps.writeCache ?? writeCacheFile;
  const fetchLatestTag = deps.fetchLatestTag ?? (r => defaultFetchLatestTag(r));

  const cached = readCache();
  if (cached) {
    const age = now() - Date.parse(cached.checkedAt);
    if (Number.isFinite(age) && age >= 0 && age < UPDATE_CHECK_TTL_MS) {
      return cached.latestTag;
    }
  }

  const latestTag = await fetchLatestTag(repo);
  writeCache({ checkedAt: new Date(now()).toISOString(), latestTag });
  return latestTag;
}

export async function checkForUpdate(
  currentVersion: string,
  deps: UpdateCheckDeps = {},
  repo = process.env.ARCHLENS_GITHUB_REPO ?? DEFAULT_GITHUB_REPO
): Promise<UpdateAvailability | null> {
  const latest = await resolveLatestTag(deps, repo);
  if (!isNewerVersion(latest, currentVersion)) {
    return null;
  }
  return { current: currentVersion, latest };
}
