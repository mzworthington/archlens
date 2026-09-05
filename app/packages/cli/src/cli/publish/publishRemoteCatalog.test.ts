import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePublishObjectStorage } from './publishRemoteCatalog.ts';

describe('Feature: Resolve publish storage adapter', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when only a read-only HTTP catalog is configured', () => {
    vi.stubEnv('OBJECT_STORAGE_PROVIDER', 'http');
    vi.stubEnv('OBJECT_STORAGE_BASE_URL', 'https://blueprints.example.dev/');
    expect(resolvePublishObjectStorage()).toBeNull();
  });

  it('applies CLI bucket overrides on top of environment config', () => {
    vi.stubEnv('OBJECT_STORAGE_PROVIDER', 'r2');
    vi.stubEnv('R2_BUCKET', 'default-bucket');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'access');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret');
    vi.stubEnv('R2_ACCOUNT_ID', 'acct');

    const storage = resolvePublishObjectStorage({ bucket: 'override-bucket' });
    expect(storage?.provider).toBe('r2');
  });
});
