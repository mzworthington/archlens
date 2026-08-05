import { describe, it, expect } from 'vitest';
import { resolveRelativePath } from './store';

describe('Blueprint Store Integration Helper Actions', () => {
  it('should resolve relative path correctly', () => {
    expect(resolveRelativePath('blueprint.yaml', './web/container.yaml')).toBe(
      'web/container.yaml'
    );
    expect(resolveRelativePath('services/auth/components.yaml', '../billing/container.yaml')).toBe(
      'services/billing/container.yaml'
    );
  });
});
