/** Slugify a folder name for BlueprintSpec context entityRef. */
export function slugifyWorkspaceName(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'scanned';
}
