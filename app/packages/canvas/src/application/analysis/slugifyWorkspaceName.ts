/** Slugify a folder name for BlueprintSpec context entityRef. */
export function slugifyWorkspaceName(raw: string): string {
  return slugAlphanumeric(raw) || 'scanned';
}

function slugAlphanumeric(raw: string): string {
  const parts: string[] = [];
  let token = '';
  for (const ch of raw.toLowerCase()) {
    const ok = (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');
    if (ok) {
      token += ch;
    } else if (token) {
      parts.push(token);
      token = '';
    }
  }
  if (token) parts.push(token);
  return parts.join('-');
}
