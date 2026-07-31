import type { RecommendationAction } from '@archlens/core/recommendations';
import type { NodeSafeguards } from '@archlens/core/resilience';
import {
  findForensicsOffenderByEntityRef,
  type LoadedSystemRef,
  type RankedOffender,
} from '../forensics/rankOffenders';

const REFACTOR_ACTION_KINDS = new Set([
  'review-refactor-plan',
  'extract-shared-logic',
  'split-by-container',
  'define-api-boundary',
  'add-second-owner',
  'coordinate-ownership',
]);

export type RecommendationActionContext = {
  loadedSystems: readonly LoadedSystemRef[];
  selectSystem: (path: string) => Promise<void>;
  setLocation: (path: string) => void;
  simulateResilienceFaultAtNode: (entityRef: string) => void;
  setResilienceSafeguard: (nodeId: string, key: keyof NodeSafeguards, enabled: boolean) => void;
  setResilienceMode: (enabled: boolean) => void;
  setResiliencePanelTab: (tab: 'simulation' | 'properties') => void;
  openRefactorPlan: (offender: RankedOffender) => void;
};

function resolveOffender(
  entityRef: string,
  systems: readonly LoadedSystemRef[]
): RankedOffender | undefined {
  return findForensicsOffenderByEntityRef([...systems], entityRef);
}

async function navigateToEntity(
  entityRef: string,
  offender: RankedOffender | undefined,
  context: RecommendationActionContext
): Promise<void> {
  const diagramEntityRef = offender?.diagramEntityRef ?? entityRef;
  const schemaPath = offender?.schemaPath;
  context.setLocation(`/workspace/${diagramEntityRef}`);
  if (schemaPath) {
    await context.selectSystem(schemaPath);
  }
}

/**
 * Execute a structured recommendation action from TraceLens or ChaosLens panels.
 */
export async function executeRecommendationAction(
  action: RecommendationAction,
  context: RecommendationActionContext
): Promise<{ ok: boolean; reason?: string }> {
  const entityRef = action.targetEntityRef;
  if (!entityRef) {
    return { ok: false, reason: 'This action has no target node.' };
  }

  const offender = resolveOffender(entityRef, context.loadedSystems);

  if (REFACTOR_ACTION_KINDS.has(action.kind)) {
    if (!offender) {
      return { ok: false, reason: 'No refactor plan is available for this target.' };
    }
    context.openRefactorPlan(offender);
    return { ok: true };
  }

  switch (action.kind) {
    case 'enable-circuit-breaker':
    case 'retain-circuit-breaker':
      await navigateToEntity(entityRef, offender, context);
      context.setResilienceMode(true);
      context.setResilienceSafeguard(entityRef, 'circuitBreaker', true);
      context.setResiliencePanelTab('properties');
      return { ok: true };

    case 'review-timeouts':
    case 'add-staleness-handling':
    case 'verify-compensating-actions':
      await navigateToEntity(entityRef, offender, context);
      context.setResilienceMode(true);
      context.simulateResilienceFaultAtNode(entityRef);
      return { ok: true };

    case 'add-safeguards':
      await navigateToEntity(entityRef, offender, context);
      context.setResilienceMode(true);
      context.setResiliencePanelTab('properties');
      return { ok: true };

    default:
      if (action.kind.startsWith('refactor-')) {
        if (!offender) {
          return { ok: false, reason: 'No refactor plan is available for this target.' };
        }
        context.openRefactorPlan(offender);
        return { ok: true };
      }
      return { ok: false, reason: `Unsupported action: ${action.kind}` };
  }
}
