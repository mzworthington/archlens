import { describe, expect, it } from 'vitest';
import type { BlueprintRFNode } from '../store/layoutUtils';
import { applySafeguardHighlights } from './safeguardHighlights';

const nodes: BlueprintRFNode[] = [
  {
    id: 'a/web',
    type: 'blueprintNode',
    position: { x: 0, y: 0 },
    data: {
      id: 'a/web',
      type: 'web-app',
      name: 'Web',
      properties: {},
      entityRef: 'a/web',
    },
  },
  {
    id: 'a/api',
    type: 'blueprintNode',
    position: { x: 200, y: 0 },
    data: {
      id: 'a/api',
      type: 'microservice',
      name: 'API',
      properties: {},
      entityRef: 'a/api',
      resilience: { circuitBreaker: true },
    },
  },
];

describe('applySafeguardHighlights', () => {
  it('marks nodes with persisted or session safeguards when resilience mode is on', () => {
    const updated = applySafeguardHighlights(nodes, {
      enabled: true,
      sessionSafeguards: { 'a/web': { bulkhead: true } },
    });

    expect(nodes[1].data.resilienceSafeguards).toBeUndefined();
    expect(updated[0].data.resilienceSafeguards).toEqual({ bulkhead: true });
    expect(updated[1].data.resilienceSafeguards).toEqual({ circuitBreaker: true });
  });

  it('clears safeguard styling when resilience mode is off', () => {
    const highlighted = applySafeguardHighlights(nodes, { enabled: true });
    const cleared = applySafeguardHighlights(highlighted, { enabled: false });
    expect(cleared[1].data.resilienceSafeguards).toBeUndefined();
  });
});
