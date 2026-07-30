import { describe, expect, it, vi } from 'vitest';
import * as applyStateUpdatesModule from '../store/states/diagramState/applyStateUpdates';
import { materializeCouplingGhostOnDiagram } from './materializeCouplingGhost';
import type { BlueprintRFNode } from '../store/layoutUtils';

describe('materializeCouplingGhostOnDiagram', () => {
  it('adds workspace entities as external dependencies', () => {
    const addExternalDependencies = vi.fn();
    const set = vi.fn();
    const get = vi.fn(() => ({
      nodes: [] as BlueprintRFNode[],
      edges: [],
      addExternalDependencies,
      markLayoutCustomized: vi.fn(),
      logger: { info: vi.fn() },
    }));

    materializeCouplingGhostOnDiagram(
      {
        entityRef: 'app/other/service',
        filepath: 'src/other/service.ts',
        position: { x: 10, y: 20 },
      },
      set,
      get
    );

    expect(addExternalDependencies).toHaveBeenCalledWith(['app/other/service']);
    expect(set).not.toHaveBeenCalled();
  });

  it('materializes unmapped filepaths as new component nodes', () => {
    const applySpy = vi
      .spyOn(applyStateUpdatesModule, 'applyStateUpdates')
      .mockImplementation(() => undefined);
    const markLayoutCustomized = vi.fn();
    const logger = { info: vi.fn() };
    const nodes: BlueprintRFNode[] = [];
    const set = vi.fn();
    const get = vi.fn(() => ({
      nodes,
      edges: [],
      addExternalDependencies: vi.fn(),
      markLayoutCustomized,
      logger,
    }));

    materializeCouplingGhostOnDiagram(
      {
        filepath: 'src/missing/peer.ts',
        position: { x: 100, y: 200 },
      },
      set,
      get
    );

    expect(markLayoutCustomized).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      'Materializing coupled filepath onto diagram',
      expect.objectContaining({ filepath: 'src/missing/peer.ts' })
    );
    expect(applySpy).toHaveBeenCalled();
    applySpy.mockRestore();
  });
});
