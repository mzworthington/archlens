import type { RefactorBoundary } from '@archlens/core/forensics';
import type { RankedOffender } from './rankOffenders';

export type ApplyRefactorPlanAsDraftActions = {
  selectSystem: (path: string) => Promise<void>;
  applyRefactorBoundaryAsDraft: (boundary: RefactorBoundary) => boolean;
  setLocation: (path: string) => void;
  setGuidedRefactorEntityRefs: (entityRefs: string[] | null) => void;
  setIsDiffOpen: (open: boolean) => void;
};

export type ApplyRefactorPlanAsDraftResult = { ok: true } | { ok: false; reason: string };

/**
 * Load the offender diagram, materialize the refactor boundary on canvas and open Pending Changes.
 */
export async function applyRefactorPlanAsDraft(
  boundary: RefactorBoundary,
  offender: RankedOffender,
  actions: ApplyRefactorPlanAsDraftActions
): Promise<ApplyRefactorPlanAsDraftResult> {
  if (boundary.members.length < 2) {
    return {
      ok: false,
      reason:
        'This offender has no coupled peer files in its boundary. Apply as draft needs at least two related components on the same diagram.',
    };
  }

  await actions.selectSystem(offender.schemaPath);

  const applied = actions.applyRefactorBoundaryAsDraft(boundary);
  if (!applied) {
    return {
      ok: false,
      reason:
        'Could not place the draft group on the diagram. Ensure the offender diagram loaded correctly and both boundary members are present on the canvas.',
    };
  }

  actions.setGuidedRefactorEntityRefs(boundary.memberEntityRefs);
  actions.setLocation(`/workspace/${offender.diagramEntityRef}`);
  actions.setIsDiffOpen(true);
  return { ok: true };
}
