#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('CodeQL Analysis workflow', () => {
  it('disables overlay incremental analysis so JS jobs do not fail on disk limits', () => {
    const yaml = fs.readFileSync(path.join(__dirname, 'codeql.yml'), 'utf8');
    assert.match(
      yaml,
      /CODEQL_OVERLAY_DATABASE_MODE:\s*none/,
      'javascript-typescript analysis must set CODEQL_OVERLAY_DATABASE_MODE to none',
    );
  });
});
