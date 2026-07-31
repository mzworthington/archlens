/**
 * Migrate bundled sandbox entityRefs from blueprint/* namespace to context-root peers:
 * - application/* (application context + product diagrams)
 * - infrastructure/* (infrastructure context + IaC examples)
 * - golden-paths/* (golden journey context + estate)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const blueprintsDir = join(repoRoot, 'blueprints');

function listYamlFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listYamlFiles(full));
    } else if (/\.ya?ml$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function migrateGoldenJourney(content) {
  return content
    .replaceAll('blueprint/golden-journey', 'golden-paths/golden-journey')
    .replaceAll('blueprint/golden-paths', 'golden-paths');
}

function migrateInfrastructure(content) {
  return content
    .replaceAll('blueprint/infrastructure', 'infrastructure')
    .replaceAll('blueprint/', 'infrastructure/');
}

function migrateApplicationContext(content) {
  return content
    .replaceAll('blueprint/application', 'application')
    .replaceAll('blueprint/', 'application/');
}

function migrateApplicationScope(content) {
  return content.replaceAll('blueprint/', 'application/');
}

function migrateFile(filePath) {
  const rel = relative(blueprintsDir, filePath).replace(/\\/g, '/');
  const original = readFileSync(filePath, 'utf8');
  let migrated;

  if (rel.startsWith('golden-journey/')) {
    migrated = migrateGoldenJourney(original);
  } else if (rel.startsWith('infrastructure/')) {
    migrated = migrateInfrastructure(original);
  } else if (rel === 'application/context.yaml') {
    migrated = migrateApplicationContext(original);
  } else if (rel.startsWith('application/')) {
    migrated = migrateApplicationScope(original);
  } else {
    migrated = migrateApplicationScope(original);
  }

  if (migrated !== original) {
    writeFileSync(filePath, migrated);
    return true;
  }
  return false;
}

const files = listYamlFiles(blueprintsDir);
let changed = 0;
for (const file of files) {
  if (migrateFile(file)) {
    changed += 1;
    console.log(`updated ${relative(repoRoot, file)}`);
  }
}

console.log(`Done. ${changed} file(s) updated.`);
