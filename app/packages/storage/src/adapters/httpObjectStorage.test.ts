import { describe, expect, it, vi } from 'vitest';
import { createHttpObjectStorage } from './httpObjectStorage';

describe('Feature: Read remote catalog over HTTPS', () => {
  it('fetches objects from a public catalog base URL', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"revision":"rev1"}', { status: 200 }));
    const storage = createHttpObjectStorage({
      provider: 'http',
      baseUrl: 'https://blueprints.example.dev/',
      fetchImpl,
    });

    await expect(storage.getObjectText('latest/manifest.json')).resolves.toContain('rev1');
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(
      'https://blueprints.example.dev/latest/manifest.json'
    );
  });

  it('rejects writes because public catalog hosting is read-only', async () => {
    const storage = createHttpObjectStorage({
      provider: 'http',
      baseUrl: 'https://blueprints.example.dev/',
      fetchImpl: vi.fn(),
    });

    await expect(storage.putObject({ key: 'latest/manifest.json', body: '{}' })).rejects.toThrow(
      /read-only/i
    );
  });
});
