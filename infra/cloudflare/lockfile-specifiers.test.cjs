#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;

describe('infra/cloudflare lockfile', () => {
  it('pins typescript to the same specifier as package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const lock = fs.readFileSync(path.join(ROOT, 'pnpm-lock.yaml'), 'utf8');
    const match = lock.match(
      /importers:\n[\s\S]*?devDependencies:\n[\s\S]*?typescript:\n\s+specifier: (\S+)/,
    );
    assert.ok(match, 'expected typescript specifier under importers in pnpm-lock.yaml');
    assert.equal(match[1], pkg.devDependencies.typescript);
  });
});
