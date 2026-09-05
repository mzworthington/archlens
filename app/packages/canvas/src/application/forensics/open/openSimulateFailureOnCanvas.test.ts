import { describe, expect, it, vi } from 'vitest';
import type { RankedOffender } from '../rankOffenders';
import { openSimulateFailureOnCanvas } from './openSimulateFailureOnCanvas';

const offender: RankedOffender = {
  entityRef: 'app/canvas/db',
  name: 'DB Layer',
  type: 'component',
  parentLabel: 'Canvas',
  schemaPath: 'canvas-components.yaml',
  schemaLevel: 'component',
  diagramEntityRef: 'app/canvas',
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

    expect(setLocation).toHaveBeenCalledWith(
      '/workspace/app/canvas?lens=chaoslens&fault=app%2Fcanvas%2Fdb&type=region-outage'
    );
    expect(selectSystem).toHaveBeenCalledWith('canvas-components.yaml');
    expect(simulateResilienceFaultAtNode).toHaveBeenCalledWith('app/canvas/db');
  });
});
