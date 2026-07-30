/**
 * Writes JSON Schema for blueprint YAML IDE validation from the Zod contract.
 *
 * Usage:
 *   cd app && pnpm generate:schema
 *   cd app && pnpm generate:schema -- --check
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM_SCHEMA_MAJOR_VERSION } from '../src/models/schemaVersion.ts';
import { CHAOS_SCHEMA_MAJOR_VERSION } from '../src/models/chaosVersion.ts';
import { toSystemSchemaJsonSchema } from '../src/rules/graph.ts';
import { toChaosSpecJsonSchema } from '../src/resilience/chaosSpecDocument.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemasRoot = join(__dirname, '../../../../schemas');
const checkOnly = process.argv.includes('--check');

const schemaBundles = [
  {
    label: 'blueprint',
    json: () => `${JSON.stringify(toSystemSchemaJsonSchema(), null, 2)}\n`,
    outputs: [
      join(schemasRoot, 'blueprint.schema.json'),
      join(schemasRoot, `v${SYSTEM_SCHEMA_MAJOR_VERSION}`, 'blueprint.schema.json'),
      join(schemasRoot, 'latest', 'blueprint.schema.json'),
    ],
  },
  {
    label: 'chaos',
    json: () => `${JSON.stringify(toChaosSpecJsonSchema(), null, 2)}\n`,
    outputs: [
      join(schemasRoot, 'chaos.schema.json'),
      join(schemasRoot, `v${CHAOS_SCHEMA_MAJOR_VERSION}`, 'chaos.schema.json'),
      join(schemasRoot, 'latest', 'chaos.schema.json'),
    ],
  },
];

function writeAll(): void {
  for (const bundle of schemaBundles) {
    const json = bundle.json();
    for (const outPath of bundle.outputs) {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, json, 'utf8');
      console.log(`Wrote ${outPath}`);
    }
  }
}

if (checkOnly) {
  for (const bundle of schemaBundles) {
    const json = bundle.json();
    for (const outPath of bundle.outputs) {
      let existing: string | undefined;
      try {
        existing = readFileSync(outPath, 'utf8');
      } catch {
        console.error(`Missing ${outPath}. Run: cd app && pnpm generate:schema`);
        process.exit(1);
      }
      if (existing !== json) {
        console.error(`Out of date: ${outPath}\nRun: cd app && pnpm generate:schema`);
        process.exit(1);
      }
    }
  }
  console.log('OK: schema files match Zod contract');
  process.exit(0);
}

writeAll();
