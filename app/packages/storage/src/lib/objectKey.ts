export function normalizeObjectKeyPrefix(prefix: string | undefined): string {
  if (!prefix) return '';
  return prefix.replace(/^\/+|\/+$/g, '');
}

export function joinObjectKey(prefix: string, key: string): string {
  const normalizedPrefix = normalizeObjectKeyPrefix(prefix);
  const normalizedKey = key.replace(/^\/+/, '');
  if (!normalizedPrefix) return normalizedKey;
  return `${normalizedPrefix}/${normalizedKey}`;
}

export function normalizePublicBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    throw new Error('Object storage base URL is required');
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

export function joinPublicBaseUrl(baseUrl: string, relativePath: string): string {
  const normalizedBase = normalizePublicBaseUrl(baseUrl);
  const normalizedPath = relativePath.replace(/^\/+/, '');
  return new URL(normalizedPath, normalizedBase).toString();
}
