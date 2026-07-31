import { describe, expect, it } from 'vitest';
import {
  guessBundledPathForEntityRef,
  resolveBundledPathsForEntityRef,
} from '../store/states/diagramState/bundledBlueprintLoader';
import { resolveDiagramPathsForEntityScope } from './resolveTraceLensScopeDiagrams';

describe('resolveBundledPathsForEntityRef', () => {
  it('includes the component diagram and parent containers diagram for eshop-apphost', () => {
    const paths = resolveBundledPathsForEntityRef('eshop/eshop-apphost');

    expect(paths).toContain('eshop/eshop-apphost-components.yaml');
    expect(paths).toContain('eshop/containers.yaml');
    expect(guessBundledPathForEntityRef('eshop/eshop-apphost')).toBe(
      'eshop/eshop-apphost-components.yaml'
    );
  });
});

describe('resolveDiagramPathsForEntityScope', () => {
  it('falls back to bundled path resolution when catalog stubs lack node refs', () => {
    const paths = resolveDiagramPathsForEntityScope(
      'eshop/eshop-apphost',
      [
        {
          path: 'eshop/containers.yaml',
          name: 'EShop Containers',
          level: 'container',
          entityRef: 'eshop',
          nodeEntityRefs: [],
        },
        {
          path: 'eshop/eshop-apphost-components.yaml',
          name: 'EShop.AppHost Service Components',
          level: 'component',
          entityRef: 'eshop/eshop-apphost',
          nodeEntityRefs: [],
        },
      ],
      false
    );

    expect(paths).toEqual(
      expect.arrayContaining(['eshop/containers.yaml', 'eshop/eshop-apphost-components.yaml'])
    );
  });

  it('resolves short entity refs against the workspace hub prefix in bundled mode', () => {
    const paths = resolveDiagramPathsForEntityScope(
      'eshop/eshop-apphost',
      [
        {
          path: 'context.yaml',
          name: 'Blueprint',
          level: 'context',
          entityRef: 'blueprint',
          nodeEntityRefs: [],
        },
        {
          path: 'eshop/eshop-apphost-components.yaml',
          name: 'EShop.AppHost Service Components',
          level: 'component',
          entityRef: 'eshop/eshop-apphost',
          nodeEntityRefs: [],
        },
      ],
      false
    );

    expect(paths).toContain('eshop/eshop-apphost-components.yaml');
  });
});
