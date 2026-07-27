/**
 * One-off migration: BlueprintSpec v3 wire format → v4.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../../../');

function walkYaml(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkYaml(full));
    } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
      out.push(full);
    }
  }
  return out;
}

function migrateDoc(doc: Record<string, unknown>): Record<string, unknown> | null {
  if (doc.apiVersion && doc.kind && doc.metadata && doc.spec) return null;

  if (!doc.metaData || typeof doc.metaData !== 'object') {
    return null;
  }

  const meta = doc.metaData as Record<string, unknown>;
  const metadata: Record<string, unknown> = {
    name: meta.name,
  };
  if (meta.entityRef) metadata.entityRef = meta.entityRef;
  if (meta.source) metadata.source = meta.source;

  return {
    apiVersion: 'blueprint.dev/v4',
    kind: 'Diagram',
    metadata,
    spec: {
      level: doc.level,
      nodes: doc.nodes ?? [],
      dependencies: doc.dependencies ?? [],
    },
  };
}

const dirs = [join(ROOT, 'blueprints'), join(ROOT, 'scripts/sandbox-blueprints')];

let migrated = 0;
let skipped = 0;

for (const dir of dirs) {
  for (const file of walkYaml(dir)) {
    const raw = readFileSync(file, 'utf8');
    const doc = yaml.load(raw) as Record<string, unknown>;
    if (!doc || typeof doc !== 'object') continue;

    try {
      const next = migrateDoc(doc);
      if (!next) {
        skipped++;
        continue;
      }
      writeFileSync(file, yaml.dump(next, { noRefs: true, lineWidth: 120 }), 'utf8');
      migrated++;
    } catch (err) {
      console.error(`Failed ${file}:`, err);
      process.exit(1);
    }
  }
}

console.log(`Migrated ${migrated} files, skipped ${skipped} already v4.`);
