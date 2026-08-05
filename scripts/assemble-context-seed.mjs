#!/usr/bin/env node
/**
 * Assemble a sparse level:context BlueprintSpec YAML from a JSON declaration.
 * Used by catalog publish pipelines before `archlens scan` so hydration preserves
 * personas / third-parties / system anchors (ADR-0015).
 *
 * Usage:
 *   node scripts/assemble-context-seed.mjs --catalog=scripts/blueprint-sample-repos.json --sample-id=backstage --output=path.yaml
 *   node scripts/assemble-context-seed.mjs --declaration=path.json --output=path.yaml
 *
 * Keep assembly rules aligned with `@archlens/core` `assembleContextDeclaration`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'https://archlens.dev/schemas/v4/blueprint.schema.json';

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseEntityRef(value, parent) {
  const leaf = slugify(value);
  if (!leaf) throw new Error('entityRef is required');
  if (parent) return `${parent}/${leaf}`;
  return leaf;
}

function entityRefLeaf(entityRef) {
  const parts = String(entityRef || '')
    .split('/')
    .filter(Boolean);
  return parts[parts.length - 1] || String(entityRef || '');
}

function displayNameFromEntityRef(entityRef) {
  const leaf = entityRefLeaf(entityRef);
  return leaf
    .split('-')
    .filter(Boolean)
    .map(part => {
      if (/\d/.test(part) && part.length <= 4) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

function resolveDisplayName(name, entityRef) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (trimmed) return trimmed;
  return displayNameFromEntityRef(entityRef);
}

function displayNameSourceForDeclaration(name) {
  return typeof name === 'string' && name.trim() ? 'explicit' : 'derived';
}

function resolveRef(value, landscapeEntityRef) {
  const trimmed = String(value || '').trim();
  if (!trimmed) throw new Error('entityRef is required');
  if (trimmed.includes('/')) {
    return trimmed
      .split('/')
      .map(part => slugify(part))
      .filter(Boolean)
      .join('/');
  }
  const leaf = slugify(trimmed);
  if (leaf === landscapeEntityRef) return landscapeEntityRef;
  return parseEntityRef(trimmed, landscapeEntityRef);
}

function yamlQuote(value) {
  const text = String(value);
  if (/^[A-Za-z0-9 _./:@+-]+$/.test(text) && !/^[-?:]/.test(text)) return text;
  return JSON.stringify(text);
}

function emitYaml(declaration) {
  const landscapeEntityRef = parseEntityRef(declaration.entityRef);
  const landscapeName = resolveDisplayName(declaration.name, landscapeEntityRef);

  const nodes = [];
  const personaRefs = [];
  const systemRefs = [];
  const externalRefs = [];

  for (const system of declaration.systems ?? []) {
    const entityRef = resolveRef(system.entityRef, landscapeEntityRef);
    systemRefs.push(entityRef);
    nodes.push({
      entityRef,
      type: system.type ?? 'software-system',
      name: resolveDisplayName(system.name, entityRef),
      properties: {
        contextOwnership: 'author',
        displayNameSource: displayNameSourceForDeclaration(system.name),
      },
    });
  }

  for (const persona of declaration.personas ?? []) {
    const entityRef = parseEntityRef(persona.id, landscapeEntityRef);
    personaRefs.push(entityRef);
    nodes.push({
      entityRef,
      type: 'person',
      name: resolveDisplayName(persona.name, entityRef),
      properties: {
        role: 'product-persona',
        ...(persona.product ? { product: persona.product } : {}),
        contextOwnership: 'author',
        displayNameSource: displayNameSourceForDeclaration(persona.name),
      },
    });
  }

  for (const external of declaration.externals ?? []) {
    const entityRef = parseEntityRef(external.id, landscapeEntityRef);
    externalRefs.push(entityRef);
    nodes.push({
      entityRef,
      type: external.type ?? 'software-system',
      name: resolveDisplayName(external.name, entityRef),
      external: true,
      properties: {
        classification: 'third-party',
        ...(external.vendor ? { vendor: external.vendor } : {}),
        contextOwnership: 'author',
        displayNameSource: displayNameSourceForDeclaration(external.name),
      },
    });
  }

  let dependencies;
  if (declaration.dependencies?.length) {
    dependencies = declaration.dependencies.map(dep => ({
      from: resolveRef(dep.from, landscapeEntityRef),
      to: resolveRef(dep.to, landscapeEntityRef),
      type: dep.type ?? 'direct-call',
      ...(dep.description ? { description: dep.description } : {}),
    }));
  } else {
    dependencies = [];
    const primarySystem = systemRefs[0];
    if (primarySystem) {
      for (const personaRef of personaRefs) {
        const persona = (declaration.personas ?? []).find(
          p => parseEntityRef(p.id, landscapeEntityRef) === personaRef
        );
        dependencies.push({
          from: personaRef,
          to: primarySystem,
          type: 'direct-call',
          ...(persona?.description ? { description: persona.description } : {}),
        });
      }
      for (let i = 0; i < externalRefs.length; i++) {
        const externalRef = externalRefs[i];
        const external = declaration.externals?.[i];
        dependencies.push({
          from: primarySystem,
          to: externalRef,
          type: 'direct-call',
          ...(external?.description ? { description: external.description } : {}),
        });
      }
    }
  }

  const lines = [
    '# yaml-language-server: $schema=https://archlens.dev/schemas/latest/blueprint.schema.json',
    `version: ${SCHEMA_VERSION}`,
    'level: context',
    'metadata:',
    `  entityRef: ${yamlQuote(landscapeEntityRef)}`,
    `  name: ${yamlQuote(landscapeName)}`,
  ];

  if (declaration.description?.trim()) {
    const desc = declaration.description.trim();
    if (desc.includes('\n')) {
      lines.push('  description: >');
      for (const part of desc.split(/\n+/)) {
        lines.push(`    ${part.trim()}`);
      }
    } else {
      lines.push(`  description: ${yamlQuote(desc)}`);
    }
  }

  lines.push('nodes:');
  for (const node of nodes) {
    lines.push(`  - entityRef: ${yamlQuote(node.entityRef)}`);
    lines.push(`    type: ${node.type}`);
    lines.push(`    name: ${yamlQuote(node.name)}`);
    if (node.external) lines.push('    external: true');
    if (node.properties && Object.keys(node.properties).length > 0) {
      lines.push('    properties:');
      for (const [key, value] of Object.entries(node.properties)) {
        lines.push(`      ${key}: ${yamlQuote(value)}`);
      }
    }
  }

  lines.push('dependencies:');
  if (dependencies.length === 0) {
    lines.push('  []');
  } else {
    for (const dep of dependencies) {
      lines.push(`  - from: ${yamlQuote(dep.from)}`);
      lines.push(`    to: ${yamlQuote(dep.to)}`);
      lines.push(`    type: ${dep.type}`);
      if (dep.description) lines.push(`    description: ${yamlQuote(dep.description)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const args = {
    declaration: null,
    catalog: null,
    sampleId: null,
    output: null,
  };
  for (const arg of argv) {
    if (arg.startsWith('--declaration=')) args.declaration = arg.slice('--declaration='.length);
    else if (arg.startsWith('--catalog=')) args.catalog = arg.slice('--catalog='.length);
    else if (arg.startsWith('--sample-id=')) args.sampleId = arg.slice('--sample-id='.length);
    else if (arg.startsWith('--output=')) args.output = arg.slice('--output='.length);
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function loadDeclaration(args, repoRoot) {
  if (args.declaration) {
    const filePath = path.resolve(repoRoot, args.declaration);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  if (args.catalog && args.sampleId) {
    const catalogPath = path.resolve(repoRoot, args.catalog);
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    if (!Array.isArray(catalog)) throw new Error('Sample catalog must be a JSON array');
    const sample = catalog.find(entry => entry && entry.id === args.sampleId);
    if (!sample) throw new Error(`Sample id not found in catalog: ${args.sampleId}`);
    if (!sample.contextDeclaration) {
      throw new Error(`Sample ${args.sampleId} has no contextDeclaration`);
    }
    const declaration = { ...sample.contextDeclaration };
    if (!declaration.entityRef) {
      declaration.entityRef = sample.context || sample.id;
    }
    return declaration;
  }
  throw new Error('Provide --declaration=... or --catalog=... --sample-id=...');
}

function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, '..');
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  node scripts/assemble-context-seed.mjs --catalog=scripts/blueprint-sample-repos.json --sample-id=backstage --output=blueprints/backstage/backstage/context.yaml
  node scripts/assemble-context-seed.mjs --declaration=path.json --output=path.yaml`);
    process.exit(0);
  }
  if (!args.output) throw new Error('--output=... is required');

  const declaration = loadDeclaration(args, repoRoot);
  const yaml = emitYaml(declaration);
  const outputPath = path.resolve(repoRoot, args.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, yaml, 'utf8');
  console.log(`✓ wrote context seed ${outputPath}`);
}

try {
  main();
} catch (err) {
  console.error(`assemble-context-seed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
