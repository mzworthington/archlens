import { describe, expect, it } from 'vitest';
import { createObjectStorage } from './createObjectStorage';

describe('Feature: Object storage factory', () => {
  it('routes r2 config to the S3-compatible adapter', () => {
    const storage = createObjectStorage({
      provider: 'r2',
      bucket: 'catalog',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      endpoint: 'https://acct.r2.cloudflarestorage.com',
    });
    expect(storage.provider).toBe('r2');
  });

  it('routes http config to the read-only HTTPS adapter', () => {
    const storage = createObjectStorage({
      provider: 'http',
      baseUrl: 'https://blueprints.example.dev/',
    });
    expect(storage.provider).toBe('http');
  });
});
