import { describe, it, expect } from 'vitest';
import type { SystemNode } from '../models/schema';
import {
  hasFinitePosition,
  nodesNeedingLayout,
  hasCompleteSavedLayout,
  seedPreservedPositions,
} from './layoutMerge';

const node = (ref: string, x?: number, y?: number): SystemNode => ({
  entityRef: ref,
  type: 'component',
  name: ref,
  ...(x !== undefined && y !== undefined ? { position: { x, y } } : {}),
});

describe('hasFinitePosition', () => {
  it('requires finite x and y', () => {
    expect(hasFinitePosition(node('a', 10, 20))).toBe(true);
    expect(hasFinitePosition(node('a', 10))).toBe(false);
    expect(hasFinitePosition(node('a'))).toBe(false);
    expect(hasFinitePosition({ ...node('a'), position: { x: Number.NaN, y: 1 } })).toBe(false);
  });
});

describe('nodesNeedingLayout', () => {
  it('returns nodes missing a finite position', () => {
    const nodes = [node('a', 1, 2), node('b'), node('c', 3, Number.NaN)];
    expect(nodesNeedingLayout(nodes).map(n => n.entityRef)).toEqual(['b', 'c']);
  });
});

describe('hasCompleteSavedLayout', () => {
  it('is false when any node lacks coordinates', () => {
    expect(hasCompleteSavedLayout([node('a', 1, 2), node('b')])).toBe(false);
  });

  it('is true only when every node is positioned', () => {
    expect(hasCompleteSavedLayout([node('a', 1, 2), node('b', 3, 4)])).toBe(true);
    expect(hasCompleteSavedLayout([])).toBe(false);
  });
});

describe('seedPreservedPositions', () => {
  it('copies finite positions and strips coords from new nodes', () => {
    const previous = [node('a', 100, 200)];
    const next = [node('a', 0, 0), node('b', 9, 9)];
    const seeded = seedPreservedPositions(previous, next);
    expect(seeded[0]).toMatchObject({ entityRef: 'a', position: { x: 100, y: 200 } });
    expect(seeded[1]?.entityRef).toBe('b');
    expect(seeded[1]?.position).toBeUndefined();
  });
});
