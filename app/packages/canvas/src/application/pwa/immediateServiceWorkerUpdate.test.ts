import { describe, expect, it } from 'vitest';
import {
  acceptsServiceWorkerUpdateMessage,
  clientRequestedImmediateUpdate,
  isSkipWaitingMessage,
} from './immediateServiceWorkerUpdate';

describe('clientRequestedImmediateUpdate', () => {
  it('is true when a controlled page already reloaded for Refresh', () => {
    expect(
      clientRequestedImmediateUpdate([
        'https://archlens.dev/guide/collaborate?al_refresh=1700000000000',
      ])
    ).toBe(true);
  });

  it('stays false for an ordinary visit so the banner can wait', () => {
    expect(
      clientRequestedImmediateUpdate(['https://archlens.dev/guide/collaborate?room=abc'])
    ).toBe(false);
  });

  it('ignores a client url that cannot be parsed', () => {
    expect(clientRequestedImmediateUpdate(['not a url'])).toBe(false);
  });
});

describe('isSkipWaitingMessage', () => {
  it('recognises the message workbox sends when Refresh is accepted', () => {
    expect(isSkipWaitingMessage({ type: 'SKIP_WAITING' })).toBe(true);
  });

  it('rejects other messages', () => {
    expect(isSkipWaitingMessage({ type: 'OTHER' })).toBe(false);
    expect(isSkipWaitingMessage(null)).toBe(false);
    expect(isSkipWaitingMessage('SKIP_WAITING')).toBe(false);
  });
});

describe('acceptsServiceWorkerUpdateMessage', () => {
  it('accepts a skip-waiting message from this origin', () => {
    expect(
      acceptsServiceWorkerUpdateMessage('https://archlens.dev', 'https://archlens.dev', {
        type: 'SKIP_WAITING',
      })
    ).toBe(true);
  });

  it('rejects a skip-waiting message from another origin', () => {
    expect(
      acceptsServiceWorkerUpdateMessage('https://evil.example', 'https://archlens.dev', {
        type: 'SKIP_WAITING',
      })
    ).toBe(false);
  });
});
