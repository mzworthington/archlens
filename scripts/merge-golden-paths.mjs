#!/usr/bin/env node
/**
 * Copy committed golden-paths/ products into an ephemeral blueprints/ tree and merge
 * per-product context-overlay.yaml into each product's context.yaml.
 *
 * Usage: node scripts/merge-golden-paths.mjs [blueprints-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(
  path.join(fileURLToPath(new URL('.', import.meta.url)), '../app/packages/cli/package.json')
);
const yaml = require('js-yaml');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const goldenPathsDir = path.join(repoRoot, 'golden-paths');
const blueprintsDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(repoRoot, 'blueprints');

function depKey(dep) {
  return `${dep.from}|${dep.to}|${dep.type ?? ''}|${dep.description ?? ''}`;
}

function mergeOverlayIntoContext(contextPath, overlayPath) {
  if (!fs.existsSync(overlayPath)) return false;

  if (!fs.existsSync(contextPath)) {
    console.warn(`  skip merge — missing ${contextPath}`);
    return false;
  }

  const contextDoc = yaml.load(fs.readFileSync(contextPath, 'utf8'));
  const overlay = yaml.load(fs.readFileSync(overlayPath, 'utf8'));

  const nodesByRef = new Map((contextDoc.nodes ?? []).map(node => [node.entityRef, { ...node }]));
  for (const node of overlay.nodes ?? []) {
    nodesByRef.set(node.entityRef, { ...(nodesByRef.get(node.entityRef) ?? {}), ...node });
  }
  contextDoc.nodes = [...nodesByRef.values()];

  const depKeys = new Set((contextDoc.dependencies ?? []).map(depKey));
  const dependencies = [...(contextDoc.dependencies ?? [])];
  for (const dep of overlay.dependencies ?? []) {
    const key = depKey(dep);
    if (!depKeys.has(key)) {
      depKeys.add(key);
      dependencies.push(dep);
    }
  }
  contextDoc.dependencies = dependencies;

  fs.writeFileSync(contextPath, yaml.dump(contextDoc, { lineWidth: 120, noRefs: true }));
  console.log(
    `  merged ${overlay.nodes?.length ?? 0} overlay node(s) into ${path.relative(repoRoot, contextPath)}`
  );
  return true;
}

function copyGoldenPathProducts() {
  if (!fs.existsSync(goldenPathsDir)) {
    throw new Error(`Missing golden-paths directory: ${goldenPathsDir}`);
  }
  fs.mkdirSync(blueprintsDir, { recursive: true });
  let copied = 0;
  for (const entry of fs.readdirSync(goldenPathsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const source = path.join(goldenPathsDir, entry.name);
    const target = path.join(blueprintsDir, entry.name);
    fs.cpSync(source, target, { recursive: true, force: true });
    copied += 1;
    console.log(`  copied ${entry.name}/`);
  }
  return copied;
}

function mergeAllContextOverlays() {
  let merged = 0;
  for (const entry of fs.readdirSync(goldenPathsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const overlayPath = path.join(goldenPathsDir, entry.name, 'context-overlay.yaml');
    if (!fs.existsSync(overlayPath)) continue;
    const contextPath = path.join(blueprintsDir, entry.name, 'context.yaml');
    if (mergeOverlayIntoContext(contextPath, overlayPath)) {
      merged += 1;
    }
  }
  if (merged === 0) {
    console.log('  no context overlays found — skipped merge');
  }
}

console.log(`Golden paths:   ${goldenPathsDir}`);
console.log(`Blueprints dir: ${blueprintsDir}`);
console.log('▶ copy golden-path products');
const copied = copyGoldenPathProducts();
console.log(`✓ copied ${copied} product folder(s)`);
console.log('▶ merge context overlays');
mergeAllContextOverlays();
console.log('✓ golden-paths installed into blueprints tree');
