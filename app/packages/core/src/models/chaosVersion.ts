/**
 * Public JSON Schema hosting for ChaosSpec YAML (GitHub Pages / custom domain).
 * Bump {@link CHAOS_SCHEMA_MAJOR_VERSION} only for breaking contract changes.
 */
export const CHAOS_SCHEMA_MAJOR_VERSION = 1;

export const CHAOS_SCHEMA_PUBLIC_ORIGIN = 'https://archlens.dev';

/** Canonical $id / docs URL (GitHub Pages). */
export function chaosSchemaPublicUrl(
  channel: 'latest' | `v${number}` = `v${CHAOS_SCHEMA_MAJOR_VERSION}`
): string {
  return `${CHAOS_SCHEMA_PUBLIC_ORIGIN}/schemas/${channel}/chaos.schema.json`;
}

/**
 * Fetchable URL for `# yaml-language-server: $schema=…`.
 * Uses raw.githubusercontent.com so IDEs can load the schema before Pages deploys.
 */
export function chaosSchemaLanguageServerUrl(
  channel: 'latest' | `v${number}` = `v${CHAOS_SCHEMA_MAJOR_VERSION}`
): string {
  return `https://raw.githubusercontent.com/mzworthington/archlens/main/schemas/${channel}/chaos.schema.json`;
}

/** First-line comment so YAML language servers bind the JSON Schema. */
export function chaosYamlLanguageServerDirective(schemaUrl?: string): string {
  return `# yaml-language-server: $schema=${schemaUrl ?? chaosSchemaLanguageServerUrl()}`;
}
