import { describe, expect, it } from 'vitest';
import { collabHealthResponse, isCollabHealthPath } from './health';

describe('collab health', () => {
  it('only matches GET /health', () => {
    expect(isCollabHealthPath('/health')).toBe(true);
    expect(isCollabHealthPath('/health/')).toBe(true);
    expect(isCollabHealthPath('/')).toBe(false);
    expect(isCollabHealthPath('/room/abcdefgh')).toBe(false);
  });

  it('returns ok and the deployed sha without caching', async () => {
    const response = collabHealthResponse('0123456789abcdef0123456789abcdef01234567');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      sha: '0123456789abcdef0123456789abcdef01234567',
    });
  });

  it('uses local when the deploy sha is missing', async () => {
    await expect(collabHealthResponse(undefined).json()).resolves.toEqual({
      ok: true,
      sha: 'local',
    });
  });
});
