import type { SourceProvenance } from '@archlens/core';
import {
  buildSourceFileRawUrl,
  buildSourceFileUrl,
  resolveRepoRelativeFilePath,
} from '@archlens/core';

export type SourceFileOrigin = 'local' | 'remote';

export type SourceFileLoadSuccess = {
  ok: true;
  content: string;
  origin: SourceFileOrigin;
  filepath: string;
  viewerUrl?: string;
  rawUrl?: string;
};

export type SourceFileLoadFailure = {
  ok: false;
  error: string;
  viewerUrl?: string;
  rawUrl?: string;
};

export type SourceFileLoadResult = SourceFileLoadSuccess | SourceFileLoadFailure;

export type FetchSourceFileContentDeps = {
  readLocalFile?: (repoRelativePath: string) => Promise<string>;
  fetchText?: (url: string, init?: RequestInit) => Promise<string>;
  githubPat?: string;
  customRemoteUrl?: string;
};

const defaultFetchText = async (url: string, init?: RequestInit): Promise<string> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
};

function buildGitHubApiContentsUrl(
  source: SourceProvenance,
  repoRelativePath: string
): string | undefined {
  if (!source.remoteUrl) return undefined;
  const match = source.remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) return undefined;
  const owner = match[1];
  const repo = match[2].replace(/\.git$/, '');
  const commit = source.scannedAtCommit || source.defaultBranch || 'main';
  return `https://api.github.com/repos/${owner}/${repo}/contents/${repoRelativePath}?ref=${commit}`;
}

/** Vite (and similar dev servers) return index.html with 200 for unknown asset paths. */
export function looksLikeSpaHtmlFallback(content: string, requestedPath: string): boolean {
  const head = content.trimStart().slice(0, 256).toLowerCase();
  if (!head.startsWith('<!doctype html') && !head.startsWith('<html')) return false;
  const ext = requestedPath.split('.').pop()?.toLowerCase();
  return ext !== 'html' && ext !== 'htm';
}

/**
 * Load source text for a node filepath: prefer local workspace file, then git raw URL.
 */
export async function fetchSourceFileContent(
  source: SourceProvenance | undefined,
  filepath: string,
  deps: FetchSourceFileContentDeps = {}
): Promise<SourceFileLoadResult> {
  const normalizedPath = filepath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalizedPath) {
    return { ok: false, error: 'No filepath provided.' };
  }

  const effectiveSource: SourceProvenance | undefined = source?.remoteUrl
    ? { scannedAtCommit: source.scannedAtCommit || source.defaultBranch || 'main', ...source }
    : deps.customRemoteUrl
      ? { remoteUrl: deps.customRemoteUrl, scannedAtCommit: 'main' }
      : undefined;

  const viewerUrl = effectiveSource
    ? buildSourceFileUrl(effectiveSource, normalizedPath)
    : undefined;
  const rawUrl = effectiveSource
    ? buildSourceFileRawUrl(effectiveSource, normalizedPath)
    : undefined;
  const repoRelativePath = effectiveSource
    ? resolveRepoRelativeFilePath(effectiveSource, normalizedPath)
    : normalizedPath;

  if (deps.readLocalFile) {
    try {
      const content = await deps.readLocalFile(repoRelativePath);
      if (looksLikeSpaHtmlFallback(content, repoRelativePath)) {
        throw new Error('Received HTML instead of source file.');
      }
      return {
        ok: true,
        content,
        origin: 'local',
        filepath: repoRelativePath,
        viewerUrl,
        rawUrl,
      };
    } catch {
      // Fall through to remote fetch when workspace file is missing.
    }
  }

  if (!rawUrl) {
    return {
      ok: false,
      error: source?.remoteUrl
        ? 'Could not build a raw URL for this host.'
        : 'No git source metadata on this diagram. Re-run the CLI scan or open a workspace folder.',
      viewerUrl,
      rawUrl,
    };
  }

  const fetchText = deps.fetchText ?? defaultFetchText;
  const headers: Record<string, string> = deps.githubPat
    ? { Authorization: `Bearer ${deps.githubPat}` }
    : {};

  try {
    const content = await fetchText(rawUrl, { headers });
    return {
      ok: true,
      content,
      origin: 'remote',
      filepath: repoRelativePath,
      viewerUrl,
      rawUrl,
    };
  } catch (rawError) {
    if (source && deps.githubPat) {
      const apiUrl = buildGitHubApiContentsUrl(source, repoRelativePath);
      if (apiUrl) {
        try {
          const apiHeaders = {
            ...headers,
            Accept: 'application/vnd.github.raw+json',
          };
          const content = await fetchText(apiUrl, { headers: apiHeaders });
          return {
            ok: true,
            content,
            origin: 'remote',
            filepath: repoRelativePath,
            viewerUrl,
            rawUrl,
          };
        } catch {
          // Fall through to original error message
        }
      }
    }

    const message = rawError instanceof Error ? rawError.message : String(rawError);
    return {
      ok: false,
      error: `Remote source rendering is supported for public repositories (${message}). For private repositories, enter a Personal Access Token (PAT), open the workspace folder locally, or view directly in your repository browser.`,
      viewerUrl,
      rawUrl,
    };
  }
}
