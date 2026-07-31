import { describe, expect, it } from 'vitest';
import { buildWorkspaceEntityHref } from './sandboxWorkspace';

describe('sandboxWorkspace', () => {
  it('builds entity-ref workspace paths', () => {
    expect(buildWorkspaceEntityHref('application')).toBe('/workspace/application');
    expect(buildWorkspaceEntityHref('golden-paths/golden-journey')).toBe(
      '/workspace/golden-paths/golden-journey'
    );
  });
});
