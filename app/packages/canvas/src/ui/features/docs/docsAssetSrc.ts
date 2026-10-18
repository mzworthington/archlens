function docsMediaBase(mediaBase?: string): string {
  return (mediaBase ?? import.meta.env.VITE_DOCS_MEDIA_BASE_URL)?.trim() ?? '';
}

/** Screenshot in the Pages dist, or on the docs-media host when that base URL is set. */
export function docsScreenshotSrc(fileName: string, mediaBase?: string): string {
  const base = docsMediaBase(mediaBase);
  if (base) return `${base.replace(/\/$/, '')}/${fileName}`;
  return `/docs-assets/screenshots/${fileName}`;
}

export function resolveDocsAssetSrc(src: string, fromDir: string, mediaBase?: string): string {
  if (!src || src.startsWith('http') || src.startsWith('data:') || src.startsWith('/')) {
    return src;
  }
  // ./screenshots/foo.png → /docs-assets/screenshots/foo.png (copied in vite)
  const cleaned = src.replace(/^\.\//, '');
  const base = docsMediaBase(mediaBase);
  if (base && cleaned.endsWith('.gif')) {
    const fileName = cleaned.slice(cleaned.lastIndexOf('/') + 1);
    return `${base.replace(/\/$/, '')}/${fileName}`;
  }
  const prefix = fromDir ? `${fromDir}/` : '';
  return `/docs-assets/${prefix}${cleaned}`.replace(/\/+/g, '/');
}
