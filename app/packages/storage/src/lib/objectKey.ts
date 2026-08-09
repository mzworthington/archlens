/** Strip leading `/` without regex (avoids CodeQL js/polynomial-redos). */
export function stripLeadingSlashes(value: string): string {
  let start = 0;
  while (start < value.length && value.charCodeAt(start) === 47 /* / */) start++;
  return value.slice(start);
}

/** Strip leading and trailing `/` without regex (avoids CodeQL js/polynomial-redos). */
export function stripSurroundingSlashes(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value.charCodeAt(start) === 47 /* / */) start++;
  while (end > start && value.charCodeAt(end - 1) === 47 /* / */) end--;
  return value.slice(start, end);
}

export function normalizeObjectKeyPrefix(prefix: string | undefined): string {
  if (!prefix) return '';
  return stripSurroundingSlashes(prefix);
}

export function joinObjectKey(prefix: string, key: string): string {
  const normalizedPrefix = normalizeObjectKeyPrefix(prefix);
  const normalizedKey = stripLeadingSlashes(key);
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
  const normalizedPath = stripLeadingSlashes(relativePath);
  return new URL(normalizedPath, normalizedBase).toString();
}
