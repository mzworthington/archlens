import { describe, it, expect } from 'vitest';
import {
  resolveFolderRolledComponent,
  resolveTrailingFolderComponent,
} from './folderComponentRollup.ts';

describe('folderComponentRollup', () => {
  const tsStrip = /\.(ts|tsx)$/i;
  const layoutRoots = new Set(['src']);

  it('rolls up monorepo paths to folder depth', () => {
    expect(
      resolveFolderRolledComponent(
        'app/packages/designer/src/application/forensics/foo.ts',
        'foo',
        { layoutRoots, stripExtension: tsStrip, leafWhenSingleSegmentInSimpleRepo: true }
      )
    ).toEqual({
      componentId: 'application/forensics',
      componentName: 'Forensics',
    });
  });

  it('keeps simple-repo leaf files under one src folder', () => {
    expect(
      resolveFolderRolledComponent('src/domain/graph.ts', 'graph', {
        layoutRoots,
        stripExtension: tsStrip,
        leafWhenSingleSegmentInSimpleRepo: true,
      })
    ).toEqual({
      componentId: 'graph',
      componentName: 'Graph',
    });
  });

  it('rolls up python packages by immediate parent folder', () => {
    expect(
      resolveTrailingFolderComponent('src/gateway/handlers.py', 'handlers', {
        layoutRoots: new Set(['src']),
        stripExtension: /\.py$/i,
      })
    ).toEqual({
      componentId: 'gateway',
      componentName: 'Gateway',
    });
  });
});
