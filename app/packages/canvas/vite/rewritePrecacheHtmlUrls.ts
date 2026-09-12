export type PrecacheManifestEntry = {
  url: string;
  revision?: string | null;
};

/**
 * Cloudflare Pages pretty-URLs 308 every folder index.html to the directory URL
 * before `_redirects`. Workbox install (especially Firefox) fails if it caches
 * a redirected response.
 *
 * Root `index.html` is dropped (`null`): VitePWA `additionalManifestEntries`
 * already supplies `/`. Keeping both would emit two `/` revisions and Workbox
 * throws during install.
 */
export function prettyUrlForHtmlPrecache(url: string): string | null {
  const normalized = url.replace(/^\//, '');
  if (normalized === 'index.html') return null;
  if (normalized.endsWith('/index.html')) {
    return normalized.slice(0, -'index.html'.length);
  }
  return url;
}

export function rewritePrecacheHtmlUrls<T extends PrecacheManifestEntry>(entries: T[]): T[] {
  const chosen = new Map<string, { entry: T; alreadyPretty: boolean }>();

  for (const entry of entries) {
    const pretty = prettyUrlForHtmlPrecache(entry.url);
    if (pretty === null) continue;
    const alreadyPretty = pretty === entry.url;
    const next = alreadyPretty ? entry : { ...entry, url: pretty };
    const existing = chosen.get(pretty);
    if (!existing || (alreadyPretty && !existing.alreadyPretty)) {
      chosen.set(pretty, { entry: next, alreadyPretty });
    }
  }

  return [...chosen.values()].map(({ entry }) => entry);
}
