import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveObjectStorageConfigFromEnv } from './resolveObjectStorageFromEnv';

describe('Feature: Resolve object storage from environment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('resolves Cloudflare R2 credentials from legacy R2_* variables', () => {
    vi.stubEnv('OBJECT_STORAGE_PROVIDER', 'r2');
    vi.stubEnv('R2_BUCKET', 'archlens-blueprint-catalog');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'access');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret');
    vi.stubEnv('R2_ACCOUNT_ID', 'acct');

    expect(resolveObjectStorageConfigFromEnv()).toEqual({
      provider: 'r2',
      bucket: 'archlens-blueprint-catalog',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      endpoint: 'https://acct.r2.cloudflarestorage.com',
      region: 'auto',
      keyPrefix: undefined,
    });
  });

  it('resolves AWS S3 credentials when provider is s3', () => {
    vi.stubEnv('OBJECT_STORAGE_PROVIDER', 's3');
    vi.stubEnv('OBJECT_STORAGE_BUCKET', 'customer-catalog');
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'access');
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'secret');
    vi.stubEnv('AWS_REGION', 'eu-west-1');

    expect(resolveObjectStorageConfigFromEnv()).toEqual({
      provider: 's3',
      bucket: 'customer-catalog',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      region: 'eu-west-1',
      endpoint: undefined,
      keyPrefix: undefined,
    });
  });

  it('resolves Azure Blob when connection string and container are set', () => {
    vi.stubEnv('OBJECT_STORAGE_PROVIDER', 'azure');
    vi.stubEnv('AZURE_STORAGE_CONTAINER', 'catalog');
    vi.stubEnv('AZURE_STORAGE_CONNECTION_STRING', 'UseDevelopmentStorage=true');

    expect(resolveObjectStorageConfigFromEnv()).toEqual({
      provider: 'azure',
      container: 'catalog',
      connectionString: 'UseDevelopmentStorage=true',
      accountUrl: undefined,
      sasToken: undefined,
      keyPrefix: undefined,
    });
  });

  it('returns null when required credentials are missing', () => {
    vi.stubEnv('OBJECT_STORAGE_PROVIDER', 'r2');
    vi.stubEnv('R2_BUCKET', 'catalog');
    expect(resolveObjectStorageConfigFromEnv()).toBeNull();
  });
});
