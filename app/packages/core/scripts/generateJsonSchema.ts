/**
 * Writes JSON Schema for blueprint YAML IDE validation from the Zod contract.
 *
 * Usage:
 *   pnpm --filter @blueprint/core generate:schema
 *   pnpm --filter @blueprint/core generate:schema -- --check
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM_SCHEMA_MAJOR_VERSION } from '../src/models/schemaVersion.ts';
import { toSystemSchemaJsonSchema } from '../src/rules/graph.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemasRoot = join(__dirname, '../../../../schemas');
const canonicalPath = join(schemasRoot, 'blueprint.schema.json');
const versionedPath = join(
  schemasRoot,
  `v${SYSTEM_SCHEMA_MAJOR_VERSION}`,
  'blueprint.schema.json'
);
const latestPath = join(schemasRoot, 'latest', 'blueprint.schema.json');
const checkOnly = process.argv.includes('--check');

type Channel = 'latest' | `v${number}`;

function splitDefinitionFiles(
  schema: Record<string, unknown>,
  channel: Channel
): Record<string, unknown> {
  const definitions = schema.definitions as Record<string, unknown> | undefined;
  if (!definitions || Object.keys(definitions).length === 0) return schema;

  const channelDir =
    channel === 'latest'
      ? join(schemasRoot, 'latest')
      : join(schemasRoot, `v${SYSTEM_SCHEMA_MAJOR_VERSION}`);
  const definitionsDir = join(channelDir, 'definitions');
  mkdirSync(definitionsDir, { recursive: true });

  const origin = 'https://blueprint.mzworthington.co.uk/schemas';
  const channelSegment = channel === 'latest' ? 'latest' : `v${SYSTEM_SCHEMA_MAJOR_VERSION}`;

  for (const [name, def] of Object.entries(definitions)) {
    const defId = `${origin}/${channelSegment}/definitions/${name}.schema.json`;
    const defDoc = {
      ...(def as Record<string, unknown>),
      $schema: 'http://json-schema.org/draft-07/schema',
      $id: defId,
    };
    writeFileSync(
      join(definitionsDir, `${name}.schema.json`),
      `${JSON.stringify(defDoc, null, 2)}\n`,
      'utf8'
    );
    definitions[name] = { $ref: `definitions/${name}.schema.json` };
  }

  return { ...schema, definitions };
}

function buildChannelSchema(channel: Channel): string {
  const schema = splitDefinitionFiles(toSystemSchemaJsonSchema(channel), channel);
  return `${JSON.stringify(schema, null, 2)}\n`;
}

const channelOutputs: Array<{ channel: Channel; path: string }> = [
  { channel: `v${SYSTEM_SCHEMA_MAJOR_VERSION}`, path: versionedPath },
  { channel: 'latest', path: latestPath },
];

if (checkOnly) {
  for (const { channel, path } of channelOutputs) {
    const expected = buildChannelSchema(channel);
    let existing: string | undefined;
    try {
      existing = readFileSync(path, 'utf8');
    } catch {
      console.error(`Missing ${path}. Run: pnpm --filter @blueprint/core generate:schema`);
      process.exit(1);
    }
    if (existing !== expected) {
      console.error(`Out of date: ${path}\nRun: pnpm --filter @blueprint/core generate:schema`);
      process.exit(1);
    }
  }
  const canonicalExpected = buildChannelSchema(`v${SYSTEM_SCHEMA_MAJOR_VERSION}`);
  try {
    const canonicalExisting = readFileSync(canonicalPath, 'utf8');
    if (canonicalExisting !== canonicalExpected) {
      console.error(
        `Out of date: ${canonicalPath}\nRun: pnpm --filter @blueprint/core generate:schema`
      );
      process.exit(1);
    }
  } catch {
    console.error(`Missing ${canonicalPath}. Run: pnpm --filter @blueprint/core generate:schema`);
    process.exit(1);
  }
  console.log('OK: schema files match Zod contract');
  process.exit(0);
}

for (const { channel, path } of channelOutputs) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buildChannelSchema(channel), 'utf8');
  console.log(`Wrote ${path}`);
}

mkdirSync(dirname(canonicalPath), { recursive: true });
writeFileSync(
  canonicalPath,
  buildChannelSchema(`v${SYSTEM_SCHEMA_MAJOR_VERSION}`),
  'utf8'
);
console.log(`Wrote ${canonicalPath}`);
