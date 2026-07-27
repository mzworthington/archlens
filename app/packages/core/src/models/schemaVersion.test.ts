import { describe, it, expect } from 'vitest';
import {
  assessSchemaVersion,
  blueprintYamlLanguageServerDirective,
  parseApiVersionMajor,
  systemSchemaLanguageServerUrl,
  systemSchemaPublicUrl,
  SYSTEM_SCHEMA_MAJOR_VERSION,
  BLUEPRINT_API_VERSION,
} from './schemaVersion';

describe('schemaVersion', () => {
  it('builds versioned and latest public URLs', () => {
    expect(systemSchemaPublicUrl()).toBe(
      `https://blueprint.mzworthington.co.uk/schemas/v${SYSTEM_SCHEMA_MAJOR_VERSION}/blueprint.schema.json`
    );
    expect(systemSchemaPublicUrl('latest')).toBe(
      'https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json'
    );
  });

  it('parses apiVersion majors', () => {
    expect(parseApiVersionMajor(BLUEPRINT_API_VERSION)).toBe(SYSTEM_SCHEMA_MAJOR_VERSION);
    expect(parseApiVersionMajor('blueprint.dev/v2')).toBe(2);
    expect(parseApiVersionMajor('')).toBe(null);
    expect(parseApiVersionMajor('not-a-version')).toBe(null);
  });

  it('assessSchemaVersion returns null when compatible', () => {
    expect(assessSchemaVersion(BLUEPRINT_API_VERSION)).toBeNull();
  });

  it('assessSchemaVersion flags older and newer majors', () => {
    const older = assessSchemaVersion('blueprint.dev/v2');
    expect(older?.status).toBe('legacy');
    expect(older?.loadedMajor).toBe(2);

    const newer = assessSchemaVersion('blueprint.dev/v5');
    expect(newer?.status).toBe('newer');
    expect(newer?.loadedMajor).toBe(5);
  });

  it('assessSchemaVersion flags unrecognized apiVersion strings', () => {
    const unknown = assessSchemaVersion('blueprint-v99');
    expect(unknown?.status).toBe('unknown');
  });

  it('builds a fetchable language-server URL and directive', () => {
    expect(systemSchemaLanguageServerUrl()).toBe(
      `https://raw.githubusercontent.com/mzworthington/blueprint/main/schemas/v${SYSTEM_SCHEMA_MAJOR_VERSION}/blueprint.schema.json`
    );
    expect(blueprintYamlLanguageServerDirective()).toBe(
      `# yaml-language-server: $schema=${systemSchemaLanguageServerUrl()}`
    );
    expect(blueprintYamlLanguageServerDirective('../../schemas/v4/blueprint.schema.json')).toBe(
      '# yaml-language-server: $schema=../../schemas/v4/blueprint.schema.json'
    );
  });
});
