#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('TypeScript 6 Pulumi compile options', () => {
  it('does not emit TS5107 under TypeScript 6', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'tsconfig.json'), 'utf8'));
    const compilerOptions = tsconfig.compilerOptions ?? {};
    const resolution = compilerOptions.moduleResolution;
    const usesDeprecatedNode10 =
      resolution === undefined || resolution === 'node' || resolution === 'node10';
    if (!usesDeprecatedNode10) {
      assert.ok(true);
      return;
    }
    assert.equal(compilerOptions.ignoreDeprecations, '6.0');
  });
});
