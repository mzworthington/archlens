#!/usr/bin/env node
/**
 * Copy committed samples/ products into an ephemeral blueprints/ tree
 * (e.g. local batch that also holds scanned sample corpora).
 *
 * Usage: node scripts/merge-samples.mjs [blueprints-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const samplesDir = path.join(repoRoot, 'samples');

function resolveUnderRepo(candidate) {
  const resolved = path.resolve(candidate);
  const relative = path.relative(repoRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing path outside repo: ${candidate}`);
  }
  return resolved;
}
const blueprintsDir = resolveUnderRepo(
  process.argv[2] ? path.resolve(process.argv[2]) : path.join(repoRoot, 'blueprints')
);

if (!fs.existsSync(samplesDir)) {
  throw new Error(`Missing samples directory: ${samplesDir}`);
}

fs.mkdirSync(blueprintsDir, { recursive: true });
console.log(`Golden paths:   ${samplesDir}`);
console.log(`Blueprints dir: ${blueprintsDir}`);
console.log('▶ copy sample products');

let copied = 0;
for (const entry of fs.readdirSync(samplesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const source = path.join(samplesDir, entry.name);
  const target = path.join(blueprintsDir, entry.name);
  fs.cpSync(source, target, { recursive: true, force: true });
  copied += 1;
  console.log(`  copied ${entry.name}/`);
}

console.log(`✓ copied ${copied} product folder(s) into blueprints tree`);
