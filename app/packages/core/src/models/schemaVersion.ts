/**
 * Public JSON Schema hosting for blueprint YAML (GitHub Pages / custom domain).
 * Bump {@link SYSTEM_SCHEMA_MAJOR_VERSION} only for breaking contract changes.
 */
export const SYSTEM_SCHEMA_MAJOR_VERSION = 4;

export const BLUEPRINT_API_GROUP = 'blueprint.dev';

export const BLUEPRINT_API_VERSION = `${BLUEPRINT_API_GROUP}/v${SYSTEM_SCHEMA_MAJOR_VERSION}`;

export const BLUEPRINT_KIND_DIAGRAM = 'Diagram';

export const SYSTEM_SCHEMA_PUBLIC_ORIGIN = 'https://blueprint.mzworthington.co.uk';

/** Canonical JSON Schema $id / docs URL (GitHub Pages). */
export function systemSchemaPublicUrl(
  channel: 'latest' | `v${number}` = `v${SYSTEM_SCHEMA_MAJOR_VERSION}`
): string {
  return `${SYSTEM_SCHEMA_PUBLIC_ORIGIN}/schemas/${channel}/blueprint.schema.json`;
}

/**
 * Fetchable URL for `# yaml-language-server: $schema=…`.
 * Uses raw.githubusercontent.com so IDEs can load the schema before Pages deploys.
 */
export function systemSchemaLanguageServerUrl(
  channel: 'latest' | `v${number}` = `v${SYSTEM_SCHEMA_MAJOR_VERSION}`
): string {
  return `https://raw.githubusercontent.com/mzworthington/blueprint/main/schemas/${channel}/blueprint.schema.json`;
}

/** First-line comment so YAML language servers bind the JSON Schema. */
export function blueprintYamlLanguageServerDirective(schemaUrl?: string): string {
  return `# yaml-language-server: $schema=${schemaUrl ?? systemSchemaLanguageServerUrl()}`;
}

export type SchemaVersionStatus = 'legacy' | 'newer' | 'unknown';

/** Result when {@link assessSchemaVersion} detects a contract mismatch (null = compatible). */
export type SchemaVersionAssessment = {
  status: SchemaVersionStatus;
  loadedMajor: number | null;
  expectedMajor: number;
  loadedApiVersion: string;
  expectedApiVersion: string;
  title: string;
  message: string;
  migrationHint: string;
};

/** Extract the contract major from `apiVersion` (e.g. `blueprint.dev/v4`). */
export function parseApiVersionMajor(apiVersion: string): number | null {
  const trimmed = apiVersion.trim();
  const match = trimmed.match(/^blueprint\.dev\/v(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Returns a mismatch assessment when `loadedApiVersion` is not compatible with the app contract.
 */
export function assessSchemaVersion(
  loadedApiVersion: string,
  expectedMajor: number = SYSTEM_SCHEMA_MAJOR_VERSION
): SchemaVersionAssessment | null {
  const expectedApiVersion = BLUEPRINT_API_VERSION;
  const contract = parseApiVersionMajor(loadedApiVersion);

  if (contract === null) {
    return {
      status: 'unknown',
      loadedMajor: null,
      expectedMajor,
      loadedApiVersion,
      expectedApiVersion,
      title: 'Unrecognized apiVersion',
      message: `Could not parse apiVersion "${loadedApiVersion}". Expected ${expectedApiVersion}.`,
      migrationHint: `Set apiVersion to ${expectedApiVersion} and regenerate YAML with Blueprint CLI.`,
    };
  }

  if (contract === expectedMajor) return null;

  if (contract < expectedMajor) {
    return {
      status: 'legacy',
      loadedMajor: contract,
      expectedMajor,
      loadedApiVersion,
      expectedApiVersion,
      title: `Schema v${contract}`,
      message: `This diagram targets apiVersion blueprint.dev/v${contract}; Blueprint expects v${expectedMajor}.`,
      migrationHint:
        'Re-run Blueprint CLI or commit pending changes from the designer to regenerate at the current schema version.',
    };
  }

  return {
    status: 'newer',
    loadedMajor: contract,
    expectedMajor,
    loadedApiVersion,
    expectedApiVersion,
    title: `Schema v${contract}`,
    message: `This diagram targets apiVersion blueprint.dev/v${contract}, which is newer than this Blueprint build (v${expectedMajor}).`,
    migrationHint: 'Upgrade Blueprint to a release that supports this schema version.',
  };
}
