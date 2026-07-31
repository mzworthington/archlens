/**
 * Extract peer product contexts from application/context.yaml and migrate entityRefs:
 * - backstage/*  (packages, plugins, microsite, docs-ui, techdocs-s3-storage)
 * - blueprint/*    (sim group + app monorepo)
 * - eshop
 * - chaoslens-stress/*
 * - advicelens-stress/*
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(
  join(fileURLToPath(new URL('.', import.meta.url)), '../app/packages/cli/package.json')
);
const yaml = require('js-yaml');

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const blueprintsDir = join(repoRoot, 'blueprints');

const BACKSTAGE_PREFIXES = [
  'backstage',
  'backstage/packages',
  'backstage/plugins',
  'backstage/microsite',
  'backstage/docs-ui',
  'backstage/techdocs-s3-storage',
];

const BLUEPRINT_PREFIXES = ['blueprint/sim', 'blueprint/app'];

const ESHOP_PREFIXES = ['eshop'];

const CHAOS_PREFIXES = ['chaoslens-stress'];

const ADVICE_PREFIXES = ['advicelens-stress'];

function listYamlFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listYamlFiles(full));
    else if (/\.ya?ml$/i.test(entry.name)) files.push(full);
  }
  return files;
}

function migrateEntityRef(ref) {
  return ref;
}

function migrateContent(content) {
  if (!content.includes('application/chaoslens-stress') &&
      !content.includes('application/advicelens-stress') &&
      !content.includes('application/backstage') &&
      !content.includes('application/packages') &&
      !content.includes('application/app') &&
      !content.includes('application/eshop')) {
    return content;
  }

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
  ];
  for (const [from, to] of replacements) {
    result = result.replaceAll(from, to);
  }
  return result;
}

function matchesPrefixes(ref, prefixes) {
  return prefixes.some(p => ref === p || ref.startsWith(`${p}/`));
}

function migrateNode(node) {
  const copy = structuredClone(node);
  if (copy.entityRef) copy.entityRef = migrateEntityRef(copy.entityRef);
  if (copy.parentEntityRef) copy.parentEntityRef = migrateEntityRef(copy.parentEntityRef);
  return copy;
}

function migrateDep(dep) {
  const copy = structuredClone(dep);
  if (copy.from) copy.from = migrateEntityRef(copy.from);
  if (copy.to) copy.to = migrateEntityRef(copy.to);
  return copy;
}

function nodeBelongsToContext(entityRef, prefixes, contextKey) {
  if (entityRef === contextKey) return true;
  return matchesPrefixes(entityRef, prefixes);
}

function extractContextNodes(allNodes, prefixes, contextKey) {
  return allNodes.filter(n => nodeBelongsToContext(n.entityRef, prefixes, contextKey));
}

function extractContextDeps(allDeps, nodeRefs) {
  const refs = new Set(nodeRefs);
  return allDeps.filter(d => refs.has(d.from) || refs.has(d.to));
}

function writeContextYaml(dir, doc) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, 'context.yaml');
  const header = `# yaml-language-server: $schema=https://archlens.dev/schemas/latest/blueprint.schema.json\n`;
  writeFileSync(path, header + yaml.dump(doc, { lineWidth: 120, noRefs: true }));
  return path;
}

function buildStressContextExtras(contextKey, nodes, dependencies) {
  if (contextKey === 'chaoslens-stress') {
    nodes.push({
      entityRef: 'chaoslens-stress/external-auth/auth',
      type: 'microservice',
      name: 'Auth Service (External)',
      external: true,
      properties: {
        vendor: 'Sibling workspace diagram',
        classification: 'cross-diagram',
      },
    });
    dependencies.push({
      from: 'chaoslens-stress/external-scope',
      to: 'chaoslens-stress/external-auth/auth',
      type: 'direct-call',
      description: 'Token validation via sibling Auth diagram',
    });
    dependencies.push({
      from: 'chaoslens-stress/user',
      to: 'chaoslens-stress',
      type: 'direct-call',
      description: 'Runs fault injection scenarios',
    });
  }

  if (contextKey === 'advicelens-stress') {
    nodes.push({
      entityRef: 'advicelens-stress/payment-processor',
      type: 'gateway-api',
      name: 'Payment Processor',
      external: true,
      properties: {
        vendor: 'Stripe-compatible PSP',
        classification: 'third-party',
      },
    });
    dependencies.push({
      from: 'advicelens-stress',
      to: 'advicelens-stress/payment-processor',
      type: 'direct-call',
      description: 'Checkout and billing payments',
    });
    dependencies.push({
      from: 'advicelens-stress/user',
      to: 'advicelens-stress',
      type: 'direct-call',
      description: 'Reviews architecture advice',
    });
  }
}

const CONTEXT_SPECS = [
  {
    key: 'backstage',
    name: 'Backstage',
    description:
      'Backstage monorepo — core packages, plugins, microsite, and TechDocs storage contrib.',
    folder: 'backstage',
    prefixes: BACKSTAGE_PREFIXES,
    userRef: 'backstage/user',
  },
  {
    key: 'blueprint',
    name: 'Blueprint',
    description: 'ArchLens application monorepo (CLI, designer, and core packages).',
    folder: 'blueprint',
    prefixes: BLUEPRINT_PREFIXES,
    userRef: 'blueprint/user',
  },
  {
    key: 'eshop',
    name: 'E-Shop',
    description: 'Sample e-commerce estate for import and merge demonstrations.',
    folder: 'eshop',
    prefixes: ESHOP_PREFIXES,
    userRef: 'eshop/user',
  },
  {
    key: 'chaoslens-stress',
    name: 'ChaosLens Stress Tests',
    description: 'Architecture diagrams for stress-testing ChaosLens simulations.',
    folder: 'chaoslens-stress',
    prefixes: CHAOS_PREFIXES,
    userRef: 'chaoslens-stress/user',
  },
  {
    key: 'advicelens-stress',
    name: 'AdviceLens Stress Tests',
    description: 'Scenarios for AdviceLens recommendations, forensics roll-up, and staleness.',
    folder: 'advicelens-stress',
    prefixes: ADVICE_PREFIXES,
    userRef: 'advicelens-stress/user',
  },
];

// 1. Migrate all blueprint YAML entity refs
let yamlChanged = 0;
for (const file of listYamlFiles(blueprintsDir)) {
  const rel = relative(blueprintsDir, file).replace(/\\/g, '/');
  if (rel === 'application/context.yaml') continue;
  const original = readFileSync(file, 'utf8');
  const migrated = migrateContent(original);
  if (migrated !== original) {
    writeFileSync(file, migrated);
    yamlChanged += 1;
  }
}

// 2. Split application/context.yaml
const applicationPath = join(blueprintsDir, 'application', 'context.yaml');
const applicationDoc = yaml.load(readFileSync(applicationPath, 'utf8'));
const allNodes = (applicationDoc.nodes ?? []).map(migrateNode);
const allDeps = (applicationDoc.dependencies ?? []).map(migrateDep);

const extractedRefs = new Set();

for (const spec of CONTEXT_SPECS) {
  const nodes = extractContextNodes(allNodes, spec.prefixes, spec.key).map(migrateNode);
  if (nodes.length === 0) {
    console.warn(`No nodes for ${spec.key} — skipped context write`);
    continue;
  }

  nodes.unshift({
    entityRef: spec.userRef,
    type: 'person',
    name: 'User',
    properties: { role: 'context-actor' },
  });

  const nodeRefs = nodes.map(n => n.entityRef);
  const dependencies = extractContextDeps(allDeps, nodeRefs).map(migrateDep);

  if (spec.userRef === 'backstage/user') {
    dependencies.push({
      from: 'backstage/user',
      to: 'backstage',
      type: 'direct-call',
      description: 'Uses',
    });
  }
  if (spec.userRef === 'blueprint/user') {
    dependencies.push({
      from: 'blueprint/user',
      to: 'blueprint/sim',
      type: 'direct-call',
      description: 'Uses',
    });
  }
  if (spec.userRef === 'eshop/user') {
    dependencies.push({
      from: 'eshop/user',
      to: 'eshop',
      type: 'direct-call',
      description: 'Uses',
    });
  }

  buildStressContextExtras(spec.key, nodes, dependencies);

  const contextDoc = {
    version: applicationDoc.version,
    level: 'context',
    metadata: {
      entityRef: spec.key,
      name: spec.name,
      description: spec.description,
    },
    nodes,
    dependencies,
  };

  const written = writeContextYaml(join(blueprintsDir, spec.folder), contextDoc);
  console.log(`wrote ${relative(repoRoot, written)} (${nodes.length} nodes)`);
  for (const ref of nodeRefs) extractedRefs.add(ref);
}

const remainingNodes = allNodes.filter(n => !extractedRefs.has(n.entityRef));
const remainingRefs = new Set(remainingNodes.map(n => n.entityRef));
const remainingDeps = allDeps.filter(
  d => remainingRefs.has(d.from) && remainingRefs.has(d.to)
);

applicationDoc.nodes = remainingNodes;
applicationDoc.dependencies = remainingDeps;
writeFileSync(
  applicationPath,
  `# yaml-language-server: $schema=https://archlens.dev/schemas/latest/blueprint.schema.json\n` +
    yaml.dump(applicationDoc, { lineWidth: 120, noRefs: true })
);

console.log(`Updated application/context.yaml (${remainingNodes.length} nodes)`);
console.log(`Migrated entityRefs in ${yamlChanged} blueprint YAML file(s)`);
