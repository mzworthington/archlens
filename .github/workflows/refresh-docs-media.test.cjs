#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('Refresh docs & media workflow', () => {
  it('installs vhs at the mise.toml pin so go install matches the local Go toolchain', () => {
    const workflowDir = __dirname;
    const repoRoot = path.join(workflowDir, '..', '..');
    const mise = fs.readFileSync(path.join(repoRoot, 'mise.toml'), 'utf8');
    const vhsMatch = mise.match(/^\s*vhs\s*=\s*"([^"]+)"/m);
    assert.ok(vhsMatch, 'mise.toml must pin vhs');
    const pinned = vhsMatch[1];
    const yaml = fs.readFileSync(path.join(workflowDir, 'refresh-docs-media.yml'), 'utf8');
    const escaped = pinned.replace(/\./g, '\\.');
    assert.match(
      yaml,
      new RegExp(`go install github\\.com/charmbracelet/vhs@v${escaped}(?:\\s|$)`),
      `refresh-docs-media must pin vhs@v${pinned} from mise.toml; @latest can require a newer Go than go.mod`,
    );
  });
});
