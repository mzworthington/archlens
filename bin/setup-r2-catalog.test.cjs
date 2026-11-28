'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');

describe('setup-r2-catalog', () => {
  it('mints catalog publish credentials in this repo after shared hosting bootstrap', () => {
    const shim = fs.readFileSync(path.join(root, 'bin/setup-cloudflare-hosting.sh'), 'utf8');
    const catalog = fs.readFileSync(path.join(root, 'bin/setup-r2-catalog.sh'), 'utf8');
    assert.equal(shim.includes('CATALOG_BUCKET_NAME'), false);
    assert.equal(shim.includes('setup-r2-catalog.sh'), true);
    assert.equal(catalog.includes('R2_BLUEPRINT_CATALOG_BUCKET'), true);
    assert.equal(catalog.includes('archlens-blueprint-catalog'), true);
    assert.equal(catalog.includes('com.cloudflare.edge.r2.bucket.'), true);
  });
});
