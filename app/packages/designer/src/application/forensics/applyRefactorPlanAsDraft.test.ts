import { describe, expect, it, vi } from 'vitest';
import type { RefactorBoundary } from '@archlens/core/forensics';
import { applyRefactorPlanAsDraft } from './applyRefactorPlanAsDraft';
import type { RankedOffender } from './rankOffenders';

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
  rationale: [],
  spansContainers: false,
};

const offender = {
  entityRef: 'svc/a',
  schemaPath: 'svc-components.yaml',
  diagramEntityRef: 'blueprint/svc',
} as RankedOffender;

describe('applyRefactorPlanAsDraft', () => {
  it('loads the diagram and navigates to workspace on success', async () => {
    const selectSystem = vi.fn().mockResolvedValue(undefined);
    const applyRefactorBoundaryAsDraft = vi.fn().mockReturnValue(true);
    const setLocation = vi.fn();
    const setGuidedRefactorEntityRefs = vi.fn();
    const setIsDiffOpen = vi.fn();

    const result = await applyRefactorPlanAsDraft(boundary, offender, {
      selectSystem,
      applyRefactorBoundaryAsDraft,
      setLocation,
      setGuidedRefactorEntityRefs,
      setIsDiffOpen,
    });

    expect(result).toEqual({ ok: true });
    expect(selectSystem).toHaveBeenCalledWith('svc-components.yaml');
    expect(setLocation).toHaveBeenCalledWith('/workspace/blueprint/svc');
    expect(setIsDiffOpen).toHaveBeenCalledWith(true);
  });

  it('rejects single-member boundaries', async () => {
    const singleMember: RefactorBoundary = {
      ...boundary,
      members: [boundary.members[0]!],
      memberEntityRefs: ['svc/a'],
    };

    const result = await applyRefactorPlanAsDraft(singleMember, offender, {
      selectSystem: vi.fn(),
      applyRefactorBoundaryAsDraft: vi.fn(),
      setLocation: vi.fn(),
      setGuidedRefactorEntityRefs: vi.fn(),
      setIsDiffOpen: vi.fn(),
    });

    expect(result.ok).toBe(false);
  });
});
