import { describe, expect, it } from 'vitest';
import { resolveDiagramPathsForEntityScope } from './resolveTraceLensScopeDiagrams';

describe('resolveDiagramPathsForEntityScope', () => {
  it('collects home and child diagram paths from the workspace catalog', () => {
    const paths = resolveDiagramPathsForEntityScope('golden-paths/golden-journey/checkout-day', [
      {
        path: 'containers.yaml',
        name: 'Golden Journey Estate',
        level: 'container',
        entityRef: 'golden-paths/golden-journey',
        nodeEntityRefs: ['golden-paths/golden-journey/checkout-day'],
      },
      {
        path: 'checkout-platform/checkout-day-containers.yaml',
        name: 'Checkout Day',
        level: 'container',
        entityRef: 'golden-paths/golden-journey/checkout-day',
        nodeEntityRefs: [],
      },
    ]);

    expect(paths).toEqual(
      expect.arrayContaining(['containers.yaml', 'checkout-platform/checkout-day-containers.yaml'])
    );
  });
});
