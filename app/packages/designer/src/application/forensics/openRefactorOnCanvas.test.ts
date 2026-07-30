import { describe, expect, it, vi } from 'vitest';
import type { RefactorBoundary } from '@archlens/core/forensics';
import type { RankedOffender } from './rankOffenders';
import { openRefactorOnCanvas } from './openRefactorOnCanvas';

describe('openRefactorOnCanvas', () => {
  it('navigates to the offender with coupling and guided boundary highlights', () => {
    const boundary: RefactorBoundary = {
      id: 'boundary-a',
      seedEntityRef: 'app/a',
      seedName: 'A',
      members: [],
      memberEntityRefs: ['app/a', 'app/b'],
      memberFilepaths: ['src/a.ts', 'src/b.ts'],
      aggregateRefactorScore: 50,
      signals: ['high-coupling'],
      rationale: ['Coupled peers'],
      spansContainers: false,
    };
    const offender = {
      entityRef: 'app/a',
      schemaPath: 'components.yaml',
      diagramEntityRef: 'app/designer',
    } as RankedOffender;

    const actions = {
      selectSystem: vi.fn(),
      selectNode: vi.fn(),
      setShowCoupling: vi.fn(),
      setGuidedRefactorEntityRefs: vi.fn(),
      setLocation: vi.fn(),
    };

    openRefactorOnCanvas(boundary, offender, actions);

    expect(actions.selectSystem).toHaveBeenCalledWith('components.yaml');
    expect(actions.selectNode).toHaveBeenCalledWith('app/a');
    expect(actions.setShowCoupling).toHaveBeenCalledWith(true);
    expect(actions.setGuidedRefactorEntityRefs).toHaveBeenCalledWith(['app/a', 'app/b']);
    expect(actions.setLocation).toHaveBeenCalledWith('/workspace/app/designer');
  });
});
