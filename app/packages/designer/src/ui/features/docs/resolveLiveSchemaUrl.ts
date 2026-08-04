const CHANNEL_PATTERN = /^(latest|v\d+)$/;
const SCHEMA_KINDS = ['blueprint', 'chaos'] as const;

export type LiveSchemaKind = (typeof SCHEMA_KINDS)[number];

const SCHEMA_FILES: Record<LiveSchemaKind, string> = {
  blueprint: 'blueprint.schema.json',
  chaos: 'chaos.schema.json',
};

export type ResolvedLiveSchema = {
  kind: LiveSchemaKind;
  channel: string;
};

/**
 * Parse a live-schema fence body.
 * Accepts `latest`, `v4`, `chaos latest`, `blueprint v4` (kind optional; defaults to blueprint).
 */
export function parseLiveSchemaFence(raw: string): ResolvedLiveSchema | null {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { kind: 'blueprint', channel: 'latest' };
  }
  if (parts.length === 1) {
    if (!CHANNEL_PATTERN.test(parts[0]!)) return null;
    return { kind: 'blueprint', channel: parts[0]! };
  }
  if (parts.length === 2) {
    const [kind, channel] = parts as [string, string];
    if (!(SCHEMA_KINDS as readonly string[]).includes(kind)) return null;
    if (!CHANNEL_PATTERN.test(channel)) return null;
    return { kind: kind as LiveSchemaKind, channel };
  }
  return null;
}

/**
 * Build the public JSON Schema URL for a docs live-schema fence.
 * Channel must be `latest` or `v{n}` - rejects path traversal.
 */
export function resolveLiveSchemaUrl(
  fenceBody: string,
  baseUrl = '/',
  kind?: LiveSchemaKind
): string | null {
  const parsed = parseLiveSchemaFence(fenceBody);
  if (!parsed) return null;
  const resolvedKind = kind ?? parsed.kind;
  const channel = parsed.channel;
  if (!CHANNEL_PATTERN.test(channel)) return null;
  if (!(SCHEMA_KINDS as readonly string[]).includes(resolvedKind)) return null;

  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}schemas/${channel}/${SCHEMA_FILES[resolvedKind]}`;
}
