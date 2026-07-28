import { describe, expect, it } from 'vitest';
import {
  applyResilienceToNode,
  applySafeguardToggle,
  formatNodeResilience,
  mergeNodeSafeguards,
  resolveNodeResilience,
} from './nodeResilience';

describe('nodeResilience', () => {
  it('reads flat top-level node.resilience safeguards', () => {
    expect(
      resolveNodeResilience({
        resilience: { circuitBreaker: true, retry: true },
      })
    ).toEqual({
      circuitBreaker: true,
      retry: true,
    });
  });

  it('returns empty safeguards for missing resilience', () => {
    expect(resolveNodeResilience(undefined)).toEqual({});
    expect(resolveNodeResilience({})).toEqual({});
    expect(resolveNodeResilience({ resilience: {} })).toEqual({});
  });

  it('formats only enabled safeguards and omits empty payloads', () => {
    expect(formatNodeResilience({ circuitBreaker: true, bulkhead: false })).toEqual({
      circuitBreaker: true,
    });
    expect(formatNodeResilience({})).toBeUndefined();
  });

  it('applies safeguard toggles and merges session overrides', () => {
    expect(applySafeguardToggle({ circuitBreaker: true }, 'retry', true)).toEqual({
      circuitBreaker: true,
      retry: true,
    });
    expect(
      applySafeguardToggle({ circuitBreaker: true, retry: true }, 'circuitBreaker', false)
    ).toEqual({
      retry: true,
    });
    expect(mergeNodeSafeguards({ circuitBreaker: true }, { retry: true })).toEqual({
      circuitBreaker: true,
      retry: true,
    });
    expect(mergeNodeSafeguards({ circuitBreaker: true }, { circuitBreaker: false })).toEqual({
      circuitBreaker: false,
    });
  });

  it('writes flat top-level resilience', () => {
    expect(applyResilienceToNode({ circuitBreaker: true })).toEqual({
      resilience: { circuitBreaker: true },
    });
    expect(applyResilienceToNode({})).toEqual({
      resilience: undefined,
    });
  });
});
