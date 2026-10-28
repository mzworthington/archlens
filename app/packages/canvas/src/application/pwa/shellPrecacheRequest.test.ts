import { describe, expect, it } from 'vitest';
import { shellPrecacheRequest } from './shellPrecacheRequest';

describe('shellPrecacheRequest', () => {
  it('requests the navigation shell as HTML so Cloudflare can inject the Web Analytics beacon', () => {
    const shell = shellPrecacheRequest(new Request('https://archlens.dev/?__WB_REVISION__=abc'));

    expect(new URL(shell.url).pathname).toBe('/');
    expect(shell.url).toContain('__WB_REVISION__=abc');
    expect(shell.headers.get('Accept')).toContain('text/html');

    const assetRequest = new Request('https://archlens.dev/assets/index-abc.js');
    expect(shellPrecacheRequest(assetRequest)).toBe(assetRequest);
  });
});
