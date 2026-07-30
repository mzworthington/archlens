import { describe, expect, it, vi } from 'vitest';
import type { RankedOffender } from './rankOffenders';
import { openSimulateFailureOnCanvas } from './openSimulateFailureOnCanvas';

const offender: RankedOffender = {
  entityRef: 'app/designer/db',
  name: 'DB Layer',
  type: 'component',
  parentLabel: 'Designer',
  schemaPath: 'designer-components.yaml',
  schemaLevel: 'component',
  diagramEntityRef: 'app/designer',
  hotspotScore: 0.85,
  refactorScore: 80,
  classifications: ['hotspot'],
  concern: { level: 'danger', reasons: [] },
  dependencyCount: 1,
};

describe('openSimulateFailureOnCanvas', () => {
  it('navigates to the diagram and starts a ChaosLens simulation at the offender', async () => {
    const selectSystem = vi.fn(async () => {});
    const setLocation = vi.fn();
    const simulateResilienceFaultAtNode = vi.fn();

    await openSimulateFailureOnCanvas(offender, {
      selectSystem,
      setLocation,
      simulateResilienceFaultAtNode,
    });

    expect(setLocation).toHaveBeenCalledWith('/workspace/app/designer');
    expect(selectSystem).toHaveBeenCalledWith('designer-components.yaml');
    expect(simulateResilienceFaultAtNode).toHaveBeenCalledWith('app/designer/db');
  });
});
