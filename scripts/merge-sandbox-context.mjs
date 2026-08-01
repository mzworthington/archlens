#!/usr/bin/env node
/**
 * Copy sandbox blueprint products into blueprints/ and merge per-product
 * context-overlay.yaml into each product's context.yaml. Tooling only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(path.join(fileURLToPath(new URL('.', import.meta.url)), '../app/packages/cli/package.json'));
const yaml = require('js-yaml');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const sandboxDir = path.join(scriptDir, 'sandbox-blueprints');
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

  const nodesByRef = new Map(
    (contextDoc.nodes ?? []).map(node => [node.entityRef, { ...node }])
  );
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

function copySandboxProducts() {
  let copied = 0;
  for (const entry of fs.readdirSync(sandboxDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const source = path.join(sandboxDir, entry.name);
    const target = path.join(blueprintsDir, entry.name);
    fs.cpSync(source, target, { recursive: true, force: true });
    copied += 1;
    console.log(`  copied ${entry.name}/`);
  }
  return copied;
}

function mergeAllContextOverlays() {
  let merged = 0;

  const rootOverlay = path.join(sandboxDir, 'context-overlay.yaml');
  if (fs.existsSync(rootOverlay)) {
    if (
      mergeOverlayIntoContext(
        path.join(blueprintsDir, 'application', 'context.yaml'),
        rootOverlay
      )
    ) {
      merged += 1;
    }
  }

  for (const entry of fs.readdirSync(sandboxDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const overlayPath = path.join(sandboxDir, entry.name, 'context-overlay.yaml');
    if (!fs.existsSync(overlayPath)) continue;

    const contextPath = path.join(blueprintsDir, entry.name, 'context.yaml');
    if (mergeOverlayIntoContext(contextPath, overlayPath)) {
      merged += 1;
    }
  }

  // golden-journey lives at blueprints/golden-journey/context.yaml (sandbox copies into golden-journey/)
  const goldenOverlay = path.join(sandboxDir, 'golden-journey', 'context-overlay.yaml');
  if (fs.existsSync(goldenOverlay)) {
    if (
      mergeOverlayIntoContext(path.join(blueprintsDir, 'golden-journey', 'context.yaml'), goldenOverlay)
    ) {
      merged += 1;
    }
  }

  if (merged === 0) {
    console.log('  no context overlays found — skipped merge');
  }
}

console.log(`Sandbox dir:    ${sandboxDir}`);
console.log(`Blueprints dir: ${blueprintsDir}`);
console.log('▶ copy sandbox blueprint products');
const copied = copySandboxProducts();
console.log(`✓ copied ${copied} product folder(s)`);
console.log('▶ merge sandbox context overlays');
mergeAllContextOverlays();
console.log('✓ sandbox blueprints installed');
