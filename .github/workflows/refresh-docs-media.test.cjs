#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function escapeRegExpLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('Refresh docs & media workflow', () => {
  it('installs vhs at the mise.toml pin so go install matches the local Go toolchain', () => {
    const workflowDir = __dirname;
    const repoRoot = path.join(workflowDir, '..', '..');
    const mise = fs.readFileSync(path.join(repoRoot, 'mise.toml'), 'utf8');
    const vhsMatch = mise.match(/^\s*vhs\s*=\s*"([^"]+)"/m);
    assert.ok(vhsMatch, 'mise.toml must pin vhs');
    const pinned = vhsMatch[1];
    const yaml = fs.readFileSync(path.join(workflowDir, 'refresh-docs-media.yml'), 'utf8');
    assert.match(yaml, /mise install vhs/, 'refresh-docs-media must install vhs from mise.toml');
    assert.match(mise, new RegExp(`^\\s*vhs\\s*=\\s*"${escapeRegExpLiteral(pinned)}"`, 'm'));
    assert.equal(pinned, '0.11.0');
  });

  it('references third-party actions by version tag rather than commit SHA', () => {
    const workflowDir = __dirname;
    const files = fs.readdirSync(workflowDir).filter(name => name.endsWith('.yml'));
    const shaPins = [];
    const shaUses = /uses:\s+(?!actions\/)(?!\.\/)(\S+)@([0-9a-f]{40})/g;
    for (const file of files) {
      const yaml = fs.readFileSync(path.join(workflowDir, file), 'utf8');
      for (const match of yaml.matchAll(shaUses)) {
        shaPins.push(`${file}: ${match[1]}@${match[2]}`);
      }
    }
    assert.deepEqual(shaPins, [], 'third-party actions must use @vN, not a commit SHA');
  });

  it('escapes backslash in the vhs pin so the workflow regex treats it as a literal', () => {
    const pin = '1.0\\2';
    const escaped = escapeRegExpLiteral(pin);
    assert.equal(escaped, '1\\.0\\\\2');
    assert.match(`vhs@v${pin}`, new RegExp(`vhs@v${escaped}$`));
  });
});
