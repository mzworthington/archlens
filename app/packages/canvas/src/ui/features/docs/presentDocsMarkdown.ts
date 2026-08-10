export type DocsFrontmatter = Record<string, string>;

export type SplitDocsMarkdown = {
  frontmatter: DocsFrontmatter | null;
  body: string;
};

/** Parse simple ADR YAML frontmatter (flat key: value lines). */
function parseSimpleFrontmatter(raw: string): DocsFrontmatter {
  const fields: DocsFrontmatter = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sep = trimmed.indexOf(':');
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep).trim();
    let value = trimmed.slice(sep + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map(part => part.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
        .join(', ');
    }
    if (key) fields[key] = value;
  }
  return fields;
}

/**
 * Split leading YAML frontmatter from markdown body.
 * Keeps fields available for a meta strip (not a dark code fence).
 */
export function splitDocsMarkdown(markdown: string): SplitDocsMarkdown {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: null, body: markdown };
  }
  const fields = parseSimpleFrontmatter(match[1]!);
  return {
    frontmatter: Object.keys(fields).length > 0 ? fields : null,
    body: match[2] ?? '',
  };
}

/** Body only — strips frontmatter so GFM does not turn --- into thematic breaks. */
export function presentDocsMarkdown(markdown: string): string {
  return splitDocsMarkdown(markdown).body;
}

/** Title from first ATX heading, else a humanized fallback. */
export function titleFromMarkdown(markdown: string, fallback: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading?.[1]?.trim() || fallback;
}
