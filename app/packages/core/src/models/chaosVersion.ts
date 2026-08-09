/**
 * Public JSON Schema hosting for ChaosSpec YAML (Cloudflare Pages / archlens.dev).
 * Bump {@link CHAOS_SCHEMA_MAJOR_VERSION} only for breaking contract changes.
 */
export const CHAOS_SCHEMA_MAJOR_VERSION = 1;

const CHAOS_SCHEMA_PUBLIC_ORIGIN = 'https://archlens.dev';

/** Canonical $id / docs URL (archlens.dev). */
export function chaosSchemaPublicUrl(
  channel: 'latest' | `v${number}` = `v${CHAOS_SCHEMA_MAJOR_VERSION}`
): string {
  return `${CHAOS_SCHEMA_PUBLIC_ORIGIN}/schemas/${channel}/chaos.schema.json`;
}

/**
 * Fetchable URL for `# yaml-language-server: $schema=…`.
 * Uses raw.githubusercontent.com so IDEs can load the schema before Pages deploys.
 */
function chaosSchemaLanguageServerUrl(
  channel: 'latest' | `v${number}` = `v${CHAOS_SCHEMA_MAJOR_VERSION}`
): string {
  return `https://raw.githubusercontent.com/mzworthington/archlens/main/schemas/${channel}/chaos.schema.json`;
}

/** First-line comment so YAML language servers bind the JSON Schema. */
export function chaosYamlLanguageServerDirective(schemaUrl?: string): string {
  return `# yaml-language-server: $schema=${schemaUrl ?? chaosSchemaLanguageServerUrl()}`;
}
