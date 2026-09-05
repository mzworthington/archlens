import { describe, it, expect, vi } from 'vitest';
import type { RefactorBoundary } from '@archlens/core/forensics';
import { applyRefactorBoundaryAsDraft } from './applyRefactorBoundaryAsDraft';
import type { BlueprintRFNode, BlueprintRFEdge } from '../../store/layoutUtils';

function rfNode(entityRef: string, x: number, y: number): BlueprintRFNode {
  return {
    id: entityRef,
    type: 'blueprintNode',
    position: { x, y },
    data: {
      id: entityRef,
      entityRef,
      name: entityRef,
      type: 'component',
      properties: {},
    },
  } as BlueprintRFNode;
}

describe('applyRefactorBoundaryAsDraft', () => {
  it('adds a draft group and parents boundary members on the active diagram', () => {
    const boundary: RefactorBoundary = {
      id: 'a|b',
      seedEntityRef: 'svc/a',
      seedName: 'Service A',
      members: [
        { entityRef: 'svc/a', name: 'A', refactorScore: 80 },
        { entityRef: 'svc/b', name: 'B', refactorScore: 70 },
      ],
      memberEntityRefs: ['svc/a', 'svc/b'],
      memberFilepaths: [],
      aggregateRefactorScore: 150,
      signals: ['high-coupling'],
      rationale: ['Coupled files'],
      spansContainers: false,
    };

    const nodes = [rfNode('svc/a', 10, 20), rfNode('svc/b', 120, 40)];
    const edges: BlueprintRFEdge[] = [];
    const set = vi.fn();
    const get = () => ({
      nodes,
      edges,
      schema: { name: 'Components' },
    });

    const applied = applyRefactorBoundaryAsDraft(boundary, get, set);
    expect(applied).toBe(true);
    expect(set).toHaveBeenCalled();
  });

  it('returns false when fewer than two members are on the canvas', () => {
    const boundary: RefactorBoundary = {
      id: 'a|b',
      seedEntityRef: 'svc/a',
      seedName: 'Service A',
      members: [
        { entityRef: 'svc/a', name: 'A', refactorScore: 80 },
        { entityRef: 'svc/b', name: 'B', refactorScore: 70 },
      ],
      memberEntityRefs: ['svc/a', 'svc/b'],
      memberFilepaths: [],
      aggregateRefactorScore: 150,
      signals: [],
      rationale: [],
      spansContainers: false,
    };

    const set = vi.fn();
    const get = () => ({
      nodes: [rfNode('svc/a', 0, 0)],
      edges: [],
      schema: { name: 'Components' },
    });

    expect(applyRefactorBoundaryAsDraft(boundary, get, set)).toBe(false);
    expect(set).not.toHaveBeenCalled();
  });
});
