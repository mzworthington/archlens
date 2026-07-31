/**
 * Migrate app test/source entityRefs after product context extraction.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '../app/packages');

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function migrate(content) {
  let result = content;
  const replacements = [
    ['application/chaoslens-stress', 'chaoslens-stress'],
    ['application/advicelens-stress', 'advicelens-stress'],
    ['application/techdocs-s3-storage', 'backstage/techdocs-s3-storage'],
    ['application/packages', 'backstage/packages'],
    ['application/plugins', 'backstage/plugins'],
    ['application/microsite', 'backstage/microsite'],
    ['application/docs-ui', 'backstage/docs-ui'],
    ['application/app', 'blueprint/app'],
    ['application/sim', 'blueprint/sim'],
    ['application/eshop', 'eshop'],
    ['application/backstage', 'backstage'],
    ['/workspace/application/chaoslens-stress', '/workspace/chaoslens-stress'],
    ['/workspace/application/advicelens-stress', '/workspace/advicelens-stress'],
    ['/workspace/application/eshop', '/workspace/eshop'],
    ['/workspace/application/backstage', '/workspace/backstage'],
    ['/workspace/application/app', '/workspace/blueprint/app'],
  ];
  for (const [from, to] of replacements) {
    result = result.replaceAll(from, to);
  }
  return result;
}

let changed = 0;
for (const file of listFiles(root)) {
  const original = readFileSync(file, 'utf8');
  const migrated = migrate(original);
  if (migrated !== original) {
    writeFileSync(file, migrated);
    changed += 1;
  }
}
console.log(`Updated ${changed} app files`);
