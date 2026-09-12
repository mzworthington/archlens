export type PrecacheManifestEntry = {
  url: string;
  revision?: string | null;
};

/**
 * Cloudflare Pages pretty-URLs 308 every folder index.html to the directory URL
 * before `_redirects`. Workbox install (especially Firefox) fails if it caches
 * a redirected response.
 */
export function prettyUrlForHtmlPrecache(url: string): string {
  const normalized = url.replace(/^\//, '');
  if (normalized === 'index.html') return '/';
  if (normalized.endsWith('/index.html')) {
    return normalized.slice(0, -'index.html'.length);
  }
  return url;
}

export function rewritePrecacheHtmlUrls<T extends PrecacheManifestEntry>(entries: T[]): T[] {
  const chosen = new Map<string, { entry: T; alreadyPretty: boolean }>();

  for (const entry of entries) {
    const pretty = prettyUrlForHtmlPrecache(entry.url);
    const alreadyPretty = pretty === entry.url;
    const next = alreadyPretty ? entry : { ...entry, url: pretty };
    const existing = chosen.get(pretty);
    if (!existing || (alreadyPretty && !existing.alreadyPretty)) {
      chosen.set(pretty, { entry: next, alreadyPretty });
    }
  }

  return [...chosen.values()].map(({ entry }) => entry);
}
