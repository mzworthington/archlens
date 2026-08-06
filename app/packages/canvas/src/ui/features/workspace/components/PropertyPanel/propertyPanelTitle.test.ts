import { describe, expect, it } from 'vitest';
import { resolvePropertyPanelTitle } from './propertyPanelTitle';

describe('resolvePropertyPanelTitle', () => {
  it('labels ChaosLens while resilience mode is active', () => {
    expect(
      resolvePropertyPanelTitle({
        isResilienceMode: true,
        isEdge: false,
        isNode: true,
        nodeType: 'rest-api',
        schemaLevel: 'container',
      })
    ).toBe('ChaosLens');
  });

  it('labels Dependency when an edge is selected', () => {
    expect(
      resolvePropertyPanelTitle({
        isResilienceMode: false,
        isEdge: true,
        isNode: false,
        nodeType: undefined,
        schemaLevel: 'container',
      })
    ).toBe('Dependency');
  });

  it('labels the selected node type when known', () => {
    expect(
      resolvePropertyPanelTitle({
        isResilienceMode: false,
        isEdge: false,
        isNode: true,
        nodeType: 'rest-api',
        schemaLevel: 'container',
      })
    ).toBe('REST API');
  });

  it('falls back to Diagram for component/code canvas', () => {
    expect(
      resolvePropertyPanelTitle({
        isResilienceMode: false,
        isEdge: false,
        isNode: false,
        nodeType: undefined,
        schemaLevel: 'component',
      })
    ).toBe('Diagram');
  });

  it('falls back to Canvas for higher-level diagrams', () => {
    expect(
      resolvePropertyPanelTitle({
        isResilienceMode: false,
        isEdge: false,
        isNode: false,
        nodeType: undefined,
        schemaLevel: 'container',
      })
    ).toBe('Canvas');
  });
});
