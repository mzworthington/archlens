import { assessSchemaVersion, systemSchemaPublicUrl } from '@archlens/core';
import { describe, expect, it } from 'vitest';
import { createDiagramInitialState } from './initialState';

describe('createDiagramInitialState', () => {
  it('boots an empty diagram on the current schema contract, not legacy semver', () => {
    const initial = createDiagramInitialState();

    expect(initial.schema.version).toBe(systemSchemaPublicUrl());
    expect(assessSchemaVersion(initial.schema.version)).toBeNull();
  });
});
