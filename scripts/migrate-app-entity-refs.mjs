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
  result = result.replaceAll('blueprint/golden-journey', 'golden-paths/golden-journey');
  result = result.replaceAll('blueprint/golden-paths', 'golden-paths');
  result = result.replaceAll('blueprint/infrastructure', 'infrastructure');
  result = result.replaceAll('blueprint/application', 'application');
  result = result.replaceAll('/workspace/blueprint/golden-paths', '/workspace/golden-paths');
  result = result.replaceAll('/workspace/blueprint/infrastructure', '/workspace/infrastructure');
  result = result.replaceAll('/workspace/blueprint/application', '/workspace/application');
  result = result.replaceAll('/workspace/blueprint?', '/workspace/application?');
  result = result.replaceAll("'/workspace/blueprint'", "'/workspace/application'");
  result = result.replaceAll('"/workspace/blueprint"', '"\/workspace/application"');
  result = result.replaceAll('/workspace/blueprint/', '/workspace/application/');
  result = result.replaceAll('blueprint/', 'application/');
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
console.log(`Updated ${changed} files`);
